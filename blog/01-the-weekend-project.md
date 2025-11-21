# Building Quiver: An Offline-First PWA in a Weekend

## Part 1: The Weekend Project

*This is Part 1 of a 7-part series on building Quiver, an offline-first Progressive Web App for capturing and developing ideas with AI.*

---

There's a particular kind of frustration that comes from losing a good idea. You're on the subway, inspiration strikes, you reach for your phone—and there's no signal. By the time you surface, the thought has evaporated into the ether of your subconscious, probably never to return.

This is the problem Quiver solves. It's an idea capture app that works everywhere—online, offline, on your phone, on your desktop—and uses AI to help you develop half-formed thoughts into something actionable.

But this series isn't really about Quiver. It's about a particular way of building web applications that I think more developers should know about: the offline-first PWA pattern combined with modern edge infrastructure. By the end of this series, you'll have built a production-ready application, but more importantly, you'll understand a set of techniques that apply to dozens of other projects.

## What We're Building

Quiver is deceptively simple on the surface:

- **Capture ideas** with a title and optional details
- **Tag and organize** your thoughts
- **AI brainstorming** that analyzes your ideas and suggests new directions
- **Works offline** and syncs when you're back online
- **Installs like a native app** on any device

Under the hood, we're doing something more interesting. We're building an application that:

1. Stores data in a globally-distributed SQLite database
2. Caches that data locally for offline access
3. Queues changes made offline and syncs them transparently
4. Streams AI responses in real-time
5. Passes Lighthouse audits with 90+ scores

The end result costs about $2.70 per month to run (just the AI calls), works on every platform, and could be extended into something much more ambitious.

## The Stack: Why These Choices?

Before we write any code, let's talk about why we're using these specific technologies. Every tool in this stack was chosen for a reason.

### Bun + Vite + React

**Bun** is a JavaScript runtime that's faster than Node.js for nearly everything. Package installs are near-instant, scripts execute faster, and it has native TypeScript support. For a weekend project, those minutes saved add up.

**Vite** is a build tool that leverages native ES modules during development. Where older tools like Create React App would bundle your entire application on every change, Vite only processes the files you actually modified. Hot module replacement becomes essentially instant.

**React** needs no introduction, but it's worth noting why it wins over alternatives here. For an interactive app with lots of state (form inputs, editing modes, offline status, AI streaming), React's component model keeps complexity manageable. Solid or Svelte could work, but React has better ecosystem support for PWAs.

The combination gives us a development experience where changes appear in the browser before your finger leaves the save key.

### Turso + Drizzle ORM

Here's where it gets interesting.

**Turso** is a distributed SQLite database. Let that sink in—SQLite, the embedded database that powers your phone's apps, running in the cloud with global replication. Why does this matter?

1. **SQLite is simple.** No connection pooling, no complex configuration, no ORM translation layer trying to map objects to relational tables. You write SQL-like queries and get back data.

2. **Edge replication.** Turso replicates your data to edge locations worldwide. A user in Tokyo and a user in London both get low-latency reads.

3. **The free tier is absurd.** 500 million row reads per month. For a personal app, you will never pay a cent.

**Drizzle ORM** sits on top of Turso and provides TypeScript type safety without the weight of heavier ORMs. Where Prisma generates a client library and requires a build step, Drizzle is just functions. Your IDE knows the shape of your data, catches errors at compile time, and queries look almost like SQL.

```typescript
// This is Drizzle. Notice how it reads like SQL?
const recentIdeas = await db
  .select()
  .from(ideas)
  .where(eq(ideas.archived, false))
  .orderBy(desc(ideas.createdAt));
```

### vite-plugin-pwa + Workbox

PWAs have a reputation for being complicated. Service workers, caching strategies, manifest files—it's a lot to manage manually.

**vite-plugin-pwa** abstracts all of that away. You configure your app's metadata (name, icons, colors), specify which files to cache, and the plugin generates a production-ready service worker using **Workbox** under the hood.

Workbox itself is Google's library for service worker management. It handles the gnarly edge cases: cache invalidation, offline fallbacks, update detection. We configure strategies (NetworkFirst for API calls, CacheFirst for static assets), and Workbox handles the implementation.

The result: your app installs like a native application and works offline, with maybe 50 lines of configuration.

### Claude 3.5 Haiku

For AI brainstorming, we need a model that's:

1. Fast enough for interactive use
2. Smart enough for creative work
3. Cheap enough for personal projects

**Claude 3.5 Haiku** hits all three. It's the fastest model in Anthropic's lineup, responses stream in near-instantly, and at ~$0.25 per million input tokens, heavy daily use costs a few dollars per month. The quality is surprisingly good—Haiku handles creative tasks better than you'd expect from a "small" model.

We'll also implement streaming, so users see text appearing word-by-word rather than waiting for a complete response. It's a small detail that makes the AI feel responsive rather than sluggish.

## Project Structure

When the project is complete, our directory structure will look like this:

```
quiver/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Generic UI primitives
│   │   ├── IdeaCard.tsx
│   │   ├── IdeaForm.tsx
│   │   ├── BrainstormPanel.tsx
│   │   └── ...
│   ├── hooks/           # Custom React hooks
│   │   ├── useIdeas.ts
│   │   ├── useOnlineStatus.ts
│   │   └── ...
│   ├── lib/             # Utility functions
│   │   ├── ideas.ts     # Database operations
│   │   ├── ai.ts        # Claude integration
│   │   └── offline-storage.ts
│   ├── db/              # Database schema and client
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── types/           # TypeScript definitions
│   │   └── idea.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
│   ├── icon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── offline.html
├── drizzle/             # Generated migrations
├── .env                 # Environment variables (not committed)
├── vite.config.ts
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

This structure separates concerns cleanly. Database code lives in `db/`, business logic in `lib/`, UI in `components/`, and state management in `hooks/`. When you need to modify how ideas are stored, you know exactly where to look.

## Setting Up the Project

Let's get our hands dirty. Open your terminal and run:

```bash
bun create vite quiver --template react-ts
cd quiver
bun install
```

If you don't have Bun installed, grab it from [bun.sh](https://bun.sh). On macOS and Linux, it's a one-liner:

```bash
curl -fsSL https://bun.sh/install | bash
```

Vite creates a project with demo content we don't need. Clean it up:

```bash
rm src/App.css
rm src/assets/react.svg
```

Now create our folder structure:

```bash
mkdir -p src/components/ui
mkdir -p src/pages
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/db
mkdir -p src/api
mkdir -p src/types
```

## The First Component

Replace the contents of `src/App.tsx` with a minimal shell:

```tsx
import { useState } from "react";

function App() {
  const [ideas, setIdeas] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const addIdea = () => {
    if (input.trim()) {
      setIdeas([...ideas, input.trim()]);
      setInput("");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h1>Quiver</h1>
      <p>Capture your ideas</p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addIdea()}
          placeholder="Enter an idea..."
          style={{ flex: 1, padding: "8px" }}
        />
        <button onClick={addIdea} style={{ padding: "8px 16px" }}>
          Add
        </button>
      </div>

      <ul>
        {ideas.map((idea, index) => (
          <li key={index} style={{ padding: "8px 0" }}>
            {idea}
          </li>
        ))}
      </ul>

      {ideas.length === 0 && (
        <p style={{ color: "#666" }}>No ideas yet. Add your first one!</p>
      )}
    </div>
  );
}

export default App;
```

This is deliberately simple. A controlled input, an array of strings in state, a button that appends to the array. If you've written React before, there's nothing surprising here.

Replace `src/index.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;
}

input,
button {
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background-color: #0066cc;
  color: white;
  border: none;
  cursor: pointer;
}

button:hover {
  background-color: #0052a3;
}

ul {
  list-style: none;
}
```

The `font-size: 16px` on inputs isn't arbitrary—iOS Safari zooms in on inputs with smaller font sizes, which is jarring. This prevents that behavior.

## Configure Path Aliases

One quality-of-life improvement before we continue. Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

And add to `tsconfig.json` under `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

You'll also need the Node types:

```bash
bun add -d @types/node
```

Now instead of `import { db } from "../../../db"`, we can write `import { db } from "@/db"`. It's a small thing, but it makes refactoring painless.

## Verify It Works

Start the development server:

```bash
bun run dev
```

Open `http://localhost:5173` in your browser. You should see:

- "Quiver" as the heading
- A text input and "Add" button
- An empty state message

Type something, press Enter or click Add, and your idea appears in the list. Refresh the page and—they're gone. We haven't added persistence yet.

That's exactly where we'll pick up in Part 2.

## What's Next

In the next post, we'll set up Turso and Drizzle ORM. By the end, our ideas will persist across page refreshes, stored in a globally-distributed cloud database. We'll also explore why the Turso + Drizzle combination is particularly well-suited for personal projects.

The complete series:

1. **The Weekend Project** (this post) — Introduction and project setup
2. **Database Architecture** — Turso, Drizzle, and type-safe queries
3. **The CRUD Interface** — Building the core idea management UI
4. **PWA Fundamentals** — Making the app installable
5. **Offline-First Architecture** — Working without an internet connection
6. **AI Integration** — Adding Claude-powered brainstorming
7. **Deployment & Polish** — Going to production

---

*Commit your progress:*

```bash
git init
git add .
git commit -m "Part 1: Project scaffolding complete"
```
