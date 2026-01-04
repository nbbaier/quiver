---
title: "Part 1: The Weekend Project"
seriesTitle: "Building Quiver: An Offline-First PWA in a Weekend"
slug: "01-the-weekend-project"
series: "Quiver"
---

_This is Part 1 of a 10-part series on building Quiver, an offline-first Progressive Web App for capturing and developing ideas with AI._

---

There's a particular kind of frustration that comes from losing a good idea. You're on the subway, inspiration strikes, you reach for your phone—and there's no signal. By the time you surface, the thought has evaporated into the ether of your subconscious, probably never to return.

This is the problem Quiver solves. It's an idea capture app that works everywhere—online, offline, on your phone, on your desktop—and uses AI to help you develop half-formed thoughts into something actionable.

But this series isn't really about Quiver. It's about a particular way of building web applications that I think more developers should know about: the offline-first PWA pattern combined with modern edge infrastructure. By the end of this series, you'll have built a production-ready application, but more importantly, you'll understand a set of techniques that apply to dozens of other projects.

## What We're Building

Quiver is deceptively simple on the surface:

-  **Capture ideas** with a title and optional details
-  **Tag and organize** your thoughts
-  **AI brainstorming** that analyzes your ideas and suggests new directions
-  **Works offline** and syncs when you're back online
-  **Installs like a native app** on any device

Under the hood, we're doing something more interesting. We're building an application that:

1. Stores data in a globally-distributed SQLite database
2. Caches that data locally for offline access
3. Queues changes made offline and syncs them transparently
4. Processes AI jobs in the background with automatic retries
5. Passes Lighthouse audits with 90+ scores

The end result costs pennies per month to run, works on every platform, and feels just like a native app.

## The Stack: Why These Choices?

Before we write any code, let's talk about why we're using these specific technologies. Every tool in this stack was chosen for a reason, specifically optimizing for developer velocity and performance.

### Bun + Vite + React

**Bun** is our runtime and package manager. It is dramatically faster than npm/Node.js for package installation and script execution. For a weekend project where you want to iterate quickly, these seconds saved add up.

**Vite** provides near-instant dev server startup and hot module replacement.

**React** remains the pragmatic choice for PWAs due to its massive ecosystem. While Svelte or Solid are great, the library support for PWA patterns in React is unmatched.

### Tailwind CSS v4

We're using the newly released **Tailwind CSS v4**. It's a significant rewrite that is simpler to set up (no `tailwind.config.js` needed by default) and performant. It's "CSS-native", meaning configuration happens right in your CSS file.

### Turso + Drizzle ORM

**Turso** is SQLite deployed at the edge. It gives us a real SQL database that is replicated globally, but with the simplicity of a file-based database.

**Drizzle ORM** provides type safety. It generates TypeScript types from your database schema, so if you rename a column, your code fails to compile. It's lightweight and SQL-like.

### PWA & Offline-First

We'll use **vite-plugin-pwa** and **Workbox** to handle service workers, and **IndexedDB** for local storage. This is the "secret sauce" that makes the app work without an internet connection.

### AI & Background Jobs

**Vercel AI SDK** + **Claude Haiku** for the intelligence. **Inngest** for reliability—ensuring that if the AI service hiccups, our jobs retry automatically without the user needing to do anything.

## Milestone 1: Project Scaffolding

Let's get our hands dirty. We'll set up the project structure and get Tailwind v4 working.

### 1. Initialize with Bun

If you don't have Bun installed, grab it from [bun.sh](https://bun.sh).

```bash
bun create vite quiver --template react-ts
cd quiver
bun install
```

Notice how fast `bun install` is compared to npm. It's a game changer for quick prototyping.

### 2. Verify the Dev Server

```bash
bun run dev
```

Open `http://localhost:5173`. You should see the standard Vite + React starter.

### 3. Install Tailwind CSS v4

Tailwind v4 simplifies the installation process significantly. We need the core package and the Vite plugin.

```bash
bun add tailwindcss @tailwindcss/vite
```

Now configure Vite to use the Tailwind plugin. Edit `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
   plugins: [react(), tailwindcss()],
});
```

### 4. Configure CSS

In Tailwind v4, you import the framework directly in your CSS. Replace `src/index.css` with:

```css
@import "tailwindcss";

@theme {
   /* Custom design tokens */
   --color-primary: #2563eb;
   --color-primary-hover: #1d4ed8;
   --color-danger: #dc2626;
   --color-danger-hover: #b91c1c;

   --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
}

@layer base {
   body {
      @apply bg-gray-50 text-gray-900 antialiased;
   }
}
```

This is much cleaner than the old configuration file approach. We're defining custom theme variables that Tailwind will pick up automatically.

### 5. Clean Up and Test

Let's clean up `src/App.tsx` to verify our styles are working:

```tsx
function App() {
   return (
      <div className="min-h-screen">
         <div className="mx-auto max-w-3xl px-4 py-8">
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
            </header>

            <main>
               <p className="text-center text-gray-500">
                  Your ideas will appear here.
               </p>
            </main>
         </div>
      </div>
   );
}

export default App;
```

Remove the unused files:

```bash
rm src/App.css src/assets/react.svg
```

### 6. Project Structure

Finally, let's set up the folder structure we'll need for the rest of the project:

```bash
mkdir -p src/components src/hooks src/lib src/types
```

-  `components/`: UI building blocks
-  `hooks/`: Custom React hooks (where our business logic will live)
-  `lib/`: Utilities and database clients
-  `types/`: TypeScript definitions

## Next Steps

We have a running React app with a modern styling engine. It looks nice, but it doesn't _do_ anything yet.

In the next part, we'll set up our "Backend" (which is really just a serverless database connection). We'll configure Turso and Drizzle to give us a type-safe data layer that runs at the edge.