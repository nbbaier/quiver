<!-- SPLIT_OUTPUT: 01-intro-and-setup -->

# Quiver: Offline-First Idea Capture App Implementation Guide

This guide walks you through building an offline-first idea capture PWA from scratch. Each milestone includes verifiable checkpoints so you can confirm your progress before moving on.

More importantly, this guide explains _why_ you're making each decision. Understanding the reasoning behind architectural choices will help you adapt these patterns to your own projects and make better decisions when you inevitably encounter situations this guide doesn't cover.

## What You're Building

**Quiver** is a Progressive Web App (PWA) for capturing ideas anywhere—even without an internet connection. Think of it as a personal brainstorming tool that:

-  Works offline and syncs when you're back online
-  Lives on your home screen like a native app
-  Uses AI to help expand and develop your ideas
-  Organizes thoughts with tags and full-text search

### Why These Features Matter

**Offline-first** isn't just a nice-to-have for an idea capture app—it's essential. Ideas strike at inconvenient times: on the subway, in airplane mode, in areas with spotty coverage. If your app requires connectivity, you'll lose ideas. We're building the app to work offline _by default_, treating network connectivity as an enhancement rather than a requirement.

**PWA (Progressive Web App)** gives us the best of both worlds: the reach of the web (no app store approval, instant updates, works on any device) with the experience of a native app (home screen icon, full-screen mode, offline support). For a personal productivity tool, this is the sweet spot—you get native-app feel without the overhead of maintaining separate iOS and Android codebases.

**AI brainstorming** transforms a simple note-taking app into an active thinking partner. Instead of just storing ideas, Quiver helps you develop them by suggesting directions, asking questions, and making unexpected connections.

## Tech Stack

Here's what we're using and _why_ each piece was chosen:

### Runtime: Bun

**What it is:** Bun is an all-in-one JavaScript runtime that replaces Node.js, npm, and several other tools.

**Why we're using it:** Speed. Bun installs packages 30x faster than npm—what takes 30 seconds with npm takes 1 second with Bun. For a weekend project where you're iterating quickly, this adds up. Bun also runs TypeScript directly without a separate compilation step, which simplifies our setup.

**The tradeoff:** Bun is newer than Node.js, so you might occasionally hit edge cases with package compatibility. In practice, this is rare for mainstream packages, and the speed benefits are worth it.

### Frontend: Vite + React + TypeScript

**What it is:** Vite is a build tool that provides near-instant dev server startup and hot module replacement. React is a UI library for building component-based interfaces. TypeScript adds static typing to JavaScript.

**Why we're using it:**

-  **Vite** because it's fast and has excellent PWA plugin support
-  **React** because it has the largest ecosystem and most learning resources (helpful for a junior dev)
-  **TypeScript** because catching errors at compile time saves debugging time later, and the autocomplete makes you faster

**The tradeoff:** TypeScript adds some initial setup complexity, but the safety and developer experience improvements pay for themselves quickly.

### Styling: Tailwind CSS v4

**What it is:** Tailwind is a utility-first CSS framework. Instead of writing custom CSS classes, you compose styles using small, single-purpose utility classes directly in your HTML/JSX.

**Why we're using it:**

-  No context-switching between files—styles live right next to the markup they affect
-  Consistent design system out of the box (spacing, colors, typography are all pre-defined)
-  Tailwind v4 is CSS-native with zero JavaScript configuration needed
-  Faster iteration—you rarely need to write custom CSS

**The tradeoff:** Your JSX will have longer `className` strings. Some developers find this ugly at first, but most grow to appreciate the locality and speed once they're used to it.

### Database: Turso + Drizzle ORM

**What it is:** Turso is SQLite deployed at the edge (meaning copies of your data live in data centers around the world). Drizzle is a TypeScript ORM that provides type-safe database queries.

**Why we're using it:**

-  **Turso** gives us a real database with a generous free tier (500M reads/month). SQLite is simple and reliable—no need for complex PostgreSQL setup for a personal app
-  **Drizzle** generates TypeScript types from your schema, so your queries are type-checked. If you rename a column, TypeScript will flag every place that references it

**The tradeoff:** Turso is newer than alternatives like PlanetScale or Supabase. We're using it because the free tier is more generous and SQLite is simpler to reason about.

### PWA: vite-plugin-pwa + Workbox

**What it is:** Service workers are scripts that run in the background and can intercept network requests, enabling offline functionality. Workbox is Google's library for creating service workers. vite-plugin-pwa integrates Workbox with Vite.

**Why we're using it:** Writing service workers from scratch is error-prone and tedious. vite-plugin-pwa handles the boilerplate—caching strategies, update flows, manifest generation—so we can focus on our app logic.

### AI: Vercel AI SDK + Claude Haiku

**What it is:** The Vercel AI SDK provides React hooks and server utilities for building AI features. Claude Haiku is Anthropic's fast, cheap model optimized for quick tasks.

**Why we're using it:**

-  **Vercel AI SDK** handles streaming responses, state management, and error handling. Without it, you'd write 50+ lines of code to handle streaming; with it, you write 5
-  **Claude Haiku** costs ~$0.01 per brainstorming session. At that price, you can brainstorm hundreds of times per month for under $3

**The tradeoff:** You could use the Anthropic SDK directly for more control, but the Vercel AI SDK's abstractions save significant development time.

### Deployment: Vercel

**What it is:** Vercel is a deployment platform optimized for frontend frameworks.

**Why we're using it:** One command deploys your app. Environment variables, HTTPS, CDN, and serverless functions all work out of the box. The free tier is generous for personal projects.

## Time Estimate

-  **Saturday:** 6-8 hours (core app, database, PWA)
-  **Sunday:** 4-6 hours (AI, search, deployment, polish)
-  **Total:** 10-14 hours

This is achievable in a weekend if you follow the guide. Budget extra time if you want to deeply understand each concept rather than just implementing it.

## Cost

-  **Turso:** $0 (free tier: 500M reads, 10M writes/month)
-  **Vercel:** $0 (free tier: 100GB bandwidth/month)
-  **Anthropic:** ~$2-3/month (assuming daily use)
-  **Total:** Under $3/month

---

## Prerequisites

Before starting, ensure you have these installed:

### 1. Install Bun

Bun is our JavaScript runtime. Install it with:

```bash
# macOS or Linux
curl -fsSL https://bun.sh/install | bash

# Or with Homebrew on macOS
brew install bun
```

**Why Bun over Node.js?** Bun is dramatically faster for package installation (the thing you'll do dozens of times during development). It's also an all-in-one tool—runtime, package manager, bundler, and test runner—which means fewer moving parts.

### 2. Verify Your Setup

```bash
bun --version  # Should show 1.x (1.0 or higher)
git --version  # Any recent version
```

### 3. Accounts You'll Need

-  **GitHub account** — For Turso authentication and Vercel deployment
-  **Anthropic API key** — Get one at https://console.anthropic.com (you'll need to add a payment method, but we'll use the cheap model)

---

## Milestone 1: Project Scaffolding with Tailwind v4

**Goal:** Create a working Vite + React project with Tailwind CSS v4 that runs in development mode.

**Why start here?** Before writing any app logic, we need a foundation. This milestone gets the basic tooling working so we can iterate quickly. We're setting up Tailwind v4 now because retrofitting styles later is tedious—better to have the design system in place from day one.

### Step 1.1: Create the Project

```bash
bun create vite quiver --template react-ts
cd quiver
bun install
```

**What just happened?**

-  `bun create vite` runs Vite's project scaffolder
-  `--template react-ts` tells it we want React with TypeScript
-  `bun install` installs the dependencies listed in `package.json`

Notice how fast `bun install` was? With npm, this takes 15-30 seconds. With Bun, it's nearly instant.

### Step 1.2: Verify the Development Server

```bash
bun run dev
```

**Checkpoint:** Open http://localhost:5173 in your browser. You should see the Vite + React starter page with a counter button. Click the button—it should increment. This confirms:

-  Vite's dev server is working
-  React is rendering
-  Hot Module Replacement (HMR) is active (try editing `src/App.tsx` and watch the page update without a full reload)

### Step 1.3: Install Tailwind CSS v4

Tailwind v4 is a significant rewrite that's simpler to set up than v3. No more `tailwind.config.js`—configuration happens in CSS.

```bash
bun add tailwindcss @tailwindcss/vite
```

**Why these packages?**

-  `tailwindcss` is the core framework
-  `@tailwindcss/vite` is the official Vite plugin that makes Tailwind work with Vite's build system

### Step 1.4: Configure Vite for Tailwind

Replace the contents of `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
   plugins: [react(), tailwindcss()],
});
```

**What's happening here?** Vite uses a plugin system. Each plugin can hook into the build process. The Tailwind plugin processes your CSS and generates the utility classes you use.

### Step 1.5: Set Up Tailwind CSS

Replace the contents of `src/index.css`:

```css
@import "tailwindcss";

@theme {
   /* Custom color palette - these extend Tailwind's defaults */
   --color-primary: #2563eb;
   --color-primary-hover: #1d4ed8;
   --color-danger: #dc2626;
   --color-danger-hover: #b91c1c;

   /* Custom font */
   --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
}

/* Base styles applied to all elements */
@layer base {
   body {
      @apply bg-gray-50 text-gray-900 antialiased;
   }
}
```

**Understanding Tailwind v4's structure:**

-  `@import "tailwindcss"` — This single import brings in all of Tailwind's utility classes. In v3, you needed three separate directives.

-  `@theme { }` — This is where you customize Tailwind's design tokens (colors, fonts, spacing, etc.). These become CSS custom properties that Tailwind's utilities reference. For example, defining `--color-primary` means you can use `bg-primary` and `text-primary` in your markup.

-  `@layer base { }` — Tailwind organizes styles into layers: `base` (element defaults), `components` (reusable patterns), and `utilities` (single-purpose classes). The `@layer` directive ensures your styles are inserted at the right point in the cascade.

-  `@apply` — This directive lets you use Tailwind utilities inside regular CSS. It's useful for base styles that should apply everywhere.

### Step 1.6: Clean Up Starter Code

The Vite starter includes demo code we don't need. Let's replace it with a minimal starting point.

Replace `src/App.tsx`:

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

**Reading Tailwind classes:** If you're new to Tailwind, here's how to read these classes:

-  `min-h-screen` — Minimum height of 100vh (full viewport height)
-  `mx-auto` — Horizontal margin auto (centers the element)
-  `max-w-3xl` — Maximum width of 48rem (768px)
-  `px-4` — Padding left and right of 1rem (16px)
-  `py-8` — Padding top and bottom of 2rem (32px)
-  `mb-8` — Margin bottom of 2rem
-  `text-center` — Center-aligned text
-  `text-4xl` — Font size of 2.25rem (36px)
-  `font-bold` — Font weight 700
-  `text-gray-900` — Near-black text color
-  `mt-2` — Margin top of 0.5rem (8px)
-  `text-gray-600` — Medium gray text

The pattern is: `{property}-{value}`. Once you learn the abbreviations (`m` for margin, `p` for padding, `text` for typography, `bg` for background), you can read and write Tailwind fluently.

Delete these files we won't use:

```bash
rm src/App.css
rm src/assets/react.svg
```

### Step 1.7: Set Up Project Structure

Create the directory structure we'll use throughout the project:

```bash
mkdir -p src/components src/hooks src/lib src/types
```

**Why this structure?**

-  `src/components/` — React components (UI building blocks)
-  `src/hooks/` — Custom React hooks (reusable stateful logic)
-  `src/lib/` — Non-React utilities (database client, API functions)
-  `src/types/` — TypeScript type definitions

This is a common React project structure. Components are isolated UI pieces, hooks extract reusable logic, and lib contains everything else.

### Step 1.8: Verify Tailwind is Working

```bash
bun run dev
```

**Checkpoint:** Open http://localhost:5173. You should see:

-  "Quiver" as a large, bold heading
-  "Capture ideas anywhere." in gray below it
-  "Your ideas will appear here." centered in lighter gray
-  A light gray background (`bg-gray-50`)

If the text is unstyled (default browser serif font, no colors), Tailwind isn't loading. Double-check that:

1. `@import "tailwindcss"` is in `src/index.css`
2. The Tailwind Vite plugin is in `vite.config.ts`
3. You've restarted the dev server after making config changes

### Step 1.9: Test Hot Reloading

While the dev server is running, try changing `text-4xl` to `text-6xl` in App.tsx. The heading should immediately grow larger without a page refresh.

This is **Hot Module Replacement (HMR)**—Vite replaces the changed module while preserving application state. For UI development, this dramatically speeds up iteration.

**Milestone 1 Complete!** You now have a working development environment with:

-  Bun as the package manager and runtime
-  Vite as the dev server and build tool
-  React + TypeScript for the UI
-  Tailwind v4 for styling

---

<!-- SPLIT_OUTPUT: 02-database-setup -->

## Milestone 2: Database Setup with Turso + Drizzle

**Goal:** Set up a cloud SQLite database and connect to it with type-safe queries.

**Why this matters:** Every app needs to persist data somewhere. We're using Turso (SQLite at the edge) because:

1. **SQLite is simple** — One database file, no complex setup, queries are just SQL
2. **Turso distributes it** — Your data is replicated to edge locations worldwide for fast reads
3. **The free tier is generous** — 500M row reads per month covers years of personal use
4. **Drizzle adds type safety** — Your TypeScript compiler will catch database errors before runtime

### Step 2.1: Install Turso CLI

Turso provides a command-line tool for managing databases:

```bash
# macOS with Homebrew
brew install tursodatabase/tap/turso

# Linux or macOS without Homebrew
curl -sSfL https://get.tur.so/install.sh | bash
```

### Step 2.2: Create a Turso Account and Database

```bash
# Sign up (opens browser for GitHub auth)
turso auth signup

# Or if you already have an account
turso auth login

# Create the database
turso db create quiver
```

**What just happened?** Turso created a SQLite database and deployed it to their edge network. Your data will be replicated across multiple regions automatically.

### Step 2.3: Get Your Database Credentials

```bash
# Get your database URL
turso db show quiver --url

# Create an auth token
turso db tokens create quiver
```

**Save both values!** You'll need:

-  The URL (looks like `libsql://quiver-yourusername.turso.io`)
-  The auth token (a long string starting with `eyJ...`)

**Checkpoint:** Both commands should output values without errors. If you see authentication errors, run `turso auth login` again.

### Step 2.4: Install Drizzle ORM

```bash
bun add drizzle-orm @libsql/client
bun add -D drizzle-kit
```

**What are these packages?**

-  `drizzle-orm` — The ORM itself. Provides type-safe query building
-  `@libsql/client` — The database driver for Turso (libSQL is the protocol Turso uses)
-  `drizzle-kit` — CLI tools for migrations (schema changes). The `-D` flag installs it as a dev dependency since we only need it during development

### Step 2.5: Set Up Environment Variables

Create `.env.local` in your project root:

```env
VITE_TURSO_DATABASE_URL=libsql://quiver-yourusername.turso.io
VITE_TURSO_AUTH_TOKEN=your-token-here
```

**Why the `VITE_` prefix?** Vite only exposes environment variables that start with `VITE_` to your client-side code. This is a security feature—it prevents accidentally exposing server-only secrets to the browser.

**Security note:** Add `.env.local` to `.gitignore` so you don't commit your credentials:

```bash
echo ".env.local" >> .gitignore
```

### Step 2.6: Define Your Database Schema

Create `src/lib/schema.ts`:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * The ideas table stores all captured ideas.
 *
 * Design decisions:
 * - `id` uses autoincrement for simplicity. UUIDs would be better for
 *   distributed systems, but autoincrement is fine for a single-user app.
 * - `urls` and `tags` are stored as JSON arrays rather than separate tables.
 *   This denormalizes the data but simplifies queries significantly.
 *   For a personal app with hundreds (not millions) of ideas, this is fine.
 * - Timestamps use integer mode (Unix timestamps) because SQLite doesn't
 *   have a native datetime type. Drizzle handles the conversion.
 */
export const ideas = sqliteTable("ideas", {
   // Primary key with auto-increment
   id: integer("id").primaryKey({ autoIncrement: true }),

   // Core content
   title: text("title").notNull(),
   content: text("content").notNull(),

   // Metadata stored as JSON - simpler than separate tables
   urls: text("urls", { mode: "json" }).$type<string[]>().default([]),
   tags: text("tags", { mode: "json" }).$type<string[]>().default([]),

   // Timestamps - stored as Unix timestamps, converted to Date objects
   createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
   updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),

   // Soft delete flag - archived ideas aren't shown by default
   archived: integer("archived", { mode: "boolean" }).default(false),
});

// TypeScript types inferred from the schema
// These ensure type safety throughout your app
export type Idea = typeof ideas.$inferSelect; // What you get when reading
export type NewIdea = typeof ideas.$inferInsert; // What you provide when creating
```

**Understanding the schema:**

Drizzle schemas are TypeScript code that describes your database structure. The magic is in the type inference—`ideas.$inferSelect` gives you a TypeScript type matching exactly what the database returns.

**Why JSON for tags/URLs?** In a traditional relational design, you'd have separate `tags` and `idea_tags` tables. That's more flexible but adds complexity:

-  Extra tables to manage
-  JOIN queries for every read
-  More complex sync logic for offline mode

For a personal app, storing tags as `["work", "project"]` JSON in a text column is simpler and fast enough. This is a pragmatic tradeoff—don't over-engineer for scale you don't need.

### Step 2.7: Create the Database Client

Create `src/lib/db.ts`:

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

/**
 * Create the libSQL client that connects to Turso.
 *
 * The client handles:
 * - Connection pooling
 * - Automatic reconnection
 * - Request authentication
 */
const client = createClient({
   url: import.meta.env.VITE_TURSO_DATABASE_URL,
   authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
});

/**
 * The Drizzle database instance.
 *
 * By passing the schema, Drizzle can:
 * - Provide autocomplete for table names
 * - Type-check your queries
 * - Infer return types automatically
 */
export const db = drizzle(client, { schema });
```

**What's `import.meta.env`?** This is Vite's way of accessing environment variables. At build time, Vite replaces `import.meta.env.VITE_*` with the actual values.

### Step 2.8: Configure Drizzle Kit

Create `drizzle.config.ts` in the project root:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
   // Where your schema is defined
   schema: "./src/lib/schema.ts",

   // Where to output migration files
   out: "./drizzle",

   // Database type
   dialect: "turso",

   // Connection details (read from environment)
   dbCredentials: {
      url: process.env.VITE_TURSO_DATABASE_URL!,
      authToken: process.env.VITE_TURSO_AUTH_TOKEN,
   },
});
```

**What's Drizzle Kit for?** Drizzle Kit compares your schema code to the actual database and generates SQL migrations to sync them. When you add a column to your schema, `drizzle-kit generate` creates the `ALTER TABLE` SQL.

### Step 2.9: Generate and Run Migrations

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

**What do these commands do?**

-  `generate` — Reads your schema, compares to previous migrations, creates new SQL files in `./drizzle`
-  `migrate` — Runs any pending migrations against your actual database

**Checkpoint:** You should see output indicating the migration was created and applied. Verify by querying the database:

```bash
turso db shell quiver "SELECT name FROM sqlite_master WHERE type='table';"
```

You should see `ideas` in the output. Your table exists!

### Step 2.10: Create Data Access Functions

Create `src/lib/ideas.ts`:

```typescript
import { db } from "./db";
import { ideas, type Idea, type NewIdea } from "./schema";
import { eq, desc } from "drizzle-orm";

/**
 * Data access layer for ideas.
 *
 * Why a separate file? Centralizing database operations:
 * - Makes it easy to add caching later
 * - Keeps components focused on UI logic
 * - Provides a single place to update if the schema changes
 */

/**
 * Fetch all ideas, newest first.
 */
export async function getAllIdeas(): Promise<Idea[]> {
   return db.select().from(ideas).orderBy(desc(ideas.createdAt));
}

/**
 * Fetch a single idea by ID.
 * Returns undefined if not found.
 */
export async function getIdea(id: number): Promise<Idea | undefined> {
   const results = await db.select().from(ideas).where(eq(ideas.id, id));
   return results[0];
}

/**
 * Create a new idea.
 * Returns the created idea with its generated ID.
 */
export async function createIdea(data: NewIdea): Promise<Idea> {
   const [created] = await db.insert(ideas).values(data).returning(); // Returns the inserted row
   return created;
}

/**
 * Update an existing idea.
 * Automatically updates the updatedAt timestamp.
 */
export async function updateIdea(
   id: number,
   data: Partial<NewIdea>
): Promise<Idea | undefined> {
   const [updated] = await db
      .update(ideas)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ideas.id, id))
      .returning();
   return updated;
}

/**
 * Permanently delete an idea.
 * Consider using archiveIdea for soft delete instead.
 */
export async function deleteIdea(id: number): Promise<void> {
   await db.delete(ideas).where(eq(ideas.id, id));
}

/**
 * Archive an idea (soft delete).
 * Archived ideas can be restored; deleted ones cannot.
 */
export async function archiveIdea(id: number): Promise<Idea | undefined> {
   return updateIdea(id, { archived: true });
}
```

**Why this abstraction layer?** You could call `db.select().from(ideas)` directly in your components, but this layer provides:

1. **Encapsulation** — Components don't need to know Drizzle syntax
2. **Consistency** — All queries go through one place
3. **Flexibility** — Easy to add logging, caching, or switch databases later

### Step 2.11: Test the Database Connection

Let's verify everything works with a quick test. Create `src/lib/test-db.ts`:

```typescript
import { db } from "./db";
import { ideas } from "./schema";
import { getAllIdeas, createIdea, deleteIdea } from "./ideas";

async function testDatabase() {
   console.log("Testing database connection...\n");

   // Create a test idea
   console.log("Creating test idea...");
   const testIdea = await createIdea({
      title: "Test Idea",
      content: "This is a test to verify the database connection works.",
      tags: ["test"],
   });
   console.log("Created:", testIdea);

   // Read it back
   console.log("\nFetching all ideas...");
   const allIdeas = await getAllIdeas();
   console.log(`Found ${allIdeas.length} idea(s)`);

   // Clean up
   console.log("\nCleaning up test data...");
   await deleteIdea(testIdea.id);
   console.log("Test idea deleted");

   console.log("\n✓ Database connection working!");
}

testDatabase().catch(console.error);
```

Run the test:

```bash
bun run src/lib/test-db.ts
```

**Checkpoint:** You should see:

-  "Creating test idea..." followed by the idea object with an ID
-  "Found 1 idea(s)"
-  "Test idea deleted"
-  "Database connection working!"

If you see connection errors, double-check your `.env.local` credentials.

Clean up the test file:

```bash
rm src/lib/test-db.ts
```

**Milestone 2 Complete!** You now have:

-  A Turso database deployed at the edge
-  A type-safe schema defined in TypeScript
-  Drizzle ORM configured with migrations
-  CRUD functions ready for your UI

---

<!-- SPLIT_OUTPUT: 03-basic-crud-ui -->

## Milestone 3: Basic CRUD UI

**Goal:** Build a working interface to create, read, update, and delete ideas.

**Why this matters:** This milestone connects your database to a real UI. By the end, you'll have a functional (if minimal) app that persists data. This is the core of your application—everything else (offline support, AI, search) builds on this foundation.

### Step 3.1: Create a Custom Hook for Ideas

React hooks let you extract stateful logic into reusable functions. We'll create a hook that manages our ideas state and provides functions to modify it.

Create `src/hooks/useIdeas.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import type { Idea } from "../lib/schema";
import * as ideaApi from "../lib/ideas";

/**
 * Custom hook for managing ideas state.
 *
 * Why a custom hook?
 * - Encapsulates all idea-related state and logic
 * - Can be reused across components
 * - Separates data logic from UI logic
 * - Makes testing easier (you can test the hook independently)
 */
export function useIdeas() {
   // State for the list of ideas
   const [ideas, setIdeas] = useState<Idea[]>([]);

   // Loading state for showing skeletons/spinners
   const [loading, setLoading] = useState(true);

   // Error state for displaying error messages
   const [error, setError] = useState<Error | null>(null);

   /**
    * Fetch all ideas from the database.
    * useCallback ensures this function's identity is stable,
    * which prevents unnecessary re-renders.
    */
   const fetchIdeas = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);
         const data = await ideaApi.getAllIdeas();
         setIdeas(data);
      } catch (err) {
         setError(
            err instanceof Error ? err : new Error("Failed to fetch ideas")
         );
      } finally {
         setLoading(false);
      }
   }, []);

   // Fetch ideas on mount
   useEffect(() => {
      fetchIdeas();
   }, [fetchIdeas]);

   /**
    * Create a new idea and add it to state.
    * We optimistically add to state after the API call succeeds.
    */
   const createIdea = async (
      title: string,
      content: string,
      tags: string[] = []
   ) => {
      const newIdea = await ideaApi.createIdea({ title, content, tags });
      // Add to beginning of array (newest first)
      setIdeas((prev) => [newIdea, ...prev]);
      return newIdea;
   };

   /**
    * Delete an idea and remove from state.
    */
   const deleteIdea = async (id: number) => {
      await ideaApi.deleteIdea(id);
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
   };

   /**
    * Archive an idea and update state.
    */
   const archiveIdea = async (id: number) => {
      const updated = await ideaApi.archiveIdea(id);
      if (updated) {
         setIdeas((prev) =>
            prev.map((idea) => (idea.id === id ? updated : idea))
         );
      }
      return updated;
   };

   return {
      ideas,
      loading,
      error,
      createIdea,
      deleteIdea,
      archiveIdea,
      refetch: fetchIdeas,
   };
}
```

**Understanding the hook pattern:**

This hook follows a common pattern:

1. **State** — `useState` holds the data
2. **Effect** — `useEffect` fetches data on mount
3. **Actions** — Functions that modify state and call the API
4. **Return** — Expose everything consumers need

The consumer (our App component) doesn't know or care about the implementation—it just gets `ideas`, `loading`, `error`, and functions to call.

### Step 3.2: Create the IdeaForm Component

Create `src/components/IdeaForm.tsx`:

```tsx
import { useState, FormEvent } from "react";

interface IdeaFormProps {
   onSubmit: (title: string, content: string) => Promise<void>;
}

/**
 * Form for capturing new ideas.
 *
 * Design decisions:
 * - Controlled inputs (React manages the input state)
 * - Disabled during submission to prevent double-submit
 * - Clears after successful submission
 */
export function IdeaForm({ onSubmit }: IdeaFormProps) {
   const [title, setTitle] = useState("");
   const [content, setContent] = useState("");
   const [submitting, setSubmitting] = useState(false);

   const handleSubmit = async (e: FormEvent) => {
      // Prevent default form submission (page reload)
      e.preventDefault();

      // Validate
      if (!title.trim() || !content.trim()) return;

      setSubmitting(true);
      try {
         await onSubmit(title.trim(), content.trim());
         // Clear form on success
         setTitle("");
         setContent("");
      } finally {
         setSubmitting(false);
      }
   };

   const isValid = title.trim() && content.trim();

   return (
      <form onSubmit={handleSubmit} className="space-y-4">
         {/* Title input */}
         <div>
            <label
               htmlFor="title"
               className="block text-sm font-medium text-gray-700 mb-1"
            >
               Title
            </label>
            <input
               id="title"
               type="text"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               placeholder="What's your idea?"
               disabled={submitting}
               required
               className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     transition-colors"
            />
         </div>

         {/* Content textarea */}
         <div>
            <label
               htmlFor="content"
               className="block text-sm font-medium text-gray-700 mb-1"
            >
               Details
            </label>
            <textarea
               id="content"
               value={content}
               onChange={(e) => setContent(e.target.value)}
               placeholder="Describe your idea in detail..."
               rows={4}
               disabled={submitting}
               required
               className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     transition-colors"
            />
         </div>

         {/* Submit button */}
         <button
            type="submit"
            disabled={submitting || !isValid}
            className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg
                   hover:bg-primary-hover
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
         >
            {submitting ? "Saving..." : "Save Idea"}
         </button>
      </form>
   );
}
```

**Understanding the Tailwind classes:**

Let's break down the input styling:

-  `w-full` — Width 100%
-  `px-4 py-3` — Padding: 1rem horizontal, 0.75rem vertical
-  `border border-gray-300` — 1px border in gray
-  `rounded-lg` — Border radius of 0.5rem (8px)
-  `focus:outline-none` — Remove default browser outline
-  `focus:ring-2` — Add a 2px ring on focus
-  `focus:ring-primary` — Ring color is our custom primary color
-  `focus:border-transparent` — Hide border when ring is showing
-  `disabled:bg-gray-100` — Gray background when disabled
-  `transition-colors` — Smooth color transitions

The `space-y-4` on the form adds `margin-top: 1rem` to all children except the first—a quick way to space out form fields.

### Step 3.3: Create the IdeaCard Component

Create `src/components/IdeaCard.tsx`:

```tsx
import type { Idea } from "../lib/schema";

interface IdeaCardProps {
   idea: Idea;
   onDelete: (id: number) => Promise<void>;
   onArchive: (id: number) => Promise<void>;
}

/**
 * Displays a single idea with actions.
 *
 * This is a "presentational" component—it receives data and callbacks
 * as props and doesn't manage any state itself.
 */
export function IdeaCard({ idea, onDelete, onArchive }: IdeaCardProps) {
   // Format the date in a human-readable way
   const formattedDate = new Date(idea.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
   });

   return (
      <article
         className={`bg-white rounded-lg shadow-sm border border-gray-200 p-5
                  ${idea.archived ? "opacity-60" : ""}`}
      >
         {/* Header: title and date */}
         <header className="flex justify-between items-start gap-4 mb-3">
            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
               {idea.title}
            </h3>
            <time
               dateTime={idea.createdAt.toISOString()}
               className="text-sm text-gray-500 whitespace-nowrap"
            >
               {formattedDate}
            </time>
         </header>

         {/* Content */}
         <p className="text-gray-600 mb-4 whitespace-pre-wrap">
            {idea.content}
         </p>

         {/* Tags */}
         {idea.tags && idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
               {idea.tags.map((tag) => (
                  <span
                     key={tag}
                     className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-600
                         text-xs font-medium rounded-full"
                  >
                     {tag}
                  </span>
               ))}
            </div>
         )}

         {/* Actions */}
         <footer className="flex justify-end gap-2">
            {!idea.archived && (
               <button
                  onClick={() => onArchive(idea.id)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600
                       bg-gray-100 rounded-md
                       hover:bg-gray-200 transition-colors"
               >
                  Archive
               </button>
            )}
            <button
               onClick={() => onDelete(idea.id)}
               className="px-3 py-1.5 text-sm font-medium text-red-600
                     bg-red-50 rounded-md
                     hover:bg-red-100 transition-colors"
            >
               Delete
            </button>
         </footer>
      </article>
   );
}
```

**Semantic HTML note:** We're using `<article>`, `<header>`, `<footer>`, and `<time>` elements. These semantic elements:

-  Improve accessibility (screen readers understand the structure)
-  Help with SEO (search engines understand the content)
-  Make the code more readable

### Step 3.4: Create the IdeaList Component

Create `src/components/IdeaList.tsx`:

```tsx
import type { Idea } from "../lib/schema";
import { IdeaCard } from "./IdeaCard";

interface IdeaListProps {
   ideas: Idea[];
   loading: boolean;
   error: Error | null;
   onDelete: (id: number) => Promise<void>;
   onArchive: (id: number) => Promise<void>;
}

/**
 * Displays a list of ideas with loading and error states.
 *
 * This component handles three states:
 * 1. Loading — Show a loading message
 * 2. Error — Show the error message
 * 3. Empty — Show a helpful message
 * 4. Has data — Show the ideas
 */
export function IdeaList({
   ideas,
   loading,
   error,
   onDelete,
   onArchive,
}: IdeaListProps) {
   // Loading state
   if (loading) {
      return (
         <div className="text-center py-12 text-gray-500">Loading ideas...</div>
      );
   }

   // Error state
   if (error) {
      return (
         <div className="text-center py-12 text-red-600">
            Error: {error.message}
         </div>
      );
   }

   // Empty state
   if (ideas.length === 0) {
      return (
         <div className="text-center py-12 text-gray-500">
            <p>No ideas yet.</p>
            <p className="mt-1">Create your first one above!</p>
         </div>
      );
   }

   // Separate active and archived ideas
   const activeIdeas = ideas.filter((idea) => !idea.archived);
   const archivedIdeas = ideas.filter((idea) => idea.archived);

   return (
      <div className="space-y-6">
         {/* Active ideas */}
         {activeIdeas.length > 0 && (
            <section>
               <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Ideas ({activeIdeas.length})
               </h2>
               <div className="space-y-4">
                  {activeIdeas.map((idea) => (
                     <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onDelete={onDelete}
                        onArchive={onArchive}
                     />
                  ))}
               </div>
            </section>
         )}

         {/* Archived ideas */}
         {archivedIdeas.length > 0 && (
            <section>
               <h2 className="text-lg font-semibold text-gray-500 mb-4">
                  Archived ({archivedIdeas.length})
               </h2>
               <div className="space-y-4">
                  {archivedIdeas.map((idea) => (
                     <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onDelete={onDelete}
                        onArchive={onArchive}
                     />
                  ))}
               </div>
            </section>
         )}
      </div>
   );
}
```

**Why separate active and archived?** Users primarily want to see their active ideas. Archived ideas are "done" or "not relevant right now" but shouldn't be deleted. Separating them visually makes the interface cleaner.

### Step 3.5: Wire Everything Together in App.tsx

Replace `src/App.tsx`:

```tsx
import { useIdeas } from "./hooks/useIdeas";
import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";

function App() {
   const { ideas, loading, error, createIdea, deleteIdea, archiveIdea } =
      useIdeas();

   const handleCreateIdea = async (title: string, content: string) => {
      await createIdea(title, content);
   };

   return (
      <div className="min-h-screen bg-gray-50">
         <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
            </header>

            <main className="space-y-8">
               {/* Idea capture form */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                     New Idea
                  </h2>
                  <IdeaForm onSubmit={handleCreateIdea} />
               </section>

               {/* Ideas list */}
               <section>
                  <IdeaList
                     ideas={ideas}
                     loading={loading}
                     error={error}
                     onDelete={deleteIdea}
                     onArchive={archiveIdea}
                  />
               </section>
            </main>
         </div>
      </div>
   );
}

export default App;
```

**Component composition:** Notice how `App` doesn't know anything about:

-  How ideas are fetched (that's in `useIdeas`)
-  How the form handles input (that's in `IdeaForm`)
-  How individual ideas look (that's in `IdeaCard`)

Each piece has a single responsibility. This makes the code easier to understand, test, and modify.

### Step 3.6: Test the CRUD Functionality

```bash
bun run dev
```

**Checkpoint — Test each operation:**

1. **Create:** Fill out the form with a title and content. Click "Save Idea".

   -  ✓ The idea should appear in the list immediately
   -  ✓ The form should clear

2. **Read:** Refresh the page.

   -  ✓ Your saved ideas should still be there (loaded from Turso)

3. **Archive:** Click "Archive" on an idea.

   -  ✓ It should move to the "Archived" section with reduced opacity

4. **Delete:** Click "Delete" on an idea.

   -  ✓ It should disappear from the list

5. **Create multiple:** Add 3-4 ideas with different content
   -  ✓ Newest should appear at the top
   -  ✓ All should persist after refresh

**Milestone 3 Complete!** You now have a working CRUD application:

-  Form to capture ideas
-  List displaying all ideas
-  Archive and delete functionality
-  Data persists in your Turso database

The app is functional but not yet offline-capable. That's next.

---

<!-- SPLIT_OUTPUT: 04-pwa-configuration -->

## Milestone 4: PWA Configuration

**Goal:** Make the app installable and capable of loading offline.

**Why this matters:** A Progressive Web App (PWA) bridges the gap between websites and native apps. By adding PWA capabilities, your app can:

1. **Be installed** — Users can add it to their home screen and launch it like a native app
2. **Work offline** — The app shell loads even without internet
3. **Load faster** — Assets are cached locally after the first visit
4. **Feel native** — Full-screen mode, splash screens, and OS integration

For an idea capture app, installability is crucial. When inspiration strikes, you want to tap an icon—not open a browser, type a URL, and wait for it to load.

### Understanding Service Workers

Before we dive in, let's understand what makes PWAs work: **service workers**.

A service worker is a JavaScript file that runs separately from your main app. It sits between your app and the network, acting as a proxy. When your app requests a resource (HTML, CSS, JS, API data), the service worker can:

-  **Serve from cache** — Return a cached version instantly
-  **Fetch from network** — Get fresh data from the server
-  **Do both** — Try network first, fall back to cache (or vice versa)

This is what enables offline functionality. When you're offline, the service worker serves cached assets instead of failing.

**We won't write the service worker manually.** That's error-prone and tedious. Instead, we'll use `vite-plugin-pwa`, which uses Google's Workbox library to generate a service worker based on our configuration.

### Step 4.1: Install the PWA Plugin

```bash
bun add -D vite-plugin-pwa
```

**Why `-D` (dev dependency)?** The plugin is only needed during build time. It generates the service worker and manifest—these generated files are what get deployed, not the plugin itself.

### Step 4.2: Create PWA Icons

PWAs need icons in multiple sizes for different contexts (home screen, app switcher, splash screen). You need at least:

-  `pwa-192x192.png` — Standard icon size
-  `pwa-512x512.png` — Large icon for splash screens

**For quick prototyping**, create simple placeholder icons. You can use any image editor, or an online tool like https://favicon.io/favicon-generator/.

Place the icons in your `public/` directory:

-  `public/pwa-192x192.png`
-  `public/pwa-512x512.png`

**For production**, use https://realfavicongenerator.net/ to generate a complete icon set with proper iOS and Android optimizations.

**Why does this matter?** Without proper icons, your app won't be installable on some platforms. iOS Safari is particularly strict—it needs an `apple-touch-icon` to show the install prompt.

### Step 4.3: Configure vite-plugin-pwa

Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
   plugins: [
      react(),
      tailwindcss(),
      VitePWA({
         // Automatically update the service worker when new content is available
         registerType: "autoUpdate",

         // Assets to include in the precache
         includeAssets: [
            "favicon.ico",
            "apple-touch-icon.png",
            "pwa-192x192.png",
            "pwa-512x512.png",
         ],

         // Web app manifest configuration
         manifest: {
            name: "Quiver - Idea Capture",
            short_name: "Quiver",
            description: "Capture ideas anywhere, even offline",
            theme_color: "#2563eb",
            background_color: "#f9fafb",
            display: "standalone",
            scope: "/",
            start_url: "/",
            icons: [
               {
                  src: "pwa-192x192.png",
                  sizes: "192x192",
                  type: "image/png",
               },
               {
                  src: "pwa-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
               },
               {
                  src: "pwa-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "any maskable",
               },
            ],
         },

         // Workbox configuration for caching strategies
         workbox: {
            // Cache all static assets
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

            // Runtime caching for API requests
            runtimeCaching: [
               {
                  // Cache Turso API responses
                  urlPattern: /^https:\/\/.*\.turso\.io/,
                  handler: "NetworkFirst",
                  options: {
                     cacheName: "turso-api-cache",
                     expiration: {
                        maxEntries: 50,
                        maxAgeSeconds: 60 * 60 * 24, // 24 hours
                     },
                     cacheableResponse: {
                        statuses: [0, 200],
                     },
                  },
               },
            ],
         },
      }),
   ],
});
```

**Understanding the configuration:**

**`registerType: 'autoUpdate'`** — When you deploy a new version, the service worker automatically updates without requiring user interaction. The alternative is `'prompt'`, which asks users to refresh.

**`manifest`** — This is the Web App Manifest, a JSON file that tells browsers how to install your app:

-  `name` / `short_name` — Full name and abbreviated name
-  `display: 'standalone'` — Run without browser chrome (address bar, etc.)
-  `theme_color` — The color of the status bar on mobile
-  `icons` — The app icons in different sizes

**`workbox.globPatterns`** — Which files to precache (download and store during install). We're caching all JS, CSS, HTML, images, and fonts.

**`workbox.runtimeCaching`** — How to handle requests that aren't precached. For our Turso API:

-  `NetworkFirst` — Try the network first; if offline, use cached data
-  `cacheName` — Name of the cache (useful for debugging)
-  `expiration` — Limit cache size and age

### Step 4.4: Add Meta Tags for iOS

iOS Safari doesn't read the Web App Manifest as thoroughly as Android Chrome. We need to add meta tags for proper iOS support.

Update `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
   <head>
      <meta charset="UTF-8" />
      <link rel="icon" type="image/svg+xml" href="/vite.svg" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <!-- PWA meta tags -->
      <meta name="theme-color" content="#2563eb" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Quiver" />
      <link rel="apple-touch-icon" href="/pwa-192x192.png" />

      <title>Quiver</title>
   </head>
   <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
   </body>
</html>
```

**What do these meta tags do?**

-  `theme-color` — Sets the browser toolbar color on Android
-  `apple-mobile-web-app-capable` — Tells Safari this is a web app
-  `apple-mobile-web-app-status-bar-style` — Controls iOS status bar appearance
-  `apple-mobile-web-app-title` — The name shown on iOS home screen
-  `apple-touch-icon` — The icon used on iOS home screen

### Step 4.5: Build and Test the PWA

The PWA features only work in production builds. The dev server doesn't register service workers (which would cause caching headaches during development).

```bash
bun run build
bun run preview
```

**Checkpoint — Verify PWA installation:**

1. Open http://localhost:4173 in Chrome
2. Open DevTools (F12) → Application tab
3. Click "Service Workers" in the left sidebar
   -  ✓ You should see a service worker registered and "activated and is running"
4. Click "Manifest" in the left sidebar
   -  ✓ You should see your app name, icons, and display mode
5. Look for the install icon in Chrome's address bar (right side)
   -  ✓ Click it to install the app

**Checkpoint — Test offline loading:**

1. In DevTools → Network tab, check the "Offline" checkbox
2. Refresh the page
3. ✓ The app shell should still load (header, form, basic layout)
4. ✓ Data loading will fail (we'll fix this in Milestone 5)
5. Uncheck "Offline" to restore connectivity

### Step 4.6: Add an Offline Indicator

Users should know when they're offline. Let's add a visual indicator.

Create `src/components/OfflineIndicator.tsx`:

```tsx
import { useState, useEffect } from "react";

/**
 * Shows a banner when the user is offline.
 *
 * Why track online status?
 * - Users need to know why data isn't syncing
 * - Sets appropriate expectations (can read, can't write to server)
 * - Builds trust by being transparent about app state
 */
export function OfflineIndicator() {
   const [isOnline, setIsOnline] = useState(navigator.onLine);

   useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      // These events fire when the browser's network status changes
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
         window.removeEventListener("online", handleOnline);
         window.removeEventListener("offline", handleOffline);
      };
   }, []);

   // Don't render anything when online
   if (isOnline) return null;

   return (
      <div
         className="fixed bottom-0 left-0 right-0 bg-amber-400 text-amber-900
                    text-center py-3 px-4 font-medium z-50"
      >
         You're offline. Changes will sync when you're back online.
      </div>
   );
}
```

**Understanding the implementation:**

-  `navigator.onLine` — Browser API that returns current network status
-  `online` / `offline` events — Fire when status changes
-  `useState(navigator.onLine)` — Initialize with current status
-  Conditional rendering — Only show when offline

Add it to `App.tsx`:

```tsx
import { useIdeas } from "./hooks/useIdeas";
import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";
import { OfflineIndicator } from "./components/OfflineIndicator";

function App() {
   const { ideas, loading, error, createIdea, deleteIdea, archiveIdea } =
      useIdeas();

   const handleCreateIdea = async (title: string, content: string) => {
      await createIdea(title, content);
   };

   return (
      <div className="min-h-screen bg-gray-50 pb-16">
         <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
            </header>

            <main className="space-y-8">
               {/* Idea capture form */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                     New Idea
                  </h2>
                  <IdeaForm onSubmit={handleCreateIdea} />
               </section>

               {/* Ideas list */}
               <section>
                  <IdeaList
                     ideas={ideas}
                     loading={loading}
                     error={error}
                     onDelete={deleteIdea}
                     onArchive={archiveIdea}
                  />
               </section>
            </main>
         </div>

         {/* Offline indicator at bottom of screen */}
         <OfflineIndicator />
      </div>
   );
}

export default App;
```

Note the `pb-16` (padding-bottom) on the container—this prevents the offline banner from covering content.

**Checkpoint:** Build and preview again (`bun run build && bun run preview`), then toggle offline in DevTools. A yellow banner should appear at the bottom.

**Milestone 4 Complete!** Your app is now a PWA:

-  Installable on mobile and desktop
-  Has a proper manifest with icons
-  Service worker caches static assets
-  Shows offline status to users

But there's a problem: when offline, users can see the app but can't interact with their data. That's what we'll fix next.

---

<!-- SPLIT_OUTPUT: 05-offline-first-data-layer -->

## Milestone 5: Offline-First Data Layer

**Goal:** Enable creating and viewing ideas while offline, with automatic sync when connectivity returns.

**Why this matters:** This is the heart of "offline-first." Currently, our app requires network connectivity for every operation. When offline:

-  Fetching ideas fails
-  Creating ideas fails
-  The app is essentially broken

We need to flip this: **local storage is the source of truth, and the network is for sync**.

### The Offline-First Architecture

Here's how offline-first works:

1. **All data lives locally first** — We store ideas in IndexedDB (browser database)
2. **Reads are always local** — Display data from IndexedDB, not the network
3. **Writes go local, then sync** — Save to IndexedDB immediately, queue network sync
4. **Sync happens opportunistically** — When online, sync pending changes to Turso

This means the app is **always fast** (reads from local) and **always available** (writes work offline).

### Step 5.1: Install IndexedDB Library

```bash
bun add idb
```

**Why IndexedDB?** It's the only browser API that can store significant amounts of structured data. LocalStorage is limited to ~5MB of strings. IndexedDB can store megabytes of structured data with indexes for fast queries.

**Why the `idb` library?** The native IndexedDB API is callback-based and awkward to use. `idb` wraps it with a clean Promise-based API.

### Step 5.2: Create the Local Database

Create `src/lib/local-db.ts`:

```typescript
import { openDB, type IDBPDatabase } from "idb";
import type { Idea, NewIdea } from "./schema";

/**
 * Local database using IndexedDB.
 *
 * IndexedDB is a browser-native database that:
 * - Persists data across sessions
 * - Can store megabytes of structured data
 * - Supports indexes for fast queries
 * - Works completely offline
 *
 * We use it to:
 * 1. Cache ideas locally for offline reading
 * 2. Store pending changes for offline writing
 */

const DB_NAME = "quiver-local";
const DB_VERSION = 1;
const IDEAS_STORE = "ideas";
const PENDING_STORE = "pending-changes";

/**
 * Represents a change that needs to be synced to the server.
 * We queue these when offline and process them when back online.
 */
interface PendingChange {
   id: string;
   type: "create" | "update" | "delete";
   ideaId?: number; // For update/delete operations
   data?: NewIdea | Partial<NewIdea>; // For create/update operations
   timestamp: number; // When the change was made (for ordering)
}

// Singleton promise to avoid opening multiple connections
let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Get or create the database connection.
 *
 * Why a singleton? Opening IndexedDB is expensive. We want to open it
 * once and reuse the connection for all operations.
 */
function getDb() {
   if (!dbPromise) {
      dbPromise = openDB(DB_NAME, DB_VERSION, {
         upgrade(db) {
            // This runs when the database is created or version increases.
            // It's where we define our object stores (like tables).

            // Store for cached ideas
            if (!db.objectStoreNames.contains(IDEAS_STORE)) {
               const store = db.createObjectStore(IDEAS_STORE, {
                  keyPath: "id",
               });
               // Index for sorting by creation date
               store.createIndex("createdAt", "createdAt");
            }

            // Store for pending changes (offline queue)
            if (!db.objectStoreNames.contains(PENDING_STORE)) {
               db.createObjectStore(PENDING_STORE, { keyPath: "id" });
            }
         },
      });
   }
   return dbPromise;
}

// ============================================================
// Ideas Cache Operations
// ============================================================

/**
 * Get all ideas from local cache.
 */
export async function getLocalIdeas(): Promise<Idea[]> {
   const db = await getDb();
   const ideas = await db.getAll(IDEAS_STORE);
   // Sort by createdAt descending (newest first)
   return ideas.sort(
      (a, b) =>
         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
   );
}

/**
 * Save a single idea to local cache.
 */
export async function saveLocalIdea(idea: Idea): Promise<void> {
   const db = await getDb();
   await db.put(IDEAS_STORE, idea);
}

/**
 * Save multiple ideas to local cache.
 * Uses a transaction for efficiency.
 */
export async function saveLocalIdeas(ideas: Idea[]): Promise<void> {
   const db = await getDb();
   const tx = db.transaction(IDEAS_STORE, "readwrite");
   await Promise.all([
      ...ideas.map((idea) => tx.store.put(idea)),
      tx.done, // Wait for transaction to complete
   ]);
}

/**
 * Delete an idea from local cache.
 */
export async function deleteLocalIdea(id: number): Promise<void> {
   const db = await getDb();
   await db.delete(IDEAS_STORE, id);
}

/**
 * Clear all ideas from local cache.
 * Used when refreshing from server.
 */
export async function clearLocalIdeas(): Promise<void> {
   const db = await getDb();
   await db.clear(IDEAS_STORE);
}

// ============================================================
// Pending Changes Queue Operations
// ============================================================

/**
 * Add a change to the pending queue.
 * These will be synced when we're back online.
 */
export async function addPendingChange(
   change: Omit<PendingChange, "id" | "timestamp">
): Promise<void> {
   const db = await getDb();
   const pendingChange: PendingChange = {
      ...change,
      id: crypto.randomUUID(), // Unique ID for this change
      timestamp: Date.now(), // When it was queued
   };
   await db.put(PENDING_STORE, pendingChange);
}

/**
 * Get all pending changes, ordered by timestamp.
 */
export async function getPendingChanges(): Promise<PendingChange[]> {
   const db = await getDb();
   const changes = await db.getAll(PENDING_STORE);
   // Process in order they were made
   return changes.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Remove a change from the pending queue.
 * Called after successfully syncing to server.
 */
export async function removePendingChange(id: string): Promise<void> {
   const db = await getDb();
   await db.delete(PENDING_STORE, id);
}

/**
 * Clear all pending changes.
 * Use with caution - only after confirming all are synced.
 */
export async function clearPendingChanges(): Promise<void> {
   const db = await getDb();
   await db.clear(PENDING_STORE);
}
```

**Understanding IndexedDB concepts:**

-  **Object Store** — Like a table in SQL. We have two: `ideas` (cache) and `pending-changes` (sync queue)
-  **Key Path** — The property used as the primary key (`id` for both stores)
-  **Index** — Allows fast queries on non-key properties (`createdAt`)
-  **Transaction** — Groups operations together (all succeed or all fail)

### Step 5.3: Create the Sync Service

Create `src/lib/sync.ts`:

```typescript
import * as localDb from "./local-db";
import * as remoteDb from "./ideas";
import type { Idea, NewIdea } from "./schema";

/**
 * Sync service that coordinates between local and remote databases.
 *
 * The sync strategy is:
 * 1. Local-first: All operations happen locally first
 * 2. Opportunistic sync: Sync to server when online
 * 3. Conflict resolution: Server wins (for simplicity)
 */

// Prevent concurrent sync operations
let isSyncing = false;

/**
 * Sync all pending changes to the remote server.
 *
 * This processes the pending queue in order, removing each change
 * after it's successfully synced.
 *
 * Returns statistics about what was synced.
 */
export async function syncToRemote(): Promise<{
   success: boolean;
   synced: number;
}> {
   // Don't sync if already syncing or offline
   if (isSyncing || !navigator.onLine) {
      return { success: false, synced: 0 };
   }

   isSyncing = true;
   let synced = 0;

   try {
      const pendingChanges = await localDb.getPendingChanges();

      for (const change of pendingChanges) {
         try {
            // Process each change type
            switch (change.type) {
               case "create":
                  if (change.data) {
                     await remoteDb.createIdea(change.data as NewIdea);
                  }
                  break;
               case "update":
                  if (change.ideaId && change.data) {
                     await remoteDb.updateIdea(change.ideaId, change.data);
                  }
                  break;
               case "delete":
                  if (change.ideaId) {
                     await remoteDb.deleteIdea(change.ideaId);
                  }
                  break;
            }

            // Remove from queue after successful sync
            await localDb.removePendingChange(change.id);
            synced++;
         } catch (error) {
            // Log but continue with other changes
            console.error("Failed to sync change:", change, error);
            // Keep the change in the queue for retry
         }
      }

      // After syncing, refresh local cache from server
      // This ensures we have the latest data including server-generated IDs
      if (synced > 0 || pendingChanges.length === 0) {
         const remoteIdeas = await remoteDb.getAllIdeas();
         await localDb.clearLocalIdeas();
         await localDb.saveLocalIdeas(remoteIdeas);
      }

      return { success: true, synced };
   } finally {
      isSyncing = false;
   }
}

/**
 * Fetch ideas, using local cache when offline.
 *
 * Strategy:
 * - If online: Fetch from server, update local cache
 * - If offline: Return local cache
 * - If online but fetch fails: Fall back to local cache
 */
export async function fetchAndCacheIdeas(): Promise<Idea[]> {
   if (navigator.onLine) {
      try {
         // Fetch from server
         const remoteIdeas = await remoteDb.getAllIdeas();
         // Update local cache
         await localDb.saveLocalIdeas(remoteIdeas);
         return remoteIdeas;
      } catch (error) {
         // Network error - fall back to cache
         console.error(
            "Failed to fetch from remote, using local cache:",
            error
         );
         return localDb.getLocalIdeas();
      }
   }

   // Offline - use local cache
   return localDb.getLocalIdeas();
}

/**
 * Create an idea with offline support.
 *
 * Strategy:
 * - If online: Create on server, cache locally
 * - If offline: Create locally with temp ID, queue for sync
 */
export async function createIdeaOfflineFirst(data: NewIdea): Promise<Idea> {
   if (navigator.onLine) {
      // Online: Create on server and cache
      const remoteIdea = await remoteDb.createIdea(data);
      await localDb.saveLocalIdea(remoteIdea);
      return remoteIdea;
   }

   // Offline: Create local idea with temporary negative ID
   // Negative IDs indicate "not yet synced"
   const tempIdea: Idea = {
      id: -Date.now(), // Negative timestamp as temp ID
      ...data,
      urls: data.urls || [],
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      archived: false,
   };

   // Save locally
   await localDb.saveLocalIdea(tempIdea);

   // Queue for sync
   await localDb.addPendingChange({ type: "create", data });

   return tempIdea;
}

/**
 * Delete an idea with offline support.
 */
export async function deleteIdeaOfflineFirst(id: number): Promise<void> {
   // Always delete locally first
   await localDb.deleteLocalIdea(id);

   // Only sync deletion for real (positive) IDs
   // Negative IDs are local-only and don't exist on server
   if (id > 0) {
      if (navigator.onLine) {
         await remoteDb.deleteIdea(id);
      } else {
         await localDb.addPendingChange({ type: "delete", ideaId: id });
      }
   }
}

/**
 * Archive an idea with offline support.
 */
export async function archiveIdeaOfflineFirst(
   id: number
): Promise<Idea | undefined> {
   // Get the idea from local cache
   const ideas = await localDb.getLocalIdeas();
   const idea = ideas.find((i) => i.id === id);

   if (!idea) return undefined;

   // Update locally
   const updated = { ...idea, archived: true, updatedAt: new Date() };
   await localDb.saveLocalIdea(updated);

   // Sync if online, queue if offline
   if (id > 0) {
      if (navigator.onLine) {
         return remoteDb.archiveIdea(id);
      } else {
         await localDb.addPendingChange({
            type: "update",
            ideaId: id,
            data: { archived: true },
         });
      }
   }

   return updated;
}
```

**Key design decisions:**

1. **Negative IDs for offline-created items** — This is a simple way to distinguish "not yet synced" items. When synced, they get real server IDs.

2. **Server wins conflict resolution** — After syncing, we replace the local cache with server data. This is simple but means offline changes might be lost if there are conflicts. For a single-user app, this is usually fine.

3. **Queue-based sync** — Changes are queued and processed in order. This maintains consistency (e.g., create before update).

### Step 5.4: Update the useIdeas Hook

Replace `src/hooks/useIdeas.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import type { Idea } from "../lib/schema";
import * as sync from "../lib/sync";

/**
 * Custom hook for managing ideas with offline-first support.
 *
 * Key changes from the online-only version:
 * - Uses sync service instead of direct API calls
 * - Tracks syncing state
 * - Auto-syncs when coming back online
 */
export function useIdeas() {
   const [ideas, setIdeas] = useState<Idea[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<Error | null>(null);
   const [syncing, setSyncing] = useState(false);

   /**
    * Fetch ideas from local cache (and server if online).
    */
   const fetchIdeas = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);
         const data = await sync.fetchAndCacheIdeas();
         setIdeas(data);
      } catch (err) {
         setError(
            err instanceof Error ? err : new Error("Failed to fetch ideas")
         );
      } finally {
         setLoading(false);
      }
   }, []);

   /**
    * Sync pending changes to server.
    */
   const syncChanges = useCallback(async () => {
      if (syncing) return;

      setSyncing(true);
      try {
         const result = await sync.syncToRemote();
         if (result.success && result.synced > 0) {
            // Refresh after successful sync to get server IDs
            await fetchIdeas();
         }
      } finally {
         setSyncing(false);
      }
   }, [syncing, fetchIdeas]);

   // Fetch ideas on mount
   useEffect(() => {
      fetchIdeas();
   }, [fetchIdeas]);

   // Auto-sync when coming back online
   useEffect(() => {
      const handleOnline = () => {
         console.log("Back online, syncing...");
         syncChanges();
      };

      window.addEventListener("online", handleOnline);
      return () => window.removeEventListener("online", handleOnline);
   }, [syncChanges]);

   /**
    * Create a new idea (works offline).
    */
   const createIdea = async (
      title: string,
      content: string,
      tags: string[] = []
   ) => {
      const newIdea = await sync.createIdeaOfflineFirst({
         title,
         content,
         tags,
      });
      // Add to state immediately (optimistic update)
      setIdeas((prev) => [newIdea, ...prev]);
      return newIdea;
   };

   /**
    * Delete an idea (works offline).
    */
   const deleteIdea = async (id: number) => {
      await sync.deleteIdeaOfflineFirst(id);
      // Remove from state immediately
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
   };

   /**
    * Archive an idea (works offline).
    */
   const archiveIdea = async (id: number) => {
      const updated = await sync.archiveIdeaOfflineFirst(id);
      if (updated) {
         // Update in state immediately
         setIdeas((prev) =>
            prev.map((idea) => (idea.id === id ? updated : idea))
         );
      }
      return updated;
   };

   return {
      ideas,
      loading,
      error,
      syncing,
      createIdea,
      deleteIdea,
      archiveIdea,
      refetch: fetchIdeas,
      sync: syncChanges,
   };
}
```

**New features:**

-  `syncing` state — Shows when background sync is happening
-  `syncChanges()` function — Manually trigger sync
-  `online` event listener — Auto-sync when connectivity returns

### Step 5.5: Add Sync Status to the UI

Update `src/App.tsx` to show sync status:

```tsx
import { useIdeas } from "./hooks/useIdeas";
import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";
import { OfflineIndicator } from "./components/OfflineIndicator";

function App() {
   const {
      ideas,
      loading,
      error,
      syncing,
      createIdea,
      deleteIdea,
      archiveIdea,
   } = useIdeas();

   const handleCreateIdea = async (title: string, content: string) => {
      await createIdea(title, content);
   };

   return (
      <div className="min-h-screen bg-gray-50 pb-16">
         <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
               {syncing && (
                  <p className="mt-1 text-sm text-primary animate-pulse">
                     Syncing...
                  </p>
               )}
            </header>

            <main className="space-y-8">
               {/* Idea capture form */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                     New Idea
                  </h2>
                  <IdeaForm onSubmit={handleCreateIdea} />
               </section>

               {/* Ideas list */}
               <section>
                  <IdeaList
                     ideas={ideas}
                     loading={loading}
                     error={error}
                     onDelete={deleteIdea}
                     onArchive={archiveIdea}
                  />
               </section>
            </main>
         </div>

         <OfflineIndicator />
      </div>
   );
}

export default App;
```

### Step 5.6: Test Offline Functionality

```bash
bun run build
bun run preview
```

**Checkpoint — Test the full offline flow:**

1. **Initial load (online):**

   -  Open the app
   -  Create 2-3 ideas
   -  ✓ They should save and appear in the list

2. **Go offline:**

   -  DevTools → Network → check "Offline"
   -  ✓ Yellow "You're offline" banner should appear

3. **Create while offline:**

   -  Create a new idea
   -  ✓ It should appear in the list immediately
   -  ✓ Notice it has a negative ID (check React DevTools or console)

4. **Delete while offline:**

   -  Delete one of your original ideas
   -  ✓ It should disappear from the list

5. **Come back online:**

   -  Uncheck "Offline"
   -  ✓ The offline banner should disappear
   -  ✓ "Syncing..." should appear briefly
   -  ✓ Refresh the page — the offline-created idea should now have a positive ID

6. **Verify persistence:**
   -  Close the browser completely
   -  Reopen and navigate to the app
   -  ✓ All your ideas should still be there

**Milestone 5 Complete!** Your app is now truly offline-first:

-  Ideas are cached locally in IndexedDB
-  Creating, deleting, and archiving work offline
-  Changes sync automatically when back online
-  The UI shows sync status and offline state

This is a major milestone—your app now works regardless of connectivity.

---

<!-- SPLIT_OUTPUT: 06-ai-powered-brainstorming -->

## Milestone 6: AI-Powered Brainstorming

**Goal:** Add AI brainstorming to help users expand and develop their ideas using Claude.

**Why this matters:** An idea capture app is useful, but an idea _development_ app is powerful. Most ideas start as fragments—"what if we..." or "it would be cool to...". AI can help transform these fragments into fully-formed concepts by:

-  Suggesting directions to explore
-  Asking thought-provoking questions
-  Making unexpected connections
-  Identifying potential challenges

We're using Claude Haiku because it's fast (~1 second response time) and cheap (~$0.01 per brainstorm session). The Vercel AI SDK handles the complexity of streaming responses.

### Understanding Streaming AI Responses

When you ask an AI a question, the response is generated token by token. You have two choices:

1. **Wait for complete response** — Simple but slow. User stares at a spinner for 5-10 seconds.
2. **Stream tokens as generated** — Complex but engaging. User sees the response build character by character.

Streaming is better UX, but implementing it manually requires:

-  Handling Server-Sent Events (SSE)
-  Parsing chunked responses
-  Managing partial message state
-  Error handling for dropped connections

The Vercel AI SDK handles all of this. Their `streamText()` function and `useChat` hook make streaming feel like a simple API call.

### Step 6.1: Install AI Dependencies

```bash
bun add ai @ai-sdk/anthropic hono @hono/node-server
```

**What are these packages?**

-  `ai` — Vercel AI SDK core (streaming utilities, React hooks)
-  `@ai-sdk/anthropic` — Anthropic/Claude provider for the AI SDK
-  `hono` — Lightweight web framework (we need a server for API routes)
-  `@hono/node-server` — Runs Hono on Node.js/Bun

**Why do we need a server?** The Anthropic API requires a secret key that can't be exposed in browser code. We need a server-side API route to securely call Claude.

### Step 6.2: Add Your Anthropic API Key

Update `.env.local`:

```env
VITE_TURSO_DATABASE_URL=libsql://quiver-yourusername.turso.io
VITE_TURSO_AUTH_TOKEN=your-turso-token
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Note:** The Anthropic key does NOT have the `VITE_` prefix. This is intentional—we don't want it exposed to the browser. It will only be available server-side.

### Step 6.3: Create the API Server

Create `src/api/server.ts`:

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

/**
 * API server for AI brainstorming.
 *
 * Why a separate server?
 * - API keys must stay server-side for security
 * - Streaming responses require proper SSE handling
 * - Separates concerns (UI vs AI logic)
 */

const app = new Hono();

// Enable CORS for local development
// In production, you'd restrict this to your domain
app.use("/*", cors());

/**
 * Brainstorm endpoint.
 *
 * Takes an idea and returns AI-generated suggestions for developing it.
 * Uses streaming to show responses as they're generated.
 */
app.post("/api/brainstorm", async (c) => {
   const { idea, context } = await c.req.json();

   // Create the streaming response
   const result = streamText({
      model: anthropic("claude-haiku-4-5-20250514"),

      // System prompt defines the AI's behavior
      system: `You are a creative brainstorming assistant. Your role is to help expand and develop ideas.

When given an idea, you should:
1. Identify the core concept and what makes it interesting
2. Suggest 3-5 specific directions to explore
3. Ask 2-3 thought-provoking questions that deepen the idea
4. Offer one unexpected connection or angle

Be concise but insightful. Use bullet points for clarity.
Avoid generic advice—be specific to THIS idea.`,

      messages: [
         {
            role: "user",
            content: context
               ? `Here's an idea I want to brainstorm:

**Title:** ${idea.title}
**Details:** ${idea.content}

**Additional context:** ${context}

Please help me develop this idea.`
               : `Here's an idea I want to brainstorm:

**Title:** ${idea.title}
**Details:** ${idea.content}

Please help me develop this idea.`,
         },
      ],
   });

   // Return as a streaming response
   // The AI SDK handles SSE formatting automatically
   return result.toDataStreamResponse();
});

export default app;
```

**Understanding the code:**

-  `Hono` — A minimal web framework, like Express but faster and lighter
-  `cors()` — Allows requests from different origins (needed for local dev)
-  `streamText()` — AI SDK function that streams the response
-  `anthropic('claude-haiku-4-5-20250514')` — Specifies the Claude model to use
-  `toDataStreamResponse()` — Converts to Server-Sent Events format

### Step 6.4: Create the Server Entry Point

Create `src/api/index.ts`:

```typescript
import { serve } from "@hono/node-server";
import app from "./server";

const port = 3001;

console.log(`API server running at http://localhost:${port}`);

serve({
   fetch: app.fetch,
   port,
});
```

### Step 6.5: Update package.json Scripts

We need to run both the Vite dev server (frontend) and the Hono API server (backend) during development.

Update `package.json`:

```json
{
   "scripts": {
      "dev": "bun run dev:all",
      "dev:client": "vite",
      "dev:api": "bun run --watch src/api/index.ts",
      "dev:all": "bun run dev:api & bun run dev:client",
      "build": "tsc -b && vite build",
      "preview": "vite preview"
   }
}
```

**What's happening?**

-  `dev:client` — Runs Vite (frontend on port 5173)
-  `dev:api` — Runs Hono with file watching (backend on port 3001)
-  `dev:all` — Runs both in parallel using `&`
-  `--watch` — Restarts the server when files change

### Step 6.6: Create the Brainstorm Hook

Create `src/hooks/useBrainstorm.ts`:

```typescript
import { useState, useCallback } from "react";

/**
 * Configuration for the API endpoint.
 * In development, we hit the local Hono server.
 * In production, this would be your deployed API URL.
 */
const API_URL = import.meta.env.DEV ? "http://localhost:3001" : ""; // Production uses relative URLs

interface Idea {
   title: string;
   content: string;
}

/**
 * Hook for AI brainstorming with streaming support.
 *
 * Why a custom hook instead of useChat?
 * - useChat is designed for multi-turn conversations
 * - We want single-shot brainstorming with custom UI
 * - Easier to control the exact request format
 */
export function useBrainstorm() {
   const [isLoading, setIsLoading] = useState(false);
   const [result, setResult] = useState<string>("");
   const [error, setError] = useState<Error | null>(null);

   /**
    * Start a brainstorming session.
    *
    * @param idea - The idea to brainstorm
    * @param context - Optional additional context from the user
    */
   const brainstorm = useCallback(async (idea: Idea, context?: string) => {
      setIsLoading(true);
      setResult("");
      setError(null);

      try {
         const response = await fetch(`${API_URL}/api/brainstorm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idea, context }),
         });

         if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
         }

         // Get the readable stream from the response
         const reader = response.body?.getReader();
         if (!reader) throw new Error("No response body");

         const decoder = new TextDecoder();
         let fullText = "";

         // Read the stream chunk by chunk
         while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true });

            // Parse SSE data format from Vercel AI SDK
            // Format: "0:\"text chunk\"\n"
            const lines = chunk.split("\n");
            for (const line of lines) {
               if (line.startsWith("0:")) {
                  // Text delta - extract the JSON string
                  try {
                     const text = JSON.parse(line.slice(2));
                     fullText += text;
                     setResult(fullText); // Update UI with each chunk
                  } catch {
                     // Skip malformed lines
                  }
               }
            }
         }
      } catch (err) {
         setError(err instanceof Error ? err : new Error("Brainstorm failed"));
      } finally {
         setIsLoading(false);
      }
   }, []);

   /**
    * Clear the current result.
    */
   const reset = useCallback(() => {
      setResult("");
      setError(null);
   }, []);

   return { brainstorm, isLoading, result, error, reset };
}
```

**Understanding streaming:**

The Vercel AI SDK sends responses in a specific format:

```
0:"Here "
0:"is "
0:"the "
0:"first "
0:"sentence."
```

Each line is a chunk of text. We parse these and concatenate them, updating the UI after each chunk so the user sees the response build in real-time.

### Step 6.7: Create the Brainstorm Panel Component

Create `src/components/BrainstormPanel.tsx`:

```tsx
import { useState } from "react";
import { useBrainstorm } from "../hooks/useBrainstorm";
import type { Idea } from "../lib/schema";

interface BrainstormPanelProps {
   idea: Idea;
   onClose: () => void;
}

/**
 * Expandable panel for AI brainstorming on a specific idea.
 *
 * Design decisions:
 * - Appears inline below the idea card (not a modal)
 * - Optional context field for directing the brainstorm
 * - Shows streaming results in real-time
 * - Can regenerate with different context
 */
export function BrainstormPanel({ idea, onClose }: BrainstormPanelProps) {
   const [additionalContext, setAdditionalContext] = useState("");
   const { brainstorm, isLoading, result, error, reset } = useBrainstorm();

   const handleBrainstorm = () => {
      brainstorm(idea, additionalContext || undefined);
   };

   return (
      <div
         className="bg-white border-2 border-primary rounded-lg overflow-hidden
                    -mt-2 mb-4 shadow-lg"
      >
         {/* Header */}
         <header className="bg-primary text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-semibold">Brainstorm: {idea.title}</h3>
            <button
               onClick={onClose}
               className="text-white/80 hover:text-white text-xl leading-none"
               aria-label="Close brainstorm panel"
            >
               ×
            </button>
         </header>

         {/* Content */}
         <div className="p-4 space-y-4">
            {/* Context input */}
            <div>
               <label
                  htmlFor="context"
                  className="block text-sm font-medium text-gray-700 mb-1"
               >
                  Focus your brainstorm (optional)
               </label>
               <textarea
                  id="context"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="e.g., 'Focus on technical implementation' or 'Explore business model options'"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       resize-none"
               />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
               <button
                  onClick={handleBrainstorm}
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary text-white font-medium rounded-lg
                       hover:bg-primary-hover disabled:opacity-50
                       transition-colors"
               >
                  {isLoading
                     ? "Thinking..."
                     : result
                     ? "Brainstorm Again"
                     : "Start Brainstorm"}
               </button>
               {result && (
                  <button
                     onClick={reset}
                     className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg
                         hover:bg-gray-200 transition-colors"
                  >
                     Clear
                  </button>
               )}
            </div>

            {/* Error state */}
            {error && (
               <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  Error: {error.message}
               </div>
            )}

            {/* Results */}
            {result && (
               <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-500 mb-3">
                     Ideas & Directions
                  </h4>
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                     {result}
                  </div>
               </div>
            )}

            {/* Loading indicator for empty state */}
            {isLoading && !result && (
               <div className="flex items-center gap-2 text-gray-500">
                  <div
                     className="w-4 h-4 border-2 border-primary border-t-transparent
                            rounded-full animate-spin"
                  />
                  <span>Claude is thinking...</span>
               </div>
            )}
         </div>
      </div>
   );
}
```

### Step 6.8: Add Brainstorm Button to IdeaCard

Update `src/components/IdeaCard.tsx`:

```tsx
import { useState } from "react";
import type { Idea } from "../lib/schema";
import { BrainstormPanel } from "./BrainstormPanel";

interface IdeaCardProps {
   idea: Idea;
   onDelete: (id: number) => Promise<void>;
   onArchive: (id: number) => Promise<void>;
}

export function IdeaCard({ idea, onDelete, onArchive }: IdeaCardProps) {
   const [showBrainstorm, setShowBrainstorm] = useState(false);

   const formattedDate = new Date(idea.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
   });

   return (
      <>
         <article
            className={`bg-white rounded-lg shadow-sm border border-gray-200 p-5
                    ${idea.archived ? "opacity-60" : ""}`}
         >
            {/* Header */}
            <header className="flex justify-between items-start gap-4 mb-3">
               <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                  {idea.title}
               </h3>
               <time
                  dateTime={idea.createdAt.toISOString()}
                  className="text-sm text-gray-500 whitespace-nowrap"
               >
                  {formattedDate}
               </time>
            </header>

            {/* Content */}
            <p className="text-gray-600 mb-4 whitespace-pre-wrap">
               {idea.content}
            </p>

            {/* Tags */}
            {idea.tags && idea.tags.length > 0 && (
               <div className="flex flex-wrap gap-2 mb-4">
                  {idea.tags.map((tag) => (
                     <span
                        key={tag}
                        className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-600
                           text-xs font-medium rounded-full"
                     >
                        {tag}
                     </span>
                  ))}
               </div>
            )}

            {/* Actions */}
            <footer className="flex justify-end gap-2">
               {!idea.archived && (
                  <>
                     <button
                        onClick={() => setShowBrainstorm(!showBrainstorm)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                           ${
                              showBrainstorm
                                 ? "bg-primary text-white"
                                 : "bg-primary/10 text-primary hover:bg-primary/20"
                           }`}
                     >
                        {showBrainstorm ? "Hide" : "Brainstorm"}
                     </button>
                     <button
                        onClick={() => onArchive(idea.id)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600
                           bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                     >
                        Archive
                     </button>
                  </>
               )}
               <button
                  onClick={() => onDelete(idea.id)}
                  className="px-3 py-1.5 text-sm font-medium text-red-600
                       bg-red-50 rounded-md hover:bg-red-100 transition-colors"
               >
                  Delete
               </button>
            </footer>
         </article>

         {/* Brainstorm panel (appears below the card) */}
         {showBrainstorm && (
            <BrainstormPanel
               idea={idea}
               onClose={() => setShowBrainstorm(false)}
            />
         )}
      </>
   );
}
```

### Step 6.9: Test AI Brainstorming

Start both servers:

```bash
bun run dev
```

You should see two log messages:

-  "API server running at http://localhost:3001"
-  Vite's dev server message

**Checkpoint — Test brainstorming:**

1. Create an idea with a title and detailed content
2. Click the "Brainstorm" button on the idea card
3. Click "Start Brainstorm"
4. ✓ Watch the AI response stream in real-time
5. ✓ The response should include specific suggestions for your idea

**Checkpoint — Test context feature:**

1. Add context like "Focus on technical challenges"
2. Click "Brainstorm Again"
3. ✓ The new response should be different, focused on your context

**If you get errors:**

-  Check that `ANTHROPIC_API_KEY` is set in `.env.local` (no `VITE_` prefix)
-  Check the API server is running on port 3001
-  Check browser console for CORS or network errors

**Milestone 6 Complete!** Your app now has AI brainstorming:

-  Claude helps develop ideas with specific suggestions
-  Streaming shows responses in real-time
-  Users can focus the brainstorm with additional context
-  Works per-idea with a dedicated panel

---

 <!-- SPLIT_OUTPUT: 07-inngest-integration -->

## Milestone 7: Inngest Integration

**Goal:** Add Inngest for reliable background job processing, giving your AI brainstorming automatic retries, observability, and production-grade reliability.

**Why this matters:** In Milestone 6, we built AI brainstorming with direct API calls. This works, but has limitations:

1. **No automatic retries** — If Claude times out (happens occasionally under load), the user sees an error and has to manually retry
2. **No visibility** — When something fails, you're digging through logs to figure out what happened
3. **No rate limiting** — If users spam the brainstorm button, you'll hit API rate limits
4. **No background processing** — Everything runs in the request/response cycle

**Inngest solves all of these:**

-  **Automatic retries** — Failed functions retry with exponential backoff
-  **Observability dashboard** — See every function run, its duration, failures, and payloads
-  **Concurrency controls** — Limit how many brainstorms run simultaneously
-  **Background execution** — Functions run outside the HTTP request cycle
-  **Event-driven architecture** — Build reactive workflows (e.g., "when idea created, auto-suggest tags")

**The tradeoff:** Adding Inngest introduces another service to manage. For a personal app, the direct API approach from Milestone 6 is fine. But if you're building something others will use, or if you want to learn industry-standard patterns for background jobs, Inngest is worth the setup time.

**Architecture shift:**

Before (Milestone 6):

```
[Browser] → POST /api/brainstorm → [Hono] → Claude API → Stream Response
```

After (Milestone 7):

```
[Browser] → POST /api/brainstorm → [Hono] → inngest.send() → [Inngest]
                                                              ↓
                                                        [Background Function]
                                                              ↓
                                                         Claude API
                                                              ↓
                                                        Store Result
                                                              ↓
[Browser] ← Poll for completion ← [Hono] ← Read Result
```

This is more complex, but also more robust. Let's build it.

### Step 7.1: Install Inngest

```bash
bun add inngest
```

**Why Inngest over alternatives?**

-  **vs. BullMQ** — BullMQ requires Redis. Inngest is serverless-native with no infrastructure
-  **vs. AWS SQS/Lambda** — Inngest is simpler to set up and has a better developer experience
-  **vs. Temporal** — Temporal is powerful but complex; Inngest is simpler for our use case
-  **vs. Trigger.dev** — Both are good; Inngest has a more mature Vercel integration

### Step 7.2: Create the Inngest Client

The Inngest client is how your app communicates with Inngest. You'll use it to send events and define functions.

Create `src/lib/inngest.ts`:

```typescript
import { Inngest } from "inngest";

/**
 * Inngest client singleton.
 *
 * The `id` is your app identifier—Inngest uses this to namespace
 * your functions and events. Use something unique to your app.
 */
export const inngest = new Inngest({
   id: "quiver",
});

/**
 * Type definitions for events.
 *
 * Why define these? TypeScript will autocomplete event names and
 * validate payloads when you send events. Catches bugs at compile time.
 */
export type Events = {
   "idea/brainstorm": {
      data: {
         ideaId: number;
         title: string;
         content: string;
         context?: string;
      };
   };
   "idea/brainstorm.completed": {
      data: {
         ideaId: number;
         result: string;
      };
   };
   "idea/brainstorm.failed": {
      data: {
         ideaId: number;
         error: string;
      };
   };
};
```

**Understanding the code:**

-  `id: "quiver"` — Unique identifier for your app in Inngest's system
-  `Events` type — Defines all events your app can send/receive
-  Event naming convention — `resource/action` (like REST, but for events)
-  The `.completed` and `.failed` events — Let us react to outcomes

### Step 7.3: Create the Brainstorm Function

Inngest functions are the workers that process your events. This function listens for `idea/brainstorm` events and calls Claude.

Create `src/lib/inngest-functions.ts`:

```typescript
import { inngest } from "./inngest";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

/**
 * Brainstorm function.
 *
 * This runs in the background when an "idea/brainstorm" event is sent.
 * Inngest handles retries, logging, and error reporting automatically.
 *
 * Why generateText instead of streamText?
 * Background functions can't stream to a browser. Instead, we generate
 * the full response, store it, and the frontend polls for completion.
 */
export const brainstormIdea = inngest.createFunction(
   {
      id: "brainstorm-idea",
      // Retry up to 3 times with exponential backoff
      retries: 3,
      // Only run 2 brainstorms at a time (prevents API rate limits)
      concurrency: {
         limit: 2,
      },
   },
   { event: "idea/brainstorm" },
   async ({ event, step }) => {
      const { ideaId, title, content, context } = event.data;

      /**
       * step.run() wraps operations that should be retried independently.
       *
       * If Claude fails but we already saved partial results, the retry
       * won't redo the saved work. This is "durable execution."
       */
      const result = await step.run("call-claude", async () => {
         const prompt = context
            ? `Here's an idea I want to brainstorm:

**Title:** ${title}
**Details:** ${content}

**Additional context:** ${context}

Please help me develop this idea.`
            : `Here's an idea I want to brainstorm:

**Title:** ${title}
**Details:** ${content}

Please help me develop this idea.`;

         const response = await generateText({
            model: anthropic("claude-haiku-4-5-20250514"),
            system: `You are a creative brainstorming assistant. Your role is to help expand and develop ideas.

When given an idea, you should:
1. Identify the core concept and what makes it interesting
2. Suggest 3-5 specific directions to explore
3. Ask 2-3 thought-provoking questions that deepen the idea
4. Offer one unexpected connection or angle

Be concise but insightful. Use bullet points for clarity.
Avoid generic advice—be specific to THIS idea.`,
            prompt,
         });

         return response.text;
      });

      /**
       * Send a completion event.
       *
       * This lets other parts of your system react to brainstorm completion.
       * For example, you could trigger a notification or update a cache.
       */
      await step.sendEvent("notify-completion", {
         name: "idea/brainstorm.completed",
         data: {
            ideaId,
            result,
         },
      });

      return { ideaId, result };
   }
);

/**
 * Export all functions for the serve handler.
 */
export const functions = [brainstormIdea];
```

**Understanding the code:**

-  `createFunction()` — Defines a function that Inngest will run
-  `id: "brainstorm-idea"` — Unique identifier for this function
-  `retries: 3` — If it fails, retry up to 3 times
-  `concurrency: { limit: 2 }` — Only 2 instances run simultaneously
-  `{ event: "idea/brainstorm" }` — Trigger: run when this event is received
-  `step.run()` — Durable execution: if this step succeeds, it won't re-run on retry
-  `step.sendEvent()` — Send another event (fan-out pattern)
-  `generateText` vs `streamText` — We use non-streaming because this runs in background

### Step 7.4: Create the Inngest Serve Handler

The serve handler exposes an HTTP endpoint that Inngest uses to invoke your functions.

Update `src/api/server.ts` to add the Inngest endpoint:

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "inngest/hono";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { inngest } from "../lib/inngest";
import { functions } from "../lib/inngest-functions";

const app = new Hono();

app.use("/*", cors());

/**
 * Inngest serve handler.
 *
 * This endpoint is called by Inngest to:
 * 1. Register your functions (on deploy)
 * 2. Invoke functions when events are sent
 * 3. Report function results back to Inngest
 *
 * The path "/api/inngest" is conventional but not required.
 */
app.on(
   ["GET", "POST", "PUT"],
   "/api/inngest",
   serve({
      client: inngest,
      functions,
   })
);

// ... rest of your existing endpoints (ideas CRUD, etc.)

/**
 * Start a brainstorm via Inngest.
 *
 * Instead of calling Claude directly, we send an event to Inngest.
 * This returns immediately—the actual work happens in the background.
 */
app.post("/api/brainstorm", async (c) => {
   const { ideaId, idea, context } = await c.req.json();

   // Send event to Inngest (returns immediately)
   await inngest.send({
      name: "idea/brainstorm",
      data: {
         ideaId,
         title: idea.title,
         content: idea.content,
         context,
      },
   });

   // Return immediately—brainstorm runs in background
   return c.json({
      status: "started",
      message: "Brainstorm started. Poll /api/brainstorm/:id for results.",
   });
});

/**
 * In-memory store for brainstorm results.
 *
 * In production, you'd store this in the database.
 * For now, we use a simple Map to demonstrate the pattern.
 */
const brainstormResults = new Map<
   number,
   {
      status: "pending" | "completed" | "failed";
      result?: string;
      error?: string;
   }
>();

/**
 * Event handler for brainstorm completion.
 *
 * When Inngest finishes a brainstorm, it sends a completion event.
 * We listen for this and store the result.
 */
app.post("/api/inngest/webhook", async (c) => {
   const event = await c.req.json();

   if (event.name === "idea/brainstorm.completed") {
      brainstormResults.set(event.data.ideaId, {
         status: "completed",
         result: event.data.result,
      });
   } else if (event.name === "idea/brainstorm.failed") {
      brainstormResults.set(event.data.ideaId, {
         status: "failed",
         error: event.data.error,
      });
   }

   return c.json({ received: true });
});

/**
 * Poll for brainstorm results.
 *
 * The frontend calls this repeatedly until the brainstorm completes.
 */
app.get("/api/brainstorm/:id", async (c) => {
   const ideaId = parseInt(c.req.param("id"));
   const result = brainstormResults.get(ideaId);

   if (!result) {
      return c.json({ status: "pending" });
   }

   // Clean up after returning completed result
   if (result.status !== "pending") {
      brainstormResults.delete(ideaId);
   }

   return c.json(result);
});

/**
 * Keep the original streaming endpoint for development/testing.
 * This bypasses Inngest and calls Claude directly.
 */
app.post("/api/brainstorm/stream", async (c) => {
   const { idea, context } = await c.req.json();

   const result = streamText({
      model: anthropic("claude-haiku-4-5-20250514"),
      system: `You are a creative brainstorming assistant...`, // Same as before
      messages: [
         {
            role: "user",
            content: context
               ? `Here's an idea I want to brainstorm:

**Title:** ${idea.title}
**Details:** ${idea.content}

**Additional context:** ${context}

Please help me develop this idea.`
               : `Here's an idea I want to brainstorm:

**Title:** ${idea.title}
**Details:** ${idea.content}

Please help me develop this idea.`,
         },
      ],
   });

   return result.toDataStreamResponse();
});

export default app;
```

**Understanding the architecture:**

1. `POST /api/brainstorm` — Sends event to Inngest, returns immediately
2. Inngest invokes `brainstormIdea` function in background
3. Function calls Claude, stores result, sends completion event
4. `GET /api/brainstorm/:id` — Frontend polls this for results
5. `POST /api/brainstorm/stream` — Original streaming endpoint (kept for comparison)

### Step 7.5: Update the Brainstorm Hook for Polling

The frontend now needs to poll for results instead of streaming. Update `src/hooks/useBrainstorm.ts`:

```typescript
import { useState, useCallback, useRef } from "react";

const API_URL = import.meta.env.DEV ? "http://localhost:3001" : "";

interface Idea {
   id: number;
   title: string;
   content: string;
}

/**
 * Hook for AI brainstorming with Inngest (polling).
 *
 * Flow:
 * 1. Send brainstorm request
 * 2. Server returns immediately (event sent to Inngest)
 * 3. Poll for results until complete
 *
 * Why polling instead of WebSockets?
 * - Simpler to implement
 * - Works with serverless (no persistent connections)
 * - Polling interval of 1s is fine for 5-10 second operations
 */
export function useBrainstorm() {
   const [isLoading, setIsLoading] = useState(false);
   const [result, setResult] = useState<string>("");
   const [error, setError] = useState<Error | null>(null);
   const pollIntervalRef = useRef<number | null>(null);

   /**
    * Stop polling.
    */
   const stopPolling = useCallback(() => {
      if (pollIntervalRef.current) {
         clearInterval(pollIntervalRef.current);
         pollIntervalRef.current = null;
      }
   }, []);

   /**
    * Poll for brainstorm results.
    */
   const pollForResults = useCallback(
      async (ideaId: number) => {
         const poll = async () => {
            try {
               const response = await fetch(
                  `${API_URL}/api/brainstorm/${ideaId}`
               );
               const data = await response.json();

               if (data.status === "completed") {
                  setResult(data.result);
                  setIsLoading(false);
                  stopPolling();
               } else if (data.status === "failed") {
                  setError(new Error(data.error || "Brainstorm failed"));
                  setIsLoading(false);
                  stopPolling();
               }
               // If status is "pending", keep polling
            } catch (err) {
               setError(
                  err instanceof Error ? err : new Error("Polling failed")
               );
               setIsLoading(false);
               stopPolling();
            }
         };

         // Poll every second
         pollIntervalRef.current = window.setInterval(poll, 1000);
         // Also poll immediately
         poll();
      },
      [stopPolling]
   );

   /**
    * Start a brainstorming session.
    */
   const brainstorm = useCallback(
      async (idea: Idea, context?: string) => {
         setIsLoading(true);
         setResult("");
         setError(null);
         stopPolling();

         try {
            const response = await fetch(`${API_URL}/api/brainstorm`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  ideaId: idea.id,
                  idea: { title: idea.title, content: idea.content },
                  context,
               }),
            });

            if (!response.ok) {
               throw new Error("Failed to start brainstorm");
            }

            // Start polling for results
            pollForResults(idea.id);
         } catch (err) {
            setError(
               err instanceof Error ? err : new Error("Failed to brainstorm")
            );
            setIsLoading(false);
         }
      },
      [pollForResults, stopPolling]
   );

   /**
    * Cancel the current brainstorm.
    */
   const cancel = useCallback(() => {
      stopPolling();
      setIsLoading(false);
   }, [stopPolling]);

   return {
      brainstorm,
      cancel,
      isLoading,
      result,
      error,
   };
}
```

**Understanding the polling approach:**

-  `pollIntervalRef` — Stores the interval ID so we can cancel it
-  `stopPolling()` — Cleans up the interval
-  `pollForResults()` — Checks `/api/brainstorm/:id` every second
-  `cancel()` — New function to stop a pending brainstorm

### Step 7.6: Run the Inngest Dev Server

Inngest needs its own dev server to receive events and invoke functions locally.

Update `package.json` scripts:

```json
{
   "scripts": {
      "dev": "bun run dev:all",
      "dev:client": "vite",
      "dev:api": "bun run --watch src/api/index.ts",
      "dev:inngest": "bunx inngest-cli@latest dev",
      "dev:all": "bun run dev:inngest & bun run dev:api & bun run dev:client",
      "build": "tsc -b && vite build",
      "preview": "vite preview"
   }
}
```

Now start everything:

```bash
bun run dev
```

You should see three servers starting:

1. **Inngest Dev Server** — Usually on port 8288
2. **Hono API Server** — On port 3001
3. **Vite Dev Server** — On port 5173

### Step 7.7: Explore the Inngest Dashboard

Open `http://localhost:8288` in your browser. This is the Inngest Dev Server UI.

**What you'll see:**

1. **Functions tab** — Lists all registered functions (`brainstorm-idea`)
2. **Events tab** — Shows all events sent to Inngest
3. **Runs tab** — Shows function executions with timing, status, and payloads

**Try it out:**

1. Create an idea in your app
2. Click "Brainstorm"
3. Watch the Inngest dashboard:
   -  An `idea/brainstorm` event appears in Events
   -  A `brainstorm-idea` run starts in Runs
   -  You can see the function's input, output, and duration
4. The result appears in your app after the function completes

**Checkpoint — Inngest working locally:**

-  [ ] Inngest dev server running on port 8288
-  [ ] Function registered in dashboard
-  [ ] Events appear when you trigger brainstorm
-  [ ] Runs show function execution details
-  [ ] Results poll back to the frontend

### Step 7.8: Test Retry Behavior

Let's verify that Inngest retries work. Temporarily break the function:

In `src/lib/inngest-functions.ts`, add a failure:

```typescript
const result = await step.run("call-claude", async () => {
   // Temporarily add this to test retries
   if (Math.random() > 0.3) {
      throw new Error("Simulated failure for testing");
   }

   // ... rest of the code
});
```

Now trigger a brainstorm. In the Inngest dashboard:

1. Watch the function fail
2. See it automatically retry (with increasing delays)
3. Eventually succeed (or fail after 3 retries)

**Remove the test code** after verifying retries work.

**Checkpoint — Retry behavior:**

-  [ ] Function fails intentionally
-  [ ] Dashboard shows retry attempts
-  [ ] Backoff delay increases between retries
-  [ ] Function eventually succeeds (or fails permanently)

### Step 7.9: Prepare for Production Deployment

In production on Vercel, Inngest works slightly differently:

1. **No local dev server** — Inngest Cloud receives events
2. **Vercel integration** — Handles authentication automatically
3. **Function registration** — Happens on deploy

**Set up Vercel + Inngest integration:**

1. Go to [Vercel Marketplace](https://vercel.com/integrations/inngest)
2. Click "Add Integration"
3. Select your project
4. Inngest creates an account and connects it to your Vercel project

**Environment variables** (set automatically by the integration):

-  `INNGEST_SIGNING_KEY` — Verifies requests are from Inngest
-  `INNGEST_EVENT_KEY` — Authenticates event sends

**Create Vercel API route for Inngest:**

Create `api/inngest.ts` (for Vercel serverless):

```typescript
import { serve } from "inngest/vercel";
import { inngest } from "../src/lib/inngest";
import { functions } from "../src/lib/inngest-functions";

/**
 * Vercel serverless function for Inngest.
 *
 * This replaces the Hono endpoint in production.
 * Inngest calls this to register and invoke functions.
 */
export const { GET, POST, PUT } = serve({
   client: inngest,
   functions,
});
```

### Step 7.10: Test Production Inngest Flow

After deploying (we'll do the full deployment in Milestone 10):

1. Open your Inngest Cloud dashboard at [app.inngest.com](https://app.inngest.com)
2. Verify your functions are registered
3. Trigger a brainstorm in your deployed app
4. Watch the event and function run in the cloud dashboard

**Checkpoint — Production-ready Inngest:**

-  [ ] Vercel integration installed
-  [ ] API route created for serverless
-  [ ] (After deployment) Functions appear in Inngest Cloud dashboard
-  [ ] Events flow through cloud infrastructure

**Milestone 7 Complete!** Your app now has production-grade background job processing:

-  Automatic retries with exponential backoff
-  Observability dashboard for debugging
-  Concurrency controls to prevent rate limits
-  Event-driven architecture for future extensibility
-  Works locally and in production

---

## Milestone 8: Tags and Filtering

**Goal:** Add the ability to tag ideas during creation and filter the list by tags.

**Why this matters:** As you capture more ideas, finding specific ones becomes harder. Tags provide:

1. **Organization** — Group related ideas (work, personal, project-x)
2. **Filtering** — Show only relevant ideas
3. **Context** — Quickly understand what an idea is about

We're implementing tags as a simple array stored in each idea (rather than a separate tags table) because:

-  Simpler data model
-  No JOIN queries needed
-  Fast enough for personal use (< 1000 ideas)

### Step 8.1: Create the TagInput Component

This component lets users add and remove tags with a good UX—type and press Enter to add, backspace to remove.

Create `src/components/TagInput.tsx`:

```tsx
import { useState, KeyboardEvent } from "react";

interface TagInputProps {
   tags: string[];
   onChange: (tags: string[]) => void;
   placeholder?: string;
}

/**
 * Tag input component with keyboard navigation.
 *
 * UX features:
 * - Press Enter or comma to add a tag
 * - Press Backspace on empty input to remove last tag
 * - Tags are normalized (lowercase, trimmed)
 * - Duplicate tags are prevented
 */
export function TagInput({
   tags,
   onChange,
   placeholder = "Add tags...",
}: TagInputProps) {
   const [input, setInput] = useState("");

   const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      // Add tag on Enter or comma
      if (e.key === "Enter" || e.key === ",") {
         e.preventDefault();
         const newTag = input.trim().toLowerCase();

         // Validate: non-empty and not duplicate
         if (newTag && !tags.includes(newTag)) {
            onChange([...tags, newTag]);
         }
         setInput("");
      }

      // Remove last tag on Backspace with empty input
      if (e.key === "Backspace" && !input && tags.length > 0) {
         onChange(tags.slice(0, -1));
      }
   };

   const removeTag = (tagToRemove: string) => {
      onChange(tags.filter((tag) => tag !== tagToRemove));
   };

   return (
      <div
         className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg
                    focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent
                    bg-white"
      >
         {/* Existing tags */}
         {tags.map((tag) => (
            <span
               key={tag}
               className="inline-flex items-center gap-1 px-2.5 py-1
                     bg-primary text-white text-sm rounded-full"
            >
               {tag}
               <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-white/70 hover:text-white"
                  aria-label={`Remove ${tag} tag`}
               >
                  ×
               </button>
            </span>
         ))}

         {/* Input for new tags */}
         <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[100px] outline-none bg-transparent text-sm py-1"
         />
      </div>
   );
}
```

**UX details:**

-  `focus-within:` — Tailwind variant that applies styles when any child has focus
-  Tags are shown inline with the input for a seamless feel
-  Placeholder only shows when no tags exist
-  Keyboard-driven: Enter to add, Backspace to remove

### Step 8.2: Update IdeaForm to Include Tags

Update `src/components/IdeaForm.tsx`:

```tsx
import { useState, FormEvent } from "react";
import { TagInput } from "./TagInput";

interface IdeaFormProps {
   onSubmit: (title: string, content: string, tags: string[]) => Promise<void>;
}

export function IdeaForm({ onSubmit }: IdeaFormProps) {
   const [title, setTitle] = useState("");
   const [content, setContent] = useState("");
   const [tags, setTags] = useState<string[]>([]);
   const [submitting, setSubmitting] = useState(false);

   const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !content.trim()) return;

      setSubmitting(true);
      try {
         await onSubmit(title.trim(), content.trim(), tags);
         // Clear form on success
         setTitle("");
         setContent("");
         setTags([]);
      } finally {
         setSubmitting(false);
      }
   };

   const isValid = title.trim() && content.trim();

   return (
      <form onSubmit={handleSubmit} className="space-y-4">
         {/* Title */}
         <div>
            <label
               htmlFor="title"
               className="block text-sm font-medium text-gray-700 mb-1"
            >
               Title
            </label>
            <input
               id="title"
               type="text"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               placeholder="What's your idea?"
               disabled={submitting}
               required
               className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     transition-colors"
            />
         </div>

         {/* Content */}
         <div>
            <label
               htmlFor="content"
               className="block text-sm font-medium text-gray-700 mb-1"
            >
               Details
            </label>
            <textarea
               id="content"
               value={content}
               onChange={(e) => setContent(e.target.value)}
               placeholder="Describe your idea in detail..."
               rows={4}
               disabled={submitting}
               required
               className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     transition-colors"
            />
         </div>

         {/* Tags */}
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
               Tags
            </label>
            <TagInput
               tags={tags}
               onChange={setTags}
               placeholder="Type and press Enter to add tags"
            />
            <p className="mt-1 text-xs text-gray-500">
               Press Enter or comma to add, Backspace to remove
            </p>
         </div>

         {/* Submit */}
         <button
            type="submit"
            disabled={submitting || !isValid}
            className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg
                   hover:bg-primary-hover
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
         >
            {submitting ? "Saving..." : "Save Idea"}
         </button>
      </form>
   );
}
```

### Step 8.3: Create the FilterBar Component

This component shows all available tags and lets users filter by them.

Create `src/components/FilterBar.tsx`:

```tsx
interface FilterBarProps {
   allTags: string[];
   selectedTags: string[];
   onTagToggle: (tag: string) => void;
   showArchived: boolean;
   onToggleArchived: () => void;
}

/**
 * Filter bar for narrowing down the ideas list.
 *
 * Features:
 * - Filter by one or more tags (OR logic)
 * - Toggle to show/hide archived ideas
 * - Only shows when there are tags to filter by
 */
export function FilterBar({
   allTags,
   selectedTags,
   onTagToggle,
   showArchived,
   onToggleArchived,
}: FilterBarProps) {
   // Don't render if there are no tags
   if (allTags.length === 0) return null;

   return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
         {/* Tag filters */}
         <div className="mb-3">
            <span className="text-sm font-medium text-gray-700 mr-3">
               Filter by tag:
            </span>
            <div className="inline-flex flex-wrap gap-2 mt-2">
               {allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                     <button
                        key={tag}
                        onClick={() => onTagToggle(tag)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors
                           ${
                              isSelected
                                 ? "bg-primary text-white border-primary"
                                 : "bg-white text-gray-600 border-gray-300 hover:border-primary"
                           }`}
                     >
                        {tag}
                     </button>
                  );
               })}

               {/* Clear filters button */}
               {selectedTags.length > 0 && (
                  <button
                     onClick={() => selectedTags.forEach(onTagToggle)}
                     className="px-3 py-1 text-sm text-gray-500 underline
                         hover:text-gray-700"
                  >
                     Clear filters
                  </button>
               )}
            </div>
         </div>

         {/* Archived toggle */}
         <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
               type="checkbox"
               checked={showArchived}
               onChange={onToggleArchived}
               className="w-4 h-4 text-primary rounded border-gray-300
                     focus:ring-primary cursor-pointer"
            />
            <span className="text-sm text-gray-600">Show archived ideas</span>
         </label>
      </div>
   );
}
```

### Step 8.4: Update the useIdeas Hook with Filtering

Update `src/hooks/useIdeas.ts` to add filtering logic:

```typescript
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Idea } from "../lib/schema";
import * as sync from "../lib/sync";

export function useIdeas() {
   const [ideas, setIdeas] = useState<Idea[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<Error | null>(null);
   const [syncing, setSyncing] = useState(false);

   // Filter state
   const [selectedTags, setSelectedTags] = useState<string[]>([]);
   const [showArchived, setShowArchived] = useState(false);

   const fetchIdeas = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);
         const data = await sync.fetchAndCacheIdeas();
         setIdeas(data);
      } catch (err) {
         setError(
            err instanceof Error ? err : new Error("Failed to fetch ideas")
         );
      } finally {
         setLoading(false);
      }
   }, []);

   const syncChanges = useCallback(async () => {
      if (syncing) return;
      setSyncing(true);
      try {
         const result = await sync.syncToRemote();
         if (result.success && result.synced > 0) {
            await fetchIdeas();
         }
      } finally {
         setSyncing(false);
      }
   }, [syncing, fetchIdeas]);

   useEffect(() => {
      fetchIdeas();
   }, [fetchIdeas]);

   useEffect(() => {
      const handleOnline = () => syncChanges();
      window.addEventListener("online", handleOnline);
      return () => window.removeEventListener("online", handleOnline);
   }, [syncChanges]);

   /**
    * Extract all unique tags from all ideas.
    * useMemo ensures this is only recalculated when ideas change.
    */
   const allTags = useMemo(() => {
      const tagSet = new Set<string>();
      ideas.forEach((idea) => {
         idea.tags?.forEach((tag) => tagSet.add(tag));
      });
      return Array.from(tagSet).sort();
   }, [ideas]);

   /**
    * Filter ideas based on selected tags and archived state.
    *
    * Logic:
    * - If no tags selected, show all ideas
    * - If tags selected, show ideas that have ANY selected tag (OR logic)
    * - Archived filter applies on top
    */
   const filteredIdeas = useMemo(() => {
      return ideas.filter((idea) => {
         // Filter by archived state
         if (!showArchived && idea.archived) return false;

         // Filter by tags (OR logic)
         if (selectedTags.length > 0) {
            const ideaTags = idea.tags || [];
            const hasSelectedTag = selectedTags.some((tag) =>
               ideaTags.includes(tag)
            );
            if (!hasSelectedTag) return false;
         }

         return true;
      });
   }, [ideas, selectedTags, showArchived]);

   /**
    * Toggle a tag in the filter.
    */
   const toggleTag = (tag: string) => {
      setSelectedTags((prev) =>
         prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      );
   };

   const createIdea = async (
      title: string,
      content: string,
      tags: string[] = []
   ) => {
      const newIdea = await sync.createIdeaOfflineFirst({
         title,
         content,
         tags,
      });
      setIdeas((prev) => [newIdea, ...prev]);
      return newIdea;
   };

   const deleteIdea = async (id: number) => {
      await sync.deleteIdeaOfflineFirst(id);
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
   };

   const archiveIdea = async (id: number) => {
      const updated = await sync.archiveIdeaOfflineFirst(id);
      if (updated) {
         setIdeas((prev) =>
            prev.map((idea) => (idea.id === id ? updated : idea))
         );
      }
      return updated;
   };

   return {
      // Use filtered ideas for display
      ideas: filteredIdeas,
      // Also expose all ideas for other purposes
      allIdeas: ideas,
      loading,
      error,
      syncing,

      // Tag filter
      allTags,
      selectedTags,
      toggleTag,

      // Archived filter
      showArchived,
      toggleArchived: () => setShowArchived((prev) => !prev),

      // Actions
      createIdea,
      deleteIdea,
      archiveIdea,
      refetch: fetchIdeas,
      sync: syncChanges,
   };
}
```

**Key additions:**

-  `allTags` — Computed list of all unique tags across all ideas
-  `filteredIdeas` — Ideas filtered by selected tags and archived state
-  `toggleTag` — Toggle a tag in the filter selection
-  `useMemo` — Ensures filtering only recalculates when dependencies change

### Step 8.5: Update IdeaList for Filtering

Update `src/components/IdeaList.tsx`:

```tsx
import type { Idea } from "../lib/schema";
import { IdeaCard } from "./IdeaCard";

interface IdeaListProps {
   ideas: Idea[];
   loading: boolean;
   error: Error | null;
   onDelete: (id: number) => Promise<void>;
   onArchive: (id: number) => Promise<void>;
}

export function IdeaList({
   ideas,
   loading,
   error,
   onDelete,
   onArchive,
}: IdeaListProps) {
   if (loading) {
      return (
         <div className="text-center py-12 text-gray-500">Loading ideas...</div>
      );
   }

   if (error) {
      return (
         <div className="text-center py-12 text-red-600">
            Error: {error.message}
         </div>
      );
   }

   if (ideas.length === 0) {
      return (
         <div className="text-center py-12 text-gray-500">
            <p>No ideas match your filters.</p>
            <p className="mt-1">Try adjusting filters or create a new idea!</p>
         </div>
      );
   }

   return (
      <div>
         <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ideas ({ideas.length})
         </h2>
         <div className="space-y-4">
            {ideas.map((idea) => (
               <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onDelete={onDelete}
                  onArchive={onArchive}
               />
            ))}
         </div>
      </div>
   );
}
```

Note: We've simplified this to not separate active/archived since the filter controls that now.

### Step 8.6: Update App.tsx with FilterBar

Update `src/App.tsx`:

```tsx
import { useIdeas } from "./hooks/useIdeas";
import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";
import { FilterBar } from "./components/FilterBar";
import { OfflineIndicator } from "./components/OfflineIndicator";

function App() {
   const {
      ideas,
      loading,
      error,
      syncing,
      allTags,
      selectedTags,
      toggleTag,
      showArchived,
      toggleArchived,
      createIdea,
      deleteIdea,
      archiveIdea,
   } = useIdeas();

   const handleCreateIdea = async (
      title: string,
      content: string,
      tags: string[]
   ) => {
      await createIdea(title, content, tags);
   };

   return (
      <div className="min-h-screen bg-gray-50 pb-16">
         <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
               {syncing && (
                  <p className="mt-1 text-sm text-primary animate-pulse">
                     Syncing...
                  </p>
               )}
            </header>

            <main className="space-y-6">
               {/* Idea capture form */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                     New Idea
                  </h2>
                  <IdeaForm onSubmit={handleCreateIdea} />
               </section>

               {/* Filter bar */}
               <FilterBar
                  allTags={allTags}
                  selectedTags={selectedTags}
                  onTagToggle={toggleTag}
                  showArchived={showArchived}
                  onToggleArchived={toggleArchived}
               />

               {/* Ideas list */}
               <section>
                  <IdeaList
                     ideas={ideas}
                     loading={loading}
                     error={error}
                     onDelete={deleteIdea}
                     onArchive={archiveIdea}
                  />
               </section>
            </main>
         </div>

         <OfflineIndicator />
      </div>
   );
}

export default App;
```

### Step 8.7: Test Tags and Filtering

```bash
bun run dev
```

**Checkpoint — Test tag creation:**

1. Create an idea with tags (e.g., "work", "project")
2. ✓ Tags should appear on the idea card
3. ✓ Tags should appear in the filter bar

**Checkpoint — Test filtering:**

1. Create ideas with different tags
2. Click a tag in the filter bar
3. ✓ Only ideas with that tag should show
4. Click another tag
5. ✓ Ideas with either tag should show (OR logic)
6. Click "Clear filters"
7. ✓ All ideas should show again

**Checkpoint — Test archived filter:**

1. Archive an idea
2. ✓ It should disappear from the list
3. Check "Show archived ideas"
4. ✓ The archived idea should reappear (with reduced opacity)

**Milestone 8 Complete!** Your app now has organization features:

-  Tags can be added when creating ideas
-  Filter bar shows all available tags
-  Click to filter by one or more tags
-  Toggle to show/hide archived ideas

---

<!-- SPLIT_OUTPUT: 08-search-and-filtering -->

## Milestone 9: Search

**Goal:** Add full-text search across idea titles and content.

**Why this matters:** Tags are great for categorical filtering, but sometimes you remember a word or phrase from an idea, not its tags. Search provides:

1. **Quick access** — Find ideas by any word they contain
2. **Discovery** — Surface forgotten ideas when searching for related concepts
3. **Flexibility** — Works alongside tag filtering

We're implementing client-side search because:

-  Data is already loaded (we have offline-first architecture)
-  No server round-trip needed
-  Works offline
-  Fast enough for hundreds of ideas

For thousands of ideas, you'd want server-side full-text search (SQLite FTS5).

### Step 9.1: Create the SearchBar Component

Create `src/components/SearchBar.tsx`:

```tsx
import { useState, useEffect, useRef } from "react";

interface SearchBarProps {
   onSearch: (query: string) => void;
   placeholder?: string;
}

/**
 * Search input with debouncing.
 *
 * Why debounce?
 * - Prevents filtering on every keystroke (which can feel laggy)
 * - Waits for user to pause typing, then filters
 * - 300ms is a good balance between responsiveness and performance
 */
export function SearchBar({
   onSearch,
   placeholder = "Search ideas...",
}: SearchBarProps) {
   const [query, setQuery] = useState("");
   const debounceRef = useRef<ReturnType<typeof setTimeout>>();

   // Debounce search
   useEffect(() => {
      // Clear any existing timeout
      if (debounceRef.current) {
         clearTimeout(debounceRef.current);
      }

      // Set new timeout
      debounceRef.current = setTimeout(() => {
         onSearch(query);
      }, 300);

      // Cleanup on unmount
      return () => {
         if (debounceRef.current) {
            clearTimeout(debounceRef.current);
         }
      };
   }, [query, onSearch]);

   return (
      <div className="relative">
         {/* Search icon */}
         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
               className="h-5 w-5 text-gray-400"
               fill="none"
               stroke="currentColor"
               viewBox="0 0 24 24"
            >
               <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
               />
            </svg>
         </div>

         {/* Input */}
         <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg
                   bg-white shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                   transition-colors"
            aria-label="Search ideas"
         />

         {/* Clear button */}
         {query && (
            <button
               onClick={() => setQuery("")}
               className="absolute inset-y-0 right-0 pr-3 flex items-center
                     text-gray-400 hover:text-gray-600"
               aria-label="Clear search"
            >
               <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
               >
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     strokeWidth={2}
                     d="M6 18L18 6M6 6l12 12"
                  />
               </svg>
            </button>
         )}
      </div>
   );
}
```

**Understanding debouncing:**

Without debouncing, if a user types "project", we'd search for:

-  "p"
-  "pr"
-  "pro"
-  "proj"
-  "proje"
-  "projec"
-  "project"

That's 7 searches for one word! With debouncing, we wait 300ms after the user stops typing, then search once for "project".

### Step 9.2: Update useIdeas with Search

Update `src/hooks/useIdeas.ts` to add search:

```typescript
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Idea } from "../lib/schema";
import * as sync from "../lib/sync";

export function useIdeas() {
   const [ideas, setIdeas] = useState<Idea[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<Error | null>(null);
   const [syncing, setSyncing] = useState(false);

   // Filter state
   const [selectedTags, setSelectedTags] = useState<string[]>([]);
   const [showArchived, setShowArchived] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");

   const fetchIdeas = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);
         const data = await sync.fetchAndCacheIdeas();
         setIdeas(data);
      } catch (err) {
         setError(
            err instanceof Error ? err : new Error("Failed to fetch ideas")
         );
      } finally {
         setLoading(false);
      }
   }, []);

   const syncChanges = useCallback(async () => {
      if (syncing) return;
      setSyncing(true);
      try {
         const result = await sync.syncToRemote();
         if (result.success && result.synced > 0) {
            await fetchIdeas();
         }
      } finally {
         setSyncing(false);
      }
   }, [syncing, fetchIdeas]);

   useEffect(() => {
      fetchIdeas();
   }, [fetchIdeas]);

   useEffect(() => {
      const handleOnline = () => syncChanges();
      window.addEventListener("online", handleOnline);
      return () => window.removeEventListener("online", handleOnline);
   }, [syncChanges]);

   // Extract all unique tags
   const allTags = useMemo(() => {
      const tagSet = new Set<string>();
      ideas.forEach((idea) => {
         idea.tags?.forEach((tag) => tagSet.add(tag));
      });
      return Array.from(tagSet).sort();
   }, [ideas]);

   /**
    * Filter ideas based on search, tags, and archived state.
    *
    * Search looks at:
    * - Title (case-insensitive)
    * - Content (case-insensitive)
    * - Tags (case-insensitive)
    */
   const filteredIdeas = useMemo(() => {
      return ideas.filter((idea) => {
         // Filter by archived state
         if (!showArchived && idea.archived) return false;

         // Filter by search query
         if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesTitle = idea.title.toLowerCase().includes(query);
            const matchesContent = idea.content.toLowerCase().includes(query);
            const matchesTags = idea.tags?.some((tag) =>
               tag.toLowerCase().includes(query)
            );

            if (!matchesTitle && !matchesContent && !matchesTags) {
               return false;
            }
         }

         // Filter by tags (OR logic)
         if (selectedTags.length > 0) {
            const ideaTags = idea.tags || [];
            const hasSelectedTag = selectedTags.some((tag) =>
               ideaTags.includes(tag)
            );
            if (!hasSelectedTag) return false;
         }

         return true;
      });
   }, [ideas, selectedTags, showArchived, searchQuery]);

   const toggleTag = (tag: string) => {
      setSelectedTags((prev) =>
         prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      );
   };

   const createIdea = async (
      title: string,
      content: string,
      tags: string[] = []
   ) => {
      const newIdea = await sync.createIdeaOfflineFirst({
         title,
         content,
         tags,
      });
      setIdeas((prev) => [newIdea, ...prev]);
      return newIdea;
   };

   const deleteIdea = async (id: number) => {
      await sync.deleteIdeaOfflineFirst(id);
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
   };

   const archiveIdea = async (id: number) => {
      const updated = await sync.archiveIdeaOfflineFirst(id);
      if (updated) {
         setIdeas((prev) =>
            prev.map((idea) => (idea.id === id ? updated : idea))
         );
      }
      return updated;
   };

   return {
      ideas: filteredIdeas,
      allIdeas: ideas,
      loading,
      error,
      syncing,

      // Search
      searchQuery,
      setSearchQuery,

      // Tag filter
      allTags,
      selectedTags,
      toggleTag,

      // Archived filter
      showArchived,
      toggleArchived: () => setShowArchived((prev) => !prev),

      // Actions
      createIdea,
      deleteIdea,
      archiveIdea,
      refetch: fetchIdeas,
      sync: syncChanges,
   };
}
```

### Step 9.3: Add SearchBar to App.tsx

Update `src/App.tsx`:

```tsx
import { useIdeas } from "./hooks/useIdeas";
import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";
import { FilterBar } from "./components/FilterBar";
import { SearchBar } from "./components/SearchBar";
import { OfflineIndicator } from "./components/OfflineIndicator";

function App() {
   const {
      ideas,
      loading,
      error,
      syncing,
      searchQuery,
      setSearchQuery,
      allTags,
      selectedTags,
      toggleTag,
      showArchived,
      toggleArchived,
      createIdea,
      deleteIdea,
      archiveIdea,
   } = useIdeas();

   const handleCreateIdea = async (
      title: string,
      content: string,
      tags: string[]
   ) => {
      await createIdea(title, content, tags);
   };

   return (
      <div className="min-h-screen bg-gray-50 pb-16">
         <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
               {syncing && (
                  <p className="mt-1 text-sm text-primary animate-pulse">
                     Syncing...
                  </p>
               )}
            </header>

            <main className="space-y-6">
               {/* Idea capture form */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                     New Idea
                  </h2>
                  <IdeaForm onSubmit={handleCreateIdea} />
               </section>

               {/* Search */}
               <SearchBar
                  onSearch={setSearchQuery}
                  placeholder="Search ideas by title, content, or tag..."
               />

               {/* Filter bar */}
               <FilterBar
                  allTags={allTags}
                  selectedTags={selectedTags}
                  onTagToggle={toggleTag}
                  showArchived={showArchived}
                  onToggleArchived={toggleArchived}
               />

               {/* Ideas list */}
               <section>
                  <IdeaList
                     ideas={ideas}
                     loading={loading}
                     error={error}
                     onDelete={deleteIdea}
                     onArchive={archiveIdea}
                  />
               </section>
            </main>
         </div>

         <OfflineIndicator />
      </div>
   );
}

export default App;
```

### Step 9.4: Test Search

```bash
bun run dev
```

**Checkpoint — Test search functionality:**

1. Create several ideas with different words
2. Type part of a title in the search bar
3. ✓ Only matching ideas should appear
4. Type part of an idea's content
5. ✓ Ideas with that content should appear
6. Type a tag name
7. ✓ Ideas with that tag should appear
8. Clear the search
9. ✓ All ideas should reappear

**Checkpoint — Test search + filters combined:**

1. Search for a word
2. Also click a tag filter
3. ✓ Results should match BOTH search AND tag
4. Clear search, keep tag filter
5. ✓ Results should only be filtered by tag

**Milestone 9 Complete!** Your app now has search:

-  Type to search across titles, content, and tags
-  Debounced for smooth performance
-  Works alongside tag and archived filters
-  Works offline (searches local cache)

---

<!-- SPLIT_OUTPUT: 09-deployment-to-vercel -->

## Milestone 10: Deployment to Vercel

**Goal:** Deploy the application to production.

**Why Vercel?** It's the simplest way to deploy a Vite app:

-  Automatic builds on git push
-  Free SSL certificates
-  Global CDN
-  Serverless functions for the API
-  Free tier is generous for personal projects

### Step 10.1: Create Vercel API Routes

For production, we need to restructure our API to work with Vercel's serverless functions. Create `api/brainstorm.ts` in your project root (not in `src/`):

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export const config = {
   runtime: "edge", // Use edge runtime for faster cold starts
};

export default async function handler(req: Request) {
   // Only allow POST
   if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
   }

   try {
      const { idea, context } = await req.json();

      const result = streamText({
         model: anthropic("claude-haiku-4-5-20250514"),
         system: `You are a creative brainstorming assistant. Your role is to help expand and develop ideas.

When given an idea, you should:
1. Identify the core concept and what makes it interesting
2. Suggest 3-5 specific directions to explore
3. Ask 2-3 thought-provoking questions that deepen the idea
4. Offer one unexpected connection or angle

Be concise but insightful. Use bullet points for clarity.
Avoid generic advice—be specific to THIS idea.`,
         messages: [
            {
               role: "user",
               content: context
                  ? `Here's an idea I want to brainstorm:

**Title:** ${idea.title}
**Details:** ${idea.content}

**Additional context:** ${context}

Please help me develop this idea.`
                  : `Here's an idea I want to brainstorm:

**Title:** ${idea.title}
**Details:** ${idea.content}

Please help me develop this idea.`,
            },
         ],
      });

      return result.toDataStreamResponse();
   } catch (error) {
      console.error("Brainstorm error:", error);
      return new Response("Internal server error", { status: 500 });
   }
}
```

### Step 10.2: Update the Brainstorm Hook for Production

Update `src/hooks/useBrainstorm.ts` to use the correct API URL:

```typescript
import { useState, useCallback } from "react";

// In development, use the local Hono server
// In production, use Vercel's API routes (relative URL)
const API_URL = import.meta.env.DEV ? "http://localhost:3001" : "";

interface Idea {
   title: string;
   content: string;
}

export function useBrainstorm() {
   const [isLoading, setIsLoading] = useState(false);
   const [result, setResult] = useState<string>("");
   const [error, setError] = useState<Error | null>(null);

   const brainstorm = useCallback(async (idea: Idea, context?: string) => {
      setIsLoading(true);
      setResult("");
      setError(null);

      try {
         const response = await fetch(`${API_URL}/api/brainstorm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idea, context }),
         });

         if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
         }

         const reader = response.body?.getReader();
         if (!reader) throw new Error("No response body");

         const decoder = new TextDecoder();
         let fullText = "";

         while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
               if (line.startsWith("0:")) {
                  try {
                     const text = JSON.parse(line.slice(2));
                     fullText += text;
                     setResult(fullText);
                  } catch {
                     // Skip malformed lines
                  }
               }
            }
         }
      } catch (err) {
         setError(err instanceof Error ? err : new Error("Brainstorm failed"));
      } finally {
         setIsLoading(false);
      }
   }, []);

   const reset = useCallback(() => {
      setResult("");
      setError(null);
   }, []);

   return { brainstorm, isLoading, result, error, reset };
}
```

### Step 10.3: Create Vercel Configuration

Create `vercel.json` in the project root:

```json
{
   "buildCommand": "bun run build",
   "installCommand": "bun install",
   "framework": "vite"
}
```

### Step 10.4: Deploy to Vercel

If you haven't already, install the Vercel CLI:

```bash
bun add -g vercel
```

Login and deploy:

```bash
# Login (opens browser)
vercel login

# Deploy
vercel
```

Vercel will ask:

-  **Set up and deploy?** Yes
-  **Which scope?** Select your account
-  **Link to existing project?** No (create new)
-  **Project name:** quiver (or your choice)
-  **Directory:** ./ (current)
-  **Build settings:** Auto-detected (press Enter)

### Step 10.5: Set Environment Variables

In the Vercel dashboard (vercel.com):

1. Go to your project → Settings → Environment Variables
2. Add these variables:

   -  `VITE_TURSO_DATABASE_URL`: Your Turso URL
   -  `VITE_TURSO_AUTH_TOKEN`: Your Turso token
   -  `ANTHROPIC_API_KEY`: Your Anthropic API key

3. Make sure to select all environments (Production, Preview, Development)

### Step 10.6: Redeploy

After setting environment variables, redeploy:

```bash
vercel --prod
```

**Checkpoint — Test production deployment:**

1. Open your Vercel URL (e.g., `https://quiver-xxx.vercel.app`)
2. ✓ The app should load with your existing ideas
3. Create a new idea
4. ✓ It should save and persist
5. Click Brainstorm on an idea
6. ✓ AI should respond (uses Vercel Edge Function)
7. Test offline (airplane mode on your phone)
8. ✓ App should still open from home screen

**Checkpoint — Install as PWA:**

1. On your phone, visit your Vercel URL
2. iOS: Safari → Share → Add to Home Screen
3. Android: Chrome → Menu → Add to Home Screen
4. ✓ App icon should appear on home screen
5. ✓ Opening it should launch in standalone mode (no browser UI)

**Milestone 10 Complete!** Your app is now deployed:

-  Live on Vercel's global CDN
-  SSL enabled by default
-  API routes work as serverless functions
-  Environment variables securely stored
-  Installable as PWA from production URL

---

<!-- SPLIT_OUTPUT: 10-polish-and-production-readiness -->

## Milestone 11: Polish and Production Readiness

**Goal:** Add finishing touches for a production-quality experience.

**Why this matters:** The difference between a prototype and a product is in the details. Loading states, error handling, and keyboard shortcuts make your app feel professional and trustworthy.

### Step 11.1: Add Loading Skeletons

Skeletons provide visual feedback during loading, reducing perceived wait time.

Create `src/components/Skeleton.tsx`:

```tsx
/**
 * Skeleton component for loading states.
 *
 * Why skeletons instead of spinners?
 * - Reduce layout shift (skeletons match content shape)
 * - Feel faster (users see content "loading" not "waiting")
 * - More informative (shows what's coming)
 */
export function IdeaSkeleton() {
   return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 animate-pulse">
         {/* Header skeleton */}
         <div className="flex justify-between items-start gap-4 mb-3">
            <div className="h-6 bg-gray-200 rounded w-3/5" />
            <div className="h-4 bg-gray-200 rounded w-20" />
         </div>

         {/* Content skeleton */}
         <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
         </div>

         {/* Tags skeleton */}
         <div className="flex gap-2 mb-4">
            <div className="h-6 bg-gray-200 rounded-full w-16" />
            <div className="h-6 bg-gray-200 rounded-full w-20" />
         </div>

         {/* Actions skeleton */}
         <div className="flex justify-end gap-2">
            <div className="h-8 bg-gray-200 rounded w-24" />
            <div className="h-8 bg-gray-200 rounded w-20" />
         </div>
      </div>
   );
}

export function IdeasLoadingSkeleton() {
   return (
      <div className="space-y-4">
         <IdeaSkeleton />
         <IdeaSkeleton />
         <IdeaSkeleton />
      </div>
   );
}
```

Update `src/components/IdeaList.tsx` to use skeletons:

```tsx
import type { Idea } from "../lib/schema";
import { IdeaCard } from "./IdeaCard";
import { IdeasLoadingSkeleton } from "./Skeleton";

interface IdeaListProps {
   ideas: Idea[];
   loading: boolean;
   error: Error | null;
   onDelete: (id: number) => Promise<void>;
   onArchive: (id: number) => Promise<void>;
}

export function IdeaList({
   ideas,
   loading,
   error,
   onDelete,
   onArchive,
}: IdeaListProps) {
   if (loading) {
      return <IdeasLoadingSkeleton />;
   }

   if (error) {
      return (
         <div className="text-center py-12">
            <div
               className="inline-flex items-center justify-center w-12 h-12 mb-4
                        bg-red-100 rounded-full"
            >
               <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
               >
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     strokeWidth={2}
                     d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
               </svg>
            </div>
            <p className="text-red-600 font-medium">Something went wrong</p>
            <p className="text-gray-500 mt-1">{error.message}</p>
         </div>
      );
   }

   if (ideas.length === 0) {
      return (
         <div className="text-center py-12">
            <div
               className="inline-flex items-center justify-center w-12 h-12 mb-4
                        bg-gray-100 rounded-full"
            >
               <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
               >
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     strokeWidth={2}
                     d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
               </svg>
            </div>
            <p className="text-gray-900 font-medium">No ideas yet</p>
            <p className="text-gray-500 mt-1">Create your first idea above!</p>
         </div>
      );
   }

   return (
      <div>
         <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ideas ({ideas.length})
         </h2>
         <div className="space-y-4">
            {ideas.map((idea) => (
               <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onDelete={onDelete}
                  onArchive={onArchive}
               />
            ))}
         </div>
      </div>
   );
}
```

### Step 11.2: Add Error Boundary

Error boundaries catch JavaScript errors and display a fallback UI.

Create `src/components/ErrorBoundary.tsx`:

```tsx
import { Component, ReactNode } from "react";

interface Props {
   children: ReactNode;
}

interface State {
   hasError: boolean;
   error?: Error;
}

/**
 * Error boundary catches render errors and shows a fallback UI.
 *
 * Without this, a single error crashes the entire app.
 * With this, users see a helpful message and can recover.
 */
export class ErrorBoundary extends Component<Props, State> {
   constructor(props: Props) {
      super(props);
      this.state = { hasError: false };
   }

   static getDerivedStateFromError(error: Error): State {
      return { hasError: true, error };
   }

   render() {
      if (this.state.hasError) {
         return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                  <div
                     className="inline-flex items-center justify-center w-16 h-16 mb-6
                            bg-red-100 rounded-full"
                  >
                     <svg
                        className="w-8 h-8 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                     >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth={2}
                           d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                     </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                     Something went wrong
                  </h2>
                  <p className="text-gray-600 mb-6">
                     {this.state.error?.message ||
                        "An unexpected error occurred"}
                  </p>
                  <button
                     onClick={() => window.location.reload()}
                     className="px-6 py-3 bg-primary text-white font-medium rounded-lg
                         hover:bg-primary-hover transition-colors"
                  >
                     Reload App
                  </button>
               </div>
            </div>
         );
      }

      return this.props.children;
   }
}
```

Wrap your app in `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
   <StrictMode>
      <ErrorBoundary>
         <App />
      </ErrorBoundary>
   </StrictMode>
);
```

### Step 11.3: Add Keyboard Shortcuts

Power users love keyboard shortcuts. Let's add a few useful ones.

Create `src/hooks/useKeyboardShortcuts.ts`:

```typescript
import { useEffect } from "react";

interface Shortcuts {
   [key: string]: () => void;
}

/**
 * Hook for registering keyboard shortcuts.
 *
 * Key format examples:
 * - '/' — Forward slash
 * - 'cmd+k' — Cmd/Ctrl + K
 * - 'cmd+shift+p' — Cmd/Ctrl + Shift + P
 */
export function useKeyboardShortcuts(shortcuts: Shortcuts) {
   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         // Don't trigger shortcuts when typing in inputs
         const target = e.target as HTMLElement;
         if (
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
         ) {
            return;
         }

         // Build the key string
         const parts: string[] = [];
         if (e.metaKey || e.ctrlKey) parts.push("cmd");
         if (e.shiftKey) parts.push("shift");
         if (e.altKey) parts.push("alt");
         parts.push(e.key.toLowerCase());

         const key = parts.join("+");

         // Check if we have a handler
         if (shortcuts[key]) {
            e.preventDefault();
            shortcuts[key]();
         }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
   }, [shortcuts]);
}
```

Add shortcuts to `App.tsx`:

```tsx
import { useRef, useMemo } from "react";
import { useIdeas } from "./hooks/useIdeas";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";
import { FilterBar } from "./components/FilterBar";
import { SearchBar } from "./components/SearchBar";
import { OfflineIndicator } from "./components/OfflineIndicator";

function App() {
   const searchRef = useRef<HTMLInputElement>(null);

   const {
      ideas,
      loading,
      error,
      syncing,
      searchQuery,
      setSearchQuery,
      allTags,
      selectedTags,
      toggleTag,
      showArchived,
      toggleArchived,
      createIdea,
      deleteIdea,
      archiveIdea,
      sync,
   } = useIdeas();

   // Keyboard shortcuts
   const shortcuts = useMemo(
      () => ({
         "/": () => {
            // Focus search on '/'
            const searchInput = document.querySelector<HTMLInputElement>(
               '[aria-label="Search ideas"]'
            );
            searchInput?.focus();
         },
         "cmd+k": () => {
            // Also focus search on Cmd+K
            const searchInput = document.querySelector<HTMLInputElement>(
               '[aria-label="Search ideas"]'
            );
            searchInput?.focus();
         },
      }),
      []
   );

   useKeyboardShortcuts(shortcuts);

   const handleCreateIdea = async (
      title: string,
      content: string,
      tags: string[]
   ) => {
      await createIdea(title, content, tags);
   };

   return (
      <div className="min-h-screen bg-gray-50 pb-16">
         <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
               {syncing && (
                  <p className="mt-1 text-sm text-primary animate-pulse">
                     Syncing...
                  </p>
               )}
            </header>

            <main className="space-y-6">
               {/* Idea capture form */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                     New Idea
                  </h2>
                  <IdeaForm onSubmit={handleCreateIdea} />
               </section>

               {/* Search */}
               <SearchBar
                  onSearch={setSearchQuery}
                  placeholder="Search ideas... (press / to focus)"
               />

               {/* Filter bar */}
               <FilterBar
                  allTags={allTags}
                  selectedTags={selectedTags}
                  onTagToggle={toggleTag}
                  showArchived={showArchived}
                  onToggleArchived={toggleArchived}
               />

               {/* Ideas list */}
               <section>
                  <IdeaList
                     ideas={ideas}
                     loading={loading}
                     error={error}
                     onDelete={deleteIdea}
                     onArchive={archiveIdea}
                  />
               </section>
            </main>
         </div>

         <OfflineIndicator />
      </div>
   );
}

export default App;
```

### Step 11.4: Run Lighthouse Audit

Lighthouse measures your app's quality across performance, accessibility, best practices, SEO, and PWA compliance.

```bash
bun run build
bun run preview
```

1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select all categories
4. Click "Analyze page load"

**Target scores:**

-  Performance: 90+
-  Accessibility: 90+
-  Best Practices: 90+
-  SEO: 90+
-  PWA: All checks pass

### Step 11.5: Final Deployment

Deploy the polished version:

```bash
vercel --prod
```

**Checkpoint — Final verification:**

1. Test loading skeletons (refresh the page quickly)
2. Test error handling (temporarily break something)
3. Test keyboard shortcuts:
   -  Press `/` — Search should focus
   -  Press `Cmd+K` — Search should focus
4. Run Lighthouse on production URL
5. Test on mobile device
6. Test offline functionality

**Milestone 11 Complete!** Your app is now production-ready:

-  Professional loading states with skeletons
-  Graceful error handling
-  Keyboard shortcuts for power users
-  Lighthouse audit passed

---

## Summary

Congratulations! You've built a complete offline-first idea capture PWA. Here's what you've accomplished:

### What You Built

| Feature                   | Milestone | Why It Matters              |
| ------------------------- | --------- | --------------------------- |
| Vite + React + TypeScript | 1         | Fast, type-safe development |
| Tailwind v4 styling       | 1         | Rapid UI development        |
| Turso database            | 2         | Persistent cloud storage    |
| Drizzle ORM               | 2         | Type-safe queries           |
| CRUD UI                   | 3         | Core functionality          |
| PWA capabilities          | 4         | Installable, cacheable      |
| Offline-first data        | 5         | Works without internet      |
| AI brainstorming          | 6         | Idea development            |
| Inngest integration       | 7         | Reliable background jobs    |
| Tags & filtering          | 8         | Organization                |
| Full-text search          | 9         | Quick access                |
| Vercel deployment         | 10        | Production hosting          |
| Polish                    | 11        | Professional quality        |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   React     │  │  IndexedDB  │  │ Service Worker  │  │
│  │     UI      │◄─┤  (Local DB) │◄─┤   (Cache)       │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
│         │                │                   │           │
└─────────┼────────────────┼───────────────────┼───────────┘
          │                │                   │
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                      Network                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Vercel    │  │   Turso     │  │    Inngest      │  │
│  │  (Hosting)  │  │  (Database) │  │ (Background Jobs)│  │
│  └─────────────┘  └─────────────┘  └────────┬────────┘  │
│                                              │           │
│                                              ▼           │
│                                    ┌─────────────────┐  │
│                                    │   Anthropic     │  │
│                                    │   (Claude AI)   │  │
│                                    └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key Learnings

1. **Offline-first is a mindset** — Local storage is the source of truth; network is for sync
2. **PWAs are just web apps with extras** — Service workers, manifests, and meta tags
3. **Type safety pays off** — Drizzle's TypeScript inference catches errors early
4. **Streaming improves UX** — Users prefer seeing progress over waiting
5. **Debouncing matters** — Small delays make big differences in performance feel

### What's Next?

Optional enhancements you could add:

1. **Chrome Extension** — Capture ideas from any tab (2-3 days)
2. **Export/Import** — Backup your ideas as JSON (2-4 hours)
3. **Markdown Support** — Rich text in idea content (4-6 hours)
4. **Reminders** — Notifications for ideas you want to revisit (4-6 hours)
5. **Sharing** — Share individual ideas or collections (1-2 days)
6. **Multiple Models** — Let users choose between Claude models (2-4 hours)

### Monthly Costs

-  **Turso:** $0 (free tier)
-  **Vercel:** $0 (free tier)
-  **Inngest:** $0 (free tier - 50,000 executions/month)
-  **Anthropic:** ~$2-3/month with daily use
-  **Total:** Under $3/month

### Useful Commands Reference

```bash
# Development
bun run dev              # Start all dev servers (frontend + API + Inngest)
bun run dev:client       # Start only frontend
bun run dev:api          # Start only API server
bun run dev:inngest      # Start only Inngest dev server

# Building
bun run build            # Build for production
bun run preview          # Preview production build

# Database
bunx drizzle-kit generate   # Generate migrations
bunx drizzle-kit migrate    # Apply migrations
bunx drizzle-kit studio     # Open database UI

# Deployment
vercel                   # Deploy to preview
vercel --prod            # Deploy to production
```

---

You now have a production-ready, offline-first idea capture app that you built from scratch. The patterns and principles you've learned—offline-first data, PWA configuration, streaming AI, type-safe databases—are applicable to countless other projects. Happy building!
