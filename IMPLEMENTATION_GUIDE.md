# Quiver: Offline-First Idea Capture App - Implementation Guide

> A step-by-step tutorial for building a production-ready PWA from scratch

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Milestone 1: Project Scaffolding](#milestone-1-project-scaffolding)
4. [Milestone 2: Database Setup with Turso & Drizzle](#milestone-2-database-setup-with-turso--drizzle)
5. [Milestone 3: Building the Idea CRUD Interface](#milestone-3-building-the-idea-crud-interface)
6. [Milestone 4: PWA Configuration](#milestone-4-pwa-configuration)
7. [Milestone 5: Offline Support & Caching](#milestone-5-offline-support--caching)
8. [Milestone 6: AI Brainstorming Integration](#milestone-6-ai-brainstorming-integration)
9. [Milestone 7: Deployment to Vercel](#milestone-7-deployment-to-vercel)
10.   [Milestone 8: Testing & Polish](#milestone-8-testing--polish)
11.   [Troubleshooting Guide](#troubleshooting-guide)
12.   [Next Steps: Browser Extension](#next-steps-browser-extension)

---

## Introduction

**Quiver** is an offline-first Progressive Web App (PWA) for capturing and developing ideas. You'll build an app that:

-  **Works offline**: Capture ideas anywhere, even without internet
-  **Installs like a native app**: Add to home screen on mobile and desktop
-  **Syncs automatically**: Data flows to the cloud when connected
-  **AI-powered brainstorming**: Get creative suggestions from Claude AI

### Tech Stack Overview

| Layer    | Technology          | Why                                                      |
| -------- | ------------------- | -------------------------------------------------------- |
| Runtime  | Bun                 | Fast all-in-one JavaScript runtime, native TypeScript    |
| Frontend | Vite + React        | Fastest setup, excellent PWA tooling                     |
| Database | Turso + Drizzle ORM | SQLite simplicity, type-safe queries, generous free tier |
| AI       | Claude Haiku 4.5    | Best brainstorming quality for cost                      |
| PWA      | vite-plugin-pwa     | Automatic service worker generation                      |
| Hosting  | Vercel              | Free tier, seamless deployment                           |

### Time & Cost Estimate

-  **Development time**: 12-16 hours (one weekend)
-  **Monthly cost**: ~$2.70 (Claude API only; everything else is free tier)

---

## Prerequisites

### Required Tools

Install these before starting:

```bash
# Bun 1.0+ (check with: bun --version)
# Install from: https://bun.sh
# macOS/Linux: curl -fsSL https://bun.sh/install | bash
# Windows: powershell -c "irm bun.sh/install.ps1 | iex"

# Git (check with: git --version)
# Download from: https://git-scm.com/
```

> **Why Bun?** Bun is a fast all-in-one JavaScript runtime that replaces Node.js, npm, and npx. It's significantly faster for installing packages and running scripts.

### Required Accounts

Create free accounts on these services:

1. **Turso** (https://turso.tech) - Database hosting
2. **Vercel** (https://vercel.com) - App hosting
3. **Anthropic** (https://console.anthropic.com) - Claude API (requires $5 prepaid credit)

> **Tip**: You can use OpenAI's GPT-4o mini instead of Claude during development to avoid prepaid costs. The guide will note where to make this swap.

### Required Knowledge

This guide assumes you understand:

-  Basic JavaScript/TypeScript syntax
-  React fundamentals (components, state, props, hooks)
-  Command line basics (cd, bun commands)
-  Basic SQL concepts (tables, queries)

### Recommended Setup

-  **Code Editor**: VS Code with the following extensions:
   -  ESLint
   -  Prettier
   -  TypeScript and JavaScript Language Features
-  **Browser**: Chrome (best PWA DevTools support)

---

## Milestone 1: Project Scaffolding

**Time estimate**: 30-45 minutes

### Objective

Set up a working Vite + React + TypeScript project with a proper folder structure. By the end, you'll have a running dev server displaying a basic UI.

### Why This Stack?

Before we dive in, let's understand why we're choosing these tools:

-  **Vite** is a build tool that's significantly faster than alternatives like Create React App. It uses native ES modules during development, which means your browser loads files directly without bundling. This makes hot module replacement (HMR) nearly instant.
-  **React** gives us a component-based architecture that makes building interactive UIs intuitive. We'll break our app into small, reusable pieces.
-  **TypeScript** adds type safety to JavaScript. It catches errors at compile time rather than runtime, which is especially valuable as your codebase grows.

### Steps

#### 1.1 Create the Vite Project

Open your terminal and run:

```bash
bun create vite quiver --template react-ts
cd quiver
bun install
```

**What's happening here:**

-  `bun create vite quiver` scaffolds a new project in a folder called `quiver`
-  `--template react-ts` tells Vite to use the React + TypeScript template
-  `bun install` downloads all the dependencies listed in `package.json`

#### 1.2 Clean Up the Boilerplate

Vite includes demo content we don't need. Let's remove it:

```bash
rm src/App.css
rm src/assets/react.svg
```

We're removing these because we'll write our own styles and won't need the React logo.

#### 1.3 Set Up the Folder Structure

A well-organized folder structure makes your codebase easier to navigate as it grows. Create this structure inside `src/`:

```
src/
├── components/       # Reusable UI components (buttons, cards, forms)
│   └── ui/          # Generic UI primitives
├── pages/           # Full-page components (if we add routing later)
├── hooks/           # Custom React hooks for shared logic
├── lib/             # Utility functions and service configurations
├── db/              # Database schema and connection setup
├── api/             # API-related code (not server routes in our case)
└── types/           # TypeScript type definitions shared across the app
```

Run these commands:

```bash
mkdir -p src/components/ui
mkdir -p src/pages
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/db
mkdir -p src/api
mkdir -p src/types
```

**Why this structure?** Separating concerns into folders makes it easy to find code later. When you need to modify how ideas are stored, you look in `db/`. When you need to change the UI, you look in `components/`. This becomes invaluable as your app grows.

#### 1.4 Create a Basic App Shell

Now let's write our first React component. Replace the contents of `src/App.tsx`:

```tsx
// src/App.tsx
import { useState } from "react";

function App() {
   // useState creates "reactive" variables that trigger re-renders when changed
   // ideas: an array of strings to store our idea titles
   // input: the current text in the input field
   const [ideas, setIdeas] = useState<string[]>([]);
   const [input, setInput] = useState("");

   // This function adds a new idea to our list
   const addIdea = () => {
      // Only add if there's actual content (not just whitespace)
      if (input.trim()) {
         // Create a NEW array with the old ideas plus the new one
         // We use spread (...) because React needs a new array reference to detect changes
         setIdeas([...ideas, input.trim()]);
         // Clear the input field for the next idea
         setInput("");
      }
   };

   return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
         <h1>Quiver</h1>
         <p>Capture your ideas</p>

         {/* Input section: a text field and a button side by side */}
         <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
               type="text"
               value={input}
               // Update state on every keystroke - this is "controlled input" pattern
               onChange={(e) => setInput(e.target.value)}
               // Allow pressing Enter to submit (better UX)
               onKeyDown={(e) => e.key === "Enter" && addIdea()}
               placeholder="Enter an idea..."
               style={{ flex: 1, padding: "8px" }}
            />
            <button onClick={addIdea} style={{ padding: "8px 16px" }}>
               Add
            </button>
         </div>

         {/* Idea list: map over the array to render each idea */}
         <ul>
            {ideas.map((idea, index) => (
               // key helps React track which items changed (important for performance)
               // Using index as key is okay here since we're not reordering items
               <li key={index} style={{ padding: "8px 0" }}>
                  {idea}
               </li>
            ))}
         </ul>

         {/* Empty state: show helpful text when there are no ideas */}
         {ideas.length === 0 && (
            <p style={{ color: "#666" }}>No ideas yet. Add your first one!</p>
         )}
      </div>
   );
}

export default App;
```

**Key React concepts demonstrated here:**

1. **useState Hook**: Creates state variables that persist across re-renders. When you call `setIdeas()`, React re-renders the component with the new data.

2. **Controlled Inputs**: The input's `value` is controlled by React state. Every keystroke updates state, which updates the input. This gives us full control over the input's behavior.

3. **Conditional Rendering**: The `{ideas.length === 0 && ...}` pattern only renders the empty state message when the condition is true.

4. **List Rendering**: The `map()` function transforms our data array into an array of JSX elements.

#### 1.5 Update the Global Styles

Replace the contents of `src/index.css`:

```css
/* src/index.css */

/* Reset: Remove browser default margins and use border-box sizing */
* {
   box-sizing: border-box; /* Makes width/height include padding and border */
   margin: 0;
   padding: 0;
}

/* Base body styles */
body {
   /* System font stack: uses the OS's native font for fast loading and familiar feel */
   font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
   line-height: 1.6; /* Comfortable reading line height */
   color: #333; /* Soft black, easier on the eyes than pure black */
   background-color: #f5f5f5; /* Light gray background */
}

/* Form element base styles */
input,
button {
   font-size: 16px; /* Prevents iOS zoom on focus (< 16px triggers zoom) */
   border: 1px solid #ddd;
   border-radius: 4px;
}

/* Button styling */
button {
   background-color: #0066cc;
   color: white;
   border: none;
   cursor: pointer; /* Shows clickable hand cursor on hover */
}

button:hover {
   background-color: #0052a3; /* Darker on hover for feedback */
}

ul {
   list-style: none; /* Remove bullet points */
}
```

**Why these specific choices?**

-  `font-size: 16px` on inputs prevents iOS Safari from zooming in when you tap the field
-  System font stack loads instantly (no network request) and looks native on each OS
-  `box-sizing: border-box` makes CSS layout math much more intuitive

#### 1.6 Install Development Dependencies

Install additional tools you'll need:

```bash
bun add -d @types/node
```

#### 1.7 Configure Path Aliases (Optional but Recommended)

Update `vite.config.ts` to enable cleaner imports:

```ts
// vite.config.ts
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

Update `tsconfig.json` to add path mapping (add inside `compilerOptions`):

```json
{
   "compilerOptions": {
      // ... existing options
      "baseUrl": ".",
      "paths": {
         "@/*": ["./src/*"]
      }
   }
}
```

### Verification

Run the development server:

```bash
bun run dev
```

**Expected behavior**:

1. Terminal shows: `Local: http://localhost:5173/`
2. Open that URL in your browser
3. You see "Quiver" as the heading
4. You can type text in the input field
5. Clicking "Add" or pressing Enter adds the idea to the list
6. Ideas appear in a list below the input

**Checkpoint**: Take a screenshot or make a mental note. This is your baseline working app!

---

**Commit your progress**:

```bash
git init
git add .
git commit -m "Milestone 1: Project scaffolding complete"
```

---

## Milestone 2: Database Setup with Turso & Drizzle

**Time estimate**: 45-60 minutes

### Objective

Set up a cloud SQLite database with Turso, define your schema with Drizzle ORM, and verify you can read/write data. By the end, you'll have a working database with type-safe queries.

### Why Turso & Drizzle?

Before we dive in, let's understand why we chose this particular stack:

**Why Turso (instead of PostgreSQL, MySQL, or Firebase)?**

-  **SQLite simplicity**: SQLite is the most deployed database in the world. It's simple, requires no server setup, and is perfect for personal apps
-  **Edge-ready**: Turso replicates your data globally, so queries are fast from anywhere
-  **Generous free tier**: 500 databases, 9GB storage, 1 billion row reads/month - more than enough for a personal app
-  **Offline potential**: SQLite's file-based nature works well with local-first architecture (we'll leverage this later)

**Why Drizzle ORM (instead of Prisma, TypeORM, or raw SQL)?**

-  **Type safety**: Your IDE will catch database errors before you run the code
-  **SQL-like syntax**: If you know SQL, Drizzle feels familiar. No "magic" abstractions to learn
-  **Lightweight**: Drizzle adds minimal overhead compared to heavier ORMs like Prisma
-  **Great migrations**: Schema changes are versioned and reversible

### Concepts to Understand

-  **Turso**: A distributed SQLite database. Think of it as "SQLite in the cloud" with automatic replication.
-  **Drizzle ORM**: A TypeScript-first database toolkit. It generates SQL queries from TypeScript code and provides full type safety.
-  **Schema**: The structure of your database tables (what columns exist, their types, constraints).
-  **Migration**: A script that modifies your database schema in a controlled, versioned way.

### Steps

#### 2.1 Install and Set Up Turso CLI

**On macOS:**

```bash
brew install tursodatabase/tap/turso
```

**On Linux:**

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

**On Windows (WSL):**

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

#### 2.2 Authenticate with Turso

```bash
turso auth signup
```

This opens your browser. Sign up with GitHub (recommended) or email.

After signup, verify authentication:

```bash
turso auth whoami
```

You should see your username.

#### 2.3 Create Your Database

```bash
turso db create quiver
```

This creates a new database. Get your connection details:

```bash
# Get the database URL
turso db show quiver --url

# Create an auth token
turso db tokens create quiver
```

**Save both values** - you'll need them in the next step.

#### 2.4 Set Up Environment Variables

Create a `.env` file in your project root:

```bash
# .env
TURSO_DATABASE_URL=libsql://quiver-YOUR_USERNAME.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
```

**Important**: Add `.env` to your `.gitignore`:

```bash
echo ".env" >> .gitignore
```

#### 2.5 Install Database Dependencies

```bash
bun add drizzle-orm @libsql/client
bun add -d drizzle-kit dotenv
```

-  `drizzle-orm`: The ORM for writing queries
-  `@libsql/client`: The Turso database client
-  `drizzle-kit`: CLI tools for migrations
-  `dotenv`: Loads environment variables from `.env`

#### 2.6 Create the Database Schema

This is where we define the structure of our data. Think of a schema like a blueprint for a building - it defines what "shape" your data must have.

Create `src/db/schema.ts`:

```ts
// src/db/schema.ts
// We import specific column types from Drizzle's SQLite module
// Each type maps to a SQLite column type
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// sqliteTable() creates a table definition
// First argument: the actual table name in the database ("ideas")
// Second argument: an object defining all columns
export const ideas = sqliteTable("ideas", {
   // PRIMARY KEY: Every table needs a unique identifier for each row
   // autoIncrement means the database automatically assigns 1, 2, 3, etc.
   // This is the standard pattern for database IDs
   id: integer("id").primaryKey({ autoIncrement: true }),

   // REQUIRED FIELD: .notNull() means this column cannot be empty
   // Every idea must have a title - this is our main display text
   title: text("title").notNull(),

   // OPTIONAL FIELD: No .notNull() means this can be null/undefined
   // Users might want to add details later, so we don't require it upfront
   content: text("content"),

   // JSON STORED AS TEXT: SQLite doesn't have native JSON/array types
   // So we store arrays as JSON strings: '["tag1", "tag2"]'
   // We'll parse these in our application code when reading
   tags: text("tags"), // Will store: '["productivity", "app-idea"]'
   urls: text("urls"), // Will store: '["https://example.com"]'

   // BOOLEAN AS INTEGER: SQLite doesn't have a boolean type
   // { mode: "boolean" } tells Drizzle to convert 0/1 to false/true
   // "Archived" lets us hide ideas without permanently deleting them (soft delete)
   archived: integer("archived", { mode: "boolean" }).default(false),

   // TIMESTAMPS: Track when records are created and modified
   // { mode: "timestamp" } converts Unix timestamps to JavaScript Date objects
   // .$defaultFn() runs a function to set default value on insert
   // We use snake_case in the database ("created_at") but camelCase in JS
   createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
   updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
});

// TYPE INFERENCE: This is where Drizzle's type safety shines!
// $inferSelect: The type of data you get back when reading from the database
// $inferInsert: The type of data you need to provide when inserting
// These types automatically update when you change the schema - no manual sync needed!
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
```

**Why these specific design choices?**

| Column       | Why This Way?                                                                           |
| ------------ | --------------------------------------------------------------------------------------- |
| `id`         | Auto-increment is simple and works. UUIDs are overkill for a personal app               |
| `title`      | Required because every idea needs at least a name                                       |
| `content`    | Optional for quick capture - you can jot down a title now, elaborate later              |
| `tags/urls`  | JSON strings are a pragmatic choice. Arrays in SQLite require separate tables (complex) |
| `archived`   | Soft delete pattern - lets you "undo" deletions and keeps history                       |
| `timestamps` | Essential for sorting ("newest first") and knowing when you had an idea                 |

#### 2.7 Create the Database Client

The "client" is our connection to the database. Think of it like a phone line between your app and Turso's servers.

Create `src/db/index.ts`:

```ts
// src/db/index.ts

// drizzle() wraps the raw database client with Drizzle's query builder
import { drizzle } from "drizzle-orm/libsql";
// createClient() establishes the actual network connection to Turso
import { createClient } from "@libsql/client";
// We import our schema so Drizzle knows our table structure
import * as schema from "./schema";

// CREATE THE LOW-LEVEL CONNECTION
// createClient() needs two things:
// 1. url: Where is the database? (Turso's server address)
// 2. authToken: Proof that we're allowed to access it (like a password)
const client = createClient({
   // We check two places for credentials:
   // - import.meta.env.VITE_*: Vite's way of accessing env vars in browser code
   // - process.env.*: Node.js way (used when running scripts directly)
   // The || operator means "use the first one that exists"
   url:
      import.meta.env.VITE_TURSO_DATABASE_URL ||
      process.env.TURSO_DATABASE_URL!,
   authToken:
      import.meta.env.VITE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
});

// WRAP WITH DRIZZLE
// This gives us the nice query API: db.select().from(ideas)
// Instead of raw SQL strings: "SELECT * FROM ideas"
// Passing { schema } enables "relational queries" - more advanced feature for joins
export const db = drizzle(client, { schema });
```

**Why two sets of environment variables?**

This is a common source of confusion, so let's clarify:

| Environment        | Variable Prefix | Why?                                                        |
| ------------------ | --------------- | ----------------------------------------------------------- |
| Browser (Vite dev) | `VITE_`         | Vite only exposes vars starting with `VITE_` to the browser |
| Node.js scripts    | No prefix       | Node reads `.env` directly via `dotenv`                     |

Update your `.env` file to include both versions:

```bash
# .env

# These are for Node.js scripts (migrations, tests, server-side code)
TURSO_DATABASE_URL=libsql://quiver-YOUR_USERNAME.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here

# These are the SAME values, but with VITE_ prefix for browser access
# Yes, this duplication is annoying, but it's how Vite security works
# (Vite won't accidentally expose non-VITE_ secrets to the browser)
VITE_TURSO_DATABASE_URL=libsql://quiver-YOUR_USERNAME.turso.io
VITE_TURSO_AUTH_TOKEN=your-auth-token-here
```

> **Security note**: In a production multi-user app, you'd NEVER expose database credentials to the browser. You'd create API routes that run on the server. For a personal app, this direct approach is fine.

#### 2.8 Configure Drizzle Kit

Drizzle Kit is a separate CLI tool that handles database migrations. It needs its own config file to know where your schema is and how to connect to the database.

Create `drizzle.config.ts` in your project root:

```ts
// drizzle.config.ts
// This file configures the drizzle-kit CLI (migrations, studio, etc.)
// It's separate from your app code - only used during development

import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load .env file so we can access TURSO_DATABASE_URL
// This is needed because drizzle-kit runs as a Node script, not in Vite
dotenv.config();

export default {
   // Where is your schema defined?
   schema: "./src/db/schema.ts",
   // Where should migration files be saved?
   out: "./drizzle",
   // What database type? "turso" tells Drizzle to use libSQL protocol
   dialect: "turso",
   // Connection details (same as in our client)
   dbCredentials: {
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
   },
} satisfies Config;
// "satisfies Config" gives us type checking without losing literal types
```

#### 2.9 Generate and Run Migrations

**What are migrations?**

Migrations are version-controlled changes to your database schema. Instead of manually running `CREATE TABLE` SQL, Drizzle compares your schema.ts to the actual database and generates the necessary SQL.

Generate the migration files:

```bash
bunx drizzle-kit generate
```

This creates a `drizzle/` folder with SQL files like `0000_create_ideas.sql`. You can inspect these to see exactly what SQL will run.

Push the schema to your database:

```bash
bunx drizzle-kit push
```

**What's happening here?**

1. Drizzle connects to your Turso database
2. It compares your schema.ts to the current database state
3. It runs any needed SQL commands (CREATE TABLE, etc.)

You should see output confirming the `ideas` table was created.

#### 2.10 Add Helper Scripts to package.json

Add these scripts to your `package.json`:

```json
{
   "scripts": {
      "dev": "vite",
      "build": "tsc -b && vite build",
      "preview": "vite preview",
      "db:generate": "drizzle-kit generate",
      "db:push": "drizzle-kit push",
      "db:studio": "drizzle-kit studio"
   }
}
```

#### 2.11 Test Database Connection

Let's verify everything works by writing a test script. This is a pattern you'll use often: write a quick script to test a new feature before integrating it into your app.

Create a temporary test file `src/db/test-connection.ts`:

```ts
// src/db/test-connection.ts
// A throwaway script to verify our database setup works
// You can delete this file after confirming everything works

import { db } from "./index";
import { ideas } from "./schema";
import { eq } from "drizzle-orm"; // Import the eq() helper for WHERE clauses

async function testConnection() {
   console.log("Testing database connection...\n");

   // ============================================
   // CREATE: Insert a new row into the ideas table
   // ============================================
   // db.insert(table).values(data) - creates an INSERT statement
   // .returning() - tells the database to return the inserted row
   // [newIdea] - destructure the array since returning() returns an array
   const [newIdea] = await db
      .insert(ideas)
      .values({
         title: "Test Idea",
         content: "This is a test to verify the database works!",
         // Notice: we don't provide id, createdAt, updatedAt
         // These are handled automatically by our schema defaults!
      })
      .returning();

   console.log("✓ Created idea:", newIdea);
   console.log("  (Notice the auto-generated id and timestamps)\n");

   // ============================================
   // READ: Fetch all rows from the ideas table
   // ============================================
   // db.select().from(table) - creates a SELECT * statement
   // This returns an array of all matching rows
   const allIdeas = await db.select().from(ideas);
   console.log("✓ All ideas in database:", allIdeas);
   console.log(`  (Found ${allIdeas.length} idea(s))\n`);

   // ============================================
   // DELETE: Remove our test data to keep things clean
   // ============================================
   // db.delete(table).where(condition) - creates a DELETE statement
   // eq(column, value) - creates a "column = value" condition
   // This is Drizzle's type-safe way to write WHERE clauses
   await db.delete(ideas).where(eq(ideas.id, newIdea.id));
   console.log("✓ Cleaned up test data\n");

   console.log("=".repeat(40));
   console.log("SUCCESS! Database connection verified.");
   console.log("=".repeat(40));
}

// Run the function and catch any errors
// .catch(console.error) prints the full error if something goes wrong
testConnection().catch(console.error);
```

Run the test with:

```bash
bun run src/db/test-connection.ts
```

**What to expect:**

-  You should see the created idea with an auto-generated `id`
-  `createdAt` and `updatedAt` should be set to the current time
-  The cleanup should remove the test idea

**Troubleshooting if it fails:**

-  "Connection refused": Check your TURSO_DATABASE_URL in .env
-  "Unauthorized": Check your TURSO_AUTH_TOKEN in .env
-  "Table not found": Did you run `bunx drizzle-kit push`?

> **Note**: Bun has native TypeScript support, so no additional tools are needed to run `.ts` files.

### Verification

1. **Turso Dashboard**: Go to https://turso.tech/app and click on your `quiver` database. You should see the `ideas` table in the schema.

2. **Drizzle Studio**: Run `bun run db:studio` and open the provided URL. You can browse your database visually.

3. **Test Script Output**: The test script should show:
   -  "Created idea:" with an ID and your test data
   -  "All ideas:" with an array containing your idea
   -  "Test complete!"

**Checkpoint**: You now have a working cloud database with type-safe access!

---

**Commit your progress**:

```bash
git add .
git commit -m "Milestone 2: Database setup with Turso and Drizzle"
```

---

## Milestone 3: Building the Idea CRUD Interface

**Time estimate**: 90-120 minutes

### Objective

Build a complete Create-Read-Update-Delete (CRUD) interface for ideas. By the end, you'll be able to add, view, edit, and delete ideas that persist in your Turso database.

### Why CRUD Matters

CRUD isn't just an acronym - it's a mental model for how data flows through any application:

| Operation  | What It Does         | Example in Quiver             |
| ---------- | -------------------- | ----------------------------- |
| **C**reate | Add new data         | User types an idea and saves  |
| **R**ead   | Fetch existing data  | App loads ideas from database |
| **U**pdate | Modify existing data | User edits an idea's title    |
| **D**elete | Remove data          | User archives an old idea     |

Every feature you'll build in your career involves some combination of these four operations.

### Architecture Overview

We're organizing our code into **layers**, which is a pattern you'll see in professional codebases:

```
User Interface (React components)
        ↓ calls
Custom Hooks (useIdeas.ts - state management)
        ↓ calls
Library Functions (lib/ideas.ts - business logic)
        ↓ calls
Database Client (db/index.ts - Drizzle queries)
        ↓ talks to
Turso Cloud Database
```

**Why these layers?**

-  **Separation of concerns**: Each layer has one job
-  **Testability**: You can test each layer independently
-  **Reusability**: Library functions can be reused across components
-  **Maintainability**: Changes in one layer don't break others

> **Note**: For a production multi-user app, you'd add an API layer between the frontend and database to protect credentials. For a personal app, this direct approach is simpler.

### Steps

#### 3.1 Create Type Definitions

**Why TypeScript interfaces?**

TypeScript interfaces are like contracts that describe the shape of your data. They help you:

-  Catch bugs at compile time (not runtime)
-  Get autocomplete in your editor
-  Document what data your functions expect

Create `src/types/idea.ts`:

```ts
// src/types/idea.ts

// This is what an Idea looks like AFTER we fetch it from the database
// and parse the JSON fields. This is the "application" representation.
export interface Idea {
   id: number;
   title: string;
   content: string | null; // null means "not set" (different from empty string)
   tags: string[]; // Already parsed from JSON - ready to use as array
   urls: string[]; // Already parsed from JSON
   archived: boolean;
   createdAt: Date;
   updatedAt: Date;
}

// This is what we need to CREATE a new idea
// Notice: fewer required fields! id and timestamps are auto-generated
export interface CreateIdeaInput {
   title: string; // Required - every idea needs a title
   content?: string; // Optional (?) means we don't have to provide it
   tags?: string[];
   urls?: string[];
}

// This is what we can UPDATE on an existing idea
// ALL fields are optional - we only send what changed
export interface UpdateIdeaInput {
   title?: string;
   content?: string;
   tags?: string[];
   urls?: string[];
   archived?: boolean;
}
```

**Pattern explained**: We have three types for the same "Idea" concept because different operations need different data:

-  Reading: We get everything (Idea)
-  Creating: We provide minimum required fields (CreateIdeaInput)
-  Updating: We only send changed fields (UpdateIdeaInput)

#### 3.2 Create Database Helper Functions

This file contains all our database operations. It sits between our React code and the raw Drizzle queries, providing a clean API.

Create `src/lib/ideas.ts`:

```ts
// src/lib/ideas.ts
// This file is our "data access layer" - all database operations live here
// Benefits: One place to add logging, caching, validation, etc.

import { db } from "@/db";
import { ideas } from "@/db/schema";
import { eq, desc } from "drizzle-orm"; // Query helpers from Drizzle
import type { Idea, CreateIdeaInput, UpdateIdeaInput } from "@/types/idea";

// ============================================
// HELPER FUNCTION: Transform database row to our app's Idea type
// ============================================
// Why do we need this? The database stores tags/urls as JSON strings,
// but our app wants to work with actual arrays. This function does the conversion.
function parseIdea(row: typeof ideas.$inferSelect): Idea {
   return {
      id: row.id,
      title: row.title,
      content: row.content,
      // JSON.parse converts '["tag1", "tag2"]' back to an array
      // The ternary (? :) handles null - if no tags, use empty array
      tags: row.tags ? JSON.parse(row.tags) : [],
      urls: row.urls ? JSON.parse(row.urls) : [],
      // ?? is "nullish coalescing" - if archived is null/undefined, use false
      archived: row.archived ?? false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
   };
}

// ============================================
// READ: Get all non-archived ideas, newest first
// ============================================
export async function getIdeas(): Promise<Idea[]> {
   const rows = await db
      .select() // SELECT * (all columns)
      .from(ideas) // FROM ideas table
      .where(eq(ideas.archived, false)) // WHERE archived = false
      .orderBy(desc(ideas.createdAt)); // ORDER BY created_at DESC

   // Transform each database row into our Idea type
   return rows.map(parseIdea);
}

// ============================================
// READ: Get a single idea by ID
// ============================================
export async function getIdea(id: number): Promise<Idea | null> {
   // Note: db.select() returns an array, even for single results
   // We destructure [row] to get the first (and only) element
   const [row] = await db.select().from(ideas).where(eq(ideas.id, id));

   // Return null if not found (row would be undefined)
   return row ? parseIdea(row) : null;
}

// ============================================
// CREATE: Add a new idea to the database
// ============================================
export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
   const [row] = await db
      .insert(ideas)
      .values({
         title: input.title,
         // Convert empty string to null for cleaner database storage
         content: input.content || null,
         // JSON.stringify converts arrays to storable strings
         // ['tag1', 'tag2'] becomes '["tag1","tag2"]'
         tags: input.tags ? JSON.stringify(input.tags) : null,
         urls: input.urls ? JSON.stringify(input.urls) : null,
         // Note: id, createdAt, updatedAt, archived all use schema defaults
      })
      .returning(); // Return the created row (with auto-generated fields)

   return parseIdea(row);
}

// ============================================
// UPDATE: Modify an existing idea
// ============================================
export async function updateIdea(
   id: number,
   input: UpdateIdeaInput
): Promise<Idea | null> {
   // Build the update object dynamically
   // We only include fields that were actually provided
   const updateData: Record<string, unknown> = {
      updatedAt: new Date(), // Always update the timestamp
   };

   // "!== undefined" check is important!
   // It allows setting a field to null/empty, which is different from "not provided"
   if (input.title !== undefined) updateData.title = input.title;
   if (input.content !== undefined) updateData.content = input.content;
   if (input.tags !== undefined) updateData.tags = JSON.stringify(input.tags);
   if (input.urls !== undefined) updateData.urls = JSON.stringify(input.urls);
   if (input.archived !== undefined) updateData.archived = input.archived;

   const [row] = await db
      .update(ideas)
      .set(updateData)
      .where(eq(ideas.id, id))
      .returning();

   return row ? parseIdea(row) : null;
}

// ============================================
// SOFT DELETE: Archive an idea (keeps data, just hides it)
// ============================================
// Why "soft delete"? Users can recover archived ideas. Hard deletes are permanent.
export async function archiveIdea(id: number): Promise<boolean> {
   const result = await db
      .update(ideas)
      .set({ archived: true, updatedAt: new Date() })
      .where(eq(ideas.id, id));

   // rowsAffected tells us if the update actually changed anything
   return result.rowsAffected > 0;
}

// ============================================
// HARD DELETE: Permanently remove an idea
// ============================================
// Use with caution! This cannot be undone.
export async function deleteIdea(id: number): Promise<boolean> {
   const result = await db.delete(ideas).where(eq(ideas.id, id));
   return result.rowsAffected > 0;
}
```

**Key patterns to notice:**

-  Each function has a single responsibility (SRP - Single Responsibility Principle)
-  Consistent return types: arrays for lists, `T | null` for single items
-  We always transform database rows through `parseIdea` for consistency

#### 3.3 Create a Custom Hook for Ideas

**What's a custom hook?**

A custom hook is a function that starts with `use` and can call other React hooks. It's how we share stateful logic between components. Think of it as extracting a reusable piece of component behavior.

**Why do we need this hook?**

-  Without it, our component would be cluttered with loading states, error handling, and database calls
-  If we need ideas in multiple components later, we can reuse this hook
-  It's easier to test business logic when it's separate from UI

Create `src/hooks/useIdeas.ts`:

```ts
// src/hooks/useIdeas.ts
// A custom hook that manages all idea-related state and operations
// This gives components a simple API: const { ideas, addIdea, ... } = useIdeas()

import { useState, useEffect, useCallback } from "react";
import type { Idea, CreateIdeaInput, UpdateIdeaInput } from "@/types/idea";
import * as ideasLib from "@/lib/ideas";

export function useIdeas() {
   // ============================================
   // STATE: The data our hook manages
   // ============================================
   // Each useState creates a piece of state that persists across renders

   const [ideas, setIdeas] = useState<Idea[]>([]); // The list of ideas
   const [loading, setLoading] = useState(true); // Are we fetching data?
   const [error, setError] = useState<string | null>(null); // Any error message

   // ============================================
   // FETCH: Load ideas from the database
   // ============================================
   // useCallback memoizes this function - it won't be recreated every render
   // This is important because we use it as a useEffect dependency
   const fetchIdeas = useCallback(async () => {
      try {
         setLoading(true); // Show loading state
         setError(null); // Clear any previous errors
         const data = await ideasLib.getIdeas();
         setIdeas(data);
      } catch (err) {
         // Type-safe error handling
         setError(err instanceof Error ? err.message : "Failed to fetch ideas");
      } finally {
         // finally runs whether try succeeded or catch ran
         setLoading(false);
      }
   }, []); // Empty array = function never changes (has no dependencies)

   // ============================================
   // INITIAL LOAD: Fetch ideas when hook first mounts
   // ============================================
   // useEffect runs side effects (like data fetching) after render
   useEffect(() => {
      fetchIdeas();
   }, [fetchIdeas]); // Run when fetchIdeas changes (which is never, due to useCallback)

   // ============================================
   // CREATE: Add a new idea
   // ============================================
   const addIdea = useCallback(async (input: CreateIdeaInput) => {
      try {
         const newIdea = await ideasLib.createIdea(input);
         // "Optimistic update": Add to local state immediately
         // [newIdea, ...prev] puts new idea at the START of the array (newest first)
         setIdeas((prev) => [newIdea, ...prev]);
         return newIdea;
      } catch (err) {
         setError(err instanceof Error ? err.message : "Failed to create idea");
         throw err; // Re-throw so the component can handle it (e.g., show a toast)
      }
   }, []);

   // ============================================
   // UPDATE: Modify an existing idea
   // ============================================
   const editIdea = useCallback(async (id: number, input: UpdateIdeaInput) => {
      try {
         const updated = await ideasLib.updateIdea(id, input);
         if (updated) {
            // Replace the old idea with the updated one in our array
            // .map creates a new array where we swap out the matching idea
            setIdeas((prev) =>
               prev.map((idea) => (idea.id === id ? updated : idea))
            );
         }
         return updated;
      } catch (err) {
         setError(err instanceof Error ? err.message : "Failed to update idea");
         throw err;
      }
   }, []);

   // ============================================
   // DELETE: Archive (soft delete) an idea
   // ============================================
   const removeIdea = useCallback(async (id: number) => {
      try {
         await ideasLib.archiveIdea(id);
         // Remove from local state by filtering out the archived idea
         // .filter creates a new array with only items that pass the test
         setIdeas((prev) => prev.filter((idea) => idea.id !== id));
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Failed to archive idea"
         );
         throw err;
      }
   }, []);

   // ============================================
   // RETURN: What components get when they call useIdeas()
   // ============================================
   return {
      ideas, // The array of ideas
      loading, // Boolean: is data being fetched?
      error, // String or null: any error message
      addIdea, // Function: create a new idea
      editIdea, // Function: update an existing idea
      removeIdea, // Function: archive an idea
      refreshIdeas: fetchIdeas, // Function: re-fetch from database
   };
}
```

**Why useCallback everywhere?**

Without `useCallback`, each function would be recreated on every render. This causes problems:

1. Child components that receive these functions would re-render unnecessarily
2. useEffect dependencies would constantly change, causing infinite loops

`useCallback` says "keep the same function reference unless dependencies change."

#### 3.4 Create the Idea Card Component

Now we build the UI components that display our ideas. We'll start with `IdeaCard` - a component that shows a single idea and lets users edit or archive it.

**Component design principle**: Each card handles its own editing state. When you click "Edit", only that card switches to edit mode - other cards stay unchanged. This is a common pattern for inline editing.

Create `src/components/IdeaCard.tsx`:

```tsx
// src/components/IdeaCard.tsx
// A component that displays a single idea with edit/archive capabilities
// This pattern is called "controlled component" - React controls the form state

import { useState } from "react";
import type { Idea, UpdateIdeaInput } from "@/types/idea";

// TypeScript interface for props - this documents what the component expects
interface IdeaCardProps {
   idea: Idea; // The idea to display
   onUpdate: (id: number, input: UpdateIdeaInput) => Promise<void>; // Called when user saves edits
   onDelete: (id: number) => Promise<void>; // Called when user archives
}

// Destructure props directly in the function signature (cleaner than props.idea)
export function IdeaCard({ idea, onUpdate, onDelete }: IdeaCardProps) {
   // ============================================
   // LOCAL STATE: Only affects this card instance
   // ============================================
   const [isEditing, setIsEditing] = useState(false); // Toggle edit mode
   const [title, setTitle] = useState(idea.title); // Editable copy of title
   const [content, setContent] = useState(idea.content || ""); // Editable copy
   const [isDeleting, setIsDeleting] = useState(false); // Show loading state

   // ============================================
   // EVENT HANDLERS
   // ============================================
   const handleSave = async () => {
      await onUpdate(idea.id, { title, content }); // Call parent's update function
      setIsEditing(false); // Exit edit mode
   };

   const handleCancel = () => {
      // Reset to original values (discard changes)
      setTitle(idea.title);
      setContent(idea.content || "");
      setIsEditing(false);
   };

   const handleDelete = async () => {
      // window.confirm shows a browser dialog - simple but effective
      if (window.confirm("Archive this idea?")) {
         setIsDeleting(true); // Show "Archiving..." state
         await onDelete(idea.id);
         // Note: We don't setIsDeleting(false) because the card will be removed
      }
   };

   // Helper function to format dates nicely
   const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString("en-US", {
         month: "short",
         day: "numeric",
         hour: "2-digit",
         minute: "2-digit",
      });
   };

   // ============================================
   // CONDITIONAL RENDERING: Edit mode vs Display mode
   // ============================================
   // "Early return" pattern: if editing, return the edit form immediately
   if (isEditing) {
      return (
         <div className="idea-card editing">
            <input
               type="text"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               className="idea-title-input"
               placeholder="Idea title..."
            />
            <textarea
               value={content}
               onChange={(e) => setContent(e.target.value)}
               className="idea-content-input"
               placeholder="Add more details..."
               rows={3}
            />
            <div className="idea-actions">
               <button onClick={handleSave} className="btn-save">
                  Save
               </button>
               <button onClick={handleCancel} className="btn-cancel">
                  Cancel
               </button>
            </div>
         </div>
      );
   }

   // Default: Display mode (read-only view)
   return (
      <div className="idea-card">
         <div className="idea-header">
            <h3 className="idea-title">{idea.title}</h3>
            <span className="idea-date">{formatDate(idea.createdAt)}</span>
         </div>

         {/* Conditional rendering: only show if content exists */}
         {idea.content && <p className="idea-content">{idea.content}</p>}

         {/* Conditional rendering: only show tags section if there are tags */}
         {idea.tags.length > 0 && (
            <div className="idea-tags">
               {/* .map transforms array into list of elements */}
               {idea.tags.map((tag, i) => (
                  <span key={i} className="tag">
                     {tag}
                  </span>
               ))}
            </div>
         )}

         <div className="idea-actions">
            <button onClick={() => setIsEditing(true)} className="btn-edit">
               Edit
            </button>
            <button
               onClick={handleDelete}
               className="btn-delete"
               disabled={isDeleting} // Prevent double-clicks
            >
               {isDeleting ? "Archiving..." : "Archive"}
            </button>
         </div>
      </div>
   );
}
```

#### 3.5 Create the Idea Form Component

The form is where users capture new ideas. We're using a UX pattern called "progressive disclosure" - the form starts simple (just a text input) and expands when focused to reveal additional fields. This reduces visual clutter while keeping advanced options accessible.

Create `src/components/IdeaForm.tsx`:

```tsx
// src/components/IdeaForm.tsx
import { useState } from "react";
import type { CreateIdeaInput } from "@/types/idea";

interface IdeaFormProps {
   onSubmit: (input: CreateIdeaInput) => Promise<void>;
}

export function IdeaForm({ onSubmit }: IdeaFormProps) {
   const [title, setTitle] = useState("");
   const [content, setContent] = useState("");
   const [tagInput, setTagInput] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isExpanded, setIsExpanded] = useState(false);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) return;

      setIsSubmitting(true);
      try {
         const tags = tagInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

         await onSubmit({
            title: title.trim(),
            content: content.trim() || undefined,
            tags: tags.length > 0 ? tags : undefined,
         });

         // Reset form
         setTitle("");
         setContent("");
         setTagInput("");
         setIsExpanded(false);
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleKeyDown = (e: React.KeyboardEvent) => {
      // Submit on Cmd/Ctrl + Enter
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
         handleSubmit(e);
      }
   };

   return (
      <form onSubmit={handleSubmit} className="idea-form">
         <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={handleKeyDown}
            placeholder="Capture an idea..."
            className="idea-input-main"
            disabled={isSubmitting}
         />

         {isExpanded && (
            <>
               <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add more details (optional)..."
                  className="idea-input-content"
                  rows={3}
                  disabled={isSubmitting}
               />

               <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tags (comma-separated)..."
                  className="idea-input-tags"
                  disabled={isSubmitting}
               />

               <div className="form-actions">
                  <button
                     type="submit"
                     disabled={!title.trim() || isSubmitting}
                  >
                     {isSubmitting ? "Saving..." : "Save Idea"}
                  </button>
                  <button
                     type="button"
                     onClick={() => setIsExpanded(false)}
                     className="btn-collapse"
                  >
                     Collapse
                  </button>
                  <span className="form-hint">Ctrl+Enter to save</span>
               </div>
            </>
         )}
      </form>
   );
}
```

#### 3.6 Update the Main App Component

Replace `src/App.tsx`:

```tsx
// src/App.tsx
import { useIdeas } from "@/hooks/useIdeas";
import { IdeaForm } from "@/components/IdeaForm";
import { IdeaCard } from "@/components/IdeaCard";

function App() {
   const { ideas, loading, error, addIdea, editIdea, removeIdea } = useIdeas();

   return (
      <div className="app-container">
         <header className="app-header">
            <h1>Quiver</h1>
            <p>Capture and develop your ideas</p>
         </header>

         <main className="app-main">
            <IdeaForm onSubmit={addIdea} />

            {error && <div className="error-message">{error}</div>}

            {loading ? (
               <div className="loading">Loading ideas...</div>
            ) : ideas.length === 0 ? (
               <div className="empty-state">
                  <p>No ideas yet!</p>
                  <p>Start capturing your thoughts above.</p>
               </div>
            ) : (
               <div className="ideas-list">
                  {ideas.map((idea) => (
                     <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onUpdate={editIdea}
                        onDelete={removeIdea}
                     />
                  ))}
               </div>
            )}
         </main>

         <footer className="app-footer">
            <p>
               {ideas.length} idea{ideas.length !== 1 ? "s" : ""} captured
            </p>
         </footer>
      </div>
   );
}

export default App;
```

#### 3.7 Add Styles for the CRUD Interface

Replace `src/index.css`:

```css
/* src/index.css */
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

/* Layout */
.app-container {
   max-width: 640px;
   margin: 0 auto;
   padding: 20px;
   min-height: 100vh;
   display: flex;
   flex-direction: column;
}

.app-header {
   text-align: center;
   margin-bottom: 24px;
}

.app-header h1 {
   font-size: 2rem;
   color: #0066cc;
}

.app-header p {
   color: #666;
}

.app-main {
   flex: 1;
}

.app-footer {
   text-align: center;
   padding: 20px;
   color: #999;
   font-size: 0.875rem;
}

/* Form styles */
.idea-form {
   background: white;
   border-radius: 8px;
   padding: 16px;
   margin-bottom: 24px;
   box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.idea-input-main,
.idea-input-content,
.idea-input-tags {
   width: 100%;
   padding: 12px;
   border: 1px solid #ddd;
   border-radius: 4px;
   font-size: 16px;
   margin-bottom: 12px;
}

.idea-input-main {
   font-weight: 500;
}

.idea-input-content {
   resize: vertical;
   min-height: 80px;
}

.form-actions {
   display: flex;
   align-items: center;
   gap: 12px;
}

.form-actions button {
   padding: 10px 20px;
   border: none;
   border-radius: 4px;
   cursor: pointer;
   font-size: 14px;
}

.form-actions button[type="submit"] {
   background-color: #0066cc;
   color: white;
}

.form-actions button[type="submit"]:hover:not(:disabled) {
   background-color: #0052a3;
}

.form-actions button[type="submit"]:disabled {
   background-color: #ccc;
   cursor: not-allowed;
}

.btn-collapse {
   background-color: #f0f0f0;
   color: #666;
}

.form-hint {
   color: #999;
   font-size: 0.75rem;
   margin-left: auto;
}

/* Idea card styles */
.ideas-list {
   display: flex;
   flex-direction: column;
   gap: 16px;
}

.idea-card {
   background: white;
   border-radius: 8px;
   padding: 16px;
   box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.idea-card.editing {
   border: 2px solid #0066cc;
}

.idea-header {
   display: flex;
   justify-content: space-between;
   align-items: flex-start;
   margin-bottom: 8px;
}

.idea-title {
   font-size: 1.1rem;
   font-weight: 600;
   color: #333;
}

.idea-date {
   font-size: 0.75rem;
   color: #999;
   white-space: nowrap;
}

.idea-content {
   color: #666;
   margin-bottom: 12px;
}

.idea-tags {
   display: flex;
   flex-wrap: wrap;
   gap: 8px;
   margin-bottom: 12px;
}

.tag {
   background-color: #e8f4fc;
   color: #0066cc;
   padding: 2px 8px;
   border-radius: 12px;
   font-size: 0.75rem;
}

.idea-actions {
   display: flex;
   gap: 8px;
   margin-top: 12px;
}

.idea-actions button {
   padding: 6px 12px;
   border: none;
   border-radius: 4px;
   cursor: pointer;
   font-size: 0.875rem;
}

.btn-edit {
   background-color: #f0f0f0;
   color: #333;
}

.btn-delete {
   background-color: #fff0f0;
   color: #cc0000;
}

.btn-save {
   background-color: #0066cc;
   color: white;
}

.btn-cancel {
   background-color: #f0f0f0;
   color: #666;
}

.idea-title-input,
.idea-content-input {
   width: 100%;
   padding: 8px;
   border: 1px solid #ddd;
   border-radius: 4px;
   font-size: 16px;
   margin-bottom: 8px;
}

/* State styles */
.loading,
.empty-state,
.error-message {
   text-align: center;
   padding: 40px;
}

.loading {
   color: #666;
}

.empty-state {
   color: #999;
}

.error-message {
   background-color: #fff0f0;
   color: #cc0000;
   border-radius: 8px;
   margin-bottom: 16px;
}
```

### Verification

1. **Start the dev server**: `bun run dev`

2. **Test Create**:

   -  Click the input field - it should expand to show more fields
   -  Enter a title like "My first idea"
   -  Optionally add content and tags (comma-separated)
   -  Click "Save Idea" or press Ctrl+Enter
   -  The idea should appear in the list below

3. **Test Read**:

   -  Refresh the page
   -  Your ideas should still be there (loaded from Turso)
   -  Ideas should be sorted newest first

4. **Test Update**:

   -  Click "Edit" on an idea
   -  Change the title or content
   -  Click "Save"
   -  The changes should persist after refresh

5. **Test Delete (Archive)**:

   -  Click "Archive" on an idea
   -  Confirm the dialog
   -  The idea disappears from the list
   -  It's still in the database (just archived)

6. **Check the footer**: Should show the correct count of ideas

**Checkpoint**: You now have a fully functional CRUD interface!

---

**Commit your progress**:

```bash
git add .
git commit -m "Milestone 3: CRUD interface for ideas"
```

---

## Milestone 4: PWA Configuration

**Time estimate**: 45-60 minutes

### Objective

Transform your web app into an installable Progressive Web App (PWA). By the end, users can install Quiver on their devices and it will feel like a native app.

### Why Make It a PWA?

PWAs give you the best of both worlds - web and native:

| Feature            | Regular Website | Native App   | PWA |
| ------------------ | --------------- | ------------ | --- |
| Works offline      | No              | Yes          | Yes |
| Installable        | No              | Yes          | Yes |
| App store required | N/A             | Yes          | No  |
| Auto-updates       | Yes             | Manual       | Yes |
| Cross-platform     | Yes             | No (rebuild) | Yes |
| Push notifications | No              | Yes          | Yes |
| Full-screen mode   | No              | Yes          | Yes |

For an idea capture app, PWA is perfect because:

1. **Quick access**: Users can launch from home screen without opening a browser
2. **Works offline**: Capture ideas even without internet (we'll add this in Milestone 5)
3. **No app store**: Skip the approval process and fees

### Concepts to Understand

-  **PWA (Progressive Web App)**: A web app that can be installed on devices and work offline
-  **Web App Manifest**: A JSON file that tells browsers about your app (name, icons, colors, how to launch it)
-  **Service Worker**: A script that runs in the background, enabling offline functionality and caching
-  **Workbox**: A Google library that simplifies service worker creation (handles caching strategies for you)

### Steps

#### 4.1 Install the PWA Plugin

```bash
bun add -d vite-plugin-pwa
```

#### 4.2 Generate PWA Icons

You need app icons in multiple sizes. The easiest approach:

1. Create a 512x512 PNG logo for your app (or use a placeholder)
2. Go to https://www.pwabuilder.com/imageGenerator
3. Upload your image and download the generated icons
4. Place them in `public/` folder

For now, create placeholder icons. Create the `public/` folder if it doesn't exist:

```bash
mkdir -p public
```

Create a simple SVG icon as `public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#0066cc"/>
  <text x="256" y="300" font-family="Arial" font-size="280" fill="white" text-anchor="middle">Q</text>
</svg>
```

> **Note**: For production, generate proper PNG icons in sizes: 192x192 and 512x512 (minimum required).

For development, you can create simple placeholder PNGs or use an online converter to generate `pwa-192x192.png` and `pwa-512x512.png` from your SVG.

#### 4.3 Configure vite-plugin-pwa

This is where we tell the browser "this website can be installed as an app." The plugin generates all the necessary files (manifest.json, service worker) automatically.

Update `vite.config.ts`:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
   plugins: [
      react(),
      VitePWA({
         // How should the service worker update?
         // "autoUpdate" = check for updates automatically, install in background
         // "prompt" = ask user before updating (good for complex apps)
         registerType: "autoUpdate",

         // Extra files to include in the service worker precache
         includeAssets: ["icon.svg"],

         // WEB APP MANIFEST: This tells browsers about your app
         // When a user installs the PWA, this info is used
         manifest: {
            // Full name shown in app launcher
            name: "Quiver - Idea Capture",
            // Short name for home screen (12 chars max recommended)
            short_name: "Quiver",
            // Description for app stores/installers
            description: "Capture and develop your ideas anywhere",
            // Color of the title bar on mobile devices
            theme_color: "#0066cc",
            // Background color of splash screen when app launches
            background_color: "#f5f5f5",
            // "standalone" = no browser UI (looks like native app)
            // "minimal-ui" = small browser controls
            // "fullscreen" = takes entire screen (good for games)
            display: "standalone",
            // What URLs this PWA controls (usually just "/")
            scope: "/",
            // What URL to open when launched from home screen
            start_url: "/",

            // ICONS: You need at least 192x192 and 512x512
            // The browser picks the best size for each situation
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
                  // "maskable" icons can be cropped into circles/shapes
                  // by Android. Provide safe padding around your logo.
                  src: "pwa-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable",
               },
            ],
         },

         // WORKBOX CONFIG: Controls the service worker behavior
         workbox: {
            // Which files to cache for offline use
            // This pattern caches your app shell (HTML, CSS, JS, images)
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
         },
      }),
   ],
   resolve: {
      alias: {
         "@": path.resolve(__dirname, "./src"),
      },
   },
});
```

**Key concepts explained:**

| Setting                      | What It Does                    | Why We Chose This                               |
| ---------------------------- | ------------------------------- | ----------------------------------------------- |
| `registerType: 'autoUpdate'` | Updates service worker silently | Users always get latest version without prompts |
| `display: 'standalone'`      | Hides browser chrome            | Feels like a native app                         |
| `theme_color`                | Colors the mobile status bar    | Brand consistency                               |
| `globPatterns`               | Files to precache               | App loads instantly, even offline               |

#### 4.4 Add the Install Prompt Component

Browsers have their own "Add to Home Screen" prompts, but they're easy to miss. We'll create a custom prompt that appears after the user has been using the app for a few seconds - proving they're engaged before asking them to install.

**How PWA installation works:**

1. Browser detects the app meets PWA criteria (HTTPS, manifest, service worker)
2. Browser fires `beforeinstallprompt` event
3. We catch this event and save it
4. Later, we show our custom UI and call `event.prompt()` when user clicks "Install"

Create `src/components/InstallPrompt.tsx`:

```tsx
// src/components/InstallPrompt.tsx
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
   prompt(): Promise<void>;
   userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
   const [installPrompt, setInstallPrompt] =
      useState<BeforeInstallPromptEvent | null>(null);
   const [isInstalled, setIsInstalled] = useState(false);
   const [showPrompt, setShowPrompt] = useState(false);

   useEffect(() => {
      // Check if already installed
      if (window.matchMedia("(display-mode: standalone)").matches) {
         setIsInstalled(true);
         return;
      }

      // Listen for the install prompt
      const handleBeforeInstall = (e: Event) => {
         e.preventDefault();
         setInstallPrompt(e as BeforeInstallPromptEvent);
         // Show our custom prompt after a delay
         setTimeout(() => setShowPrompt(true), 3000);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);

      // Listen for successful install
      window.addEventListener("appinstalled", () => {
         setIsInstalled(true);
         setShowPrompt(false);
      });

      return () => {
         window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
   }, []);

   const handleInstall = async () => {
      if (!installPrompt) return;

      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;

      if (outcome === "accepted") {
         setIsInstalled(true);
      }
      setShowPrompt(false);
   };

   const handleDismiss = () => {
      setShowPrompt(false);
   };

   // Don't show if already installed or no prompt available
   if (isInstalled || !showPrompt) return null;

   return (
      <div className="install-prompt">
         <div className="install-prompt-content">
            <p>
               <strong>Install Quiver</strong>
            </p>
            <p>Add to your home screen for quick access</p>
            <div className="install-prompt-actions">
               <button onClick={handleInstall} className="btn-install">
                  Install
               </button>
               <button onClick={handleDismiss} className="btn-dismiss">
                  Not now
               </button>
            </div>
         </div>
      </div>
   );
}
```

#### 4.5 Create an iOS Install Instructions Component

iOS doesn't support the install prompt API, so we need manual instructions:

```tsx
// src/components/IOSInstallInstructions.tsx
import { useState, useEffect } from "react";

export function IOSInstallInstructions() {
   const [show, setShow] = useState(false);

   useEffect(() => {
      // Detect iOS Safari (not in standalone mode)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = window.matchMedia(
         "(display-mode: standalone)"
      ).matches;
      const isSafari =
         /Safari/.test(navigator.userAgent) &&
         !/Chrome/.test(navigator.userAgent);

      if (isIOS && isSafari && !isStandalone) {
         // Show after a delay
         setTimeout(() => setShow(true), 5000);
      }
   }, []);

   if (!show) return null;

   return (
      <div className="ios-install-instructions">
         <button className="close-btn" onClick={() => setShow(false)}>
            ×
         </button>
         <p>
            <strong>Install Quiver</strong>
         </p>
         <p>
            Tap the share button <span className="share-icon">⬆️</span> then
            "Add to Home Screen"
         </p>
      </div>
   );
}
```

#### 4.6 Add PWA Styles

Add these styles to `src/index.css`:

```css
/* Add to src/index.css */

/* Install Prompt */
.install-prompt {
   position: fixed;
   bottom: 20px;
   left: 20px;
   right: 20px;
   background: white;
   border-radius: 12px;
   padding: 16px;
   box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
   z-index: 1000;
   animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
   from {
      transform: translateY(100%);
      opacity: 0;
   }
   to {
      transform: translateY(0);
      opacity: 1;
   }
}

.install-prompt-content p {
   margin-bottom: 8px;
}

.install-prompt-actions {
   display: flex;
   gap: 12px;
   margin-top: 12px;
}

.btn-install {
   background-color: #0066cc;
   color: white;
   padding: 10px 20px;
   border: none;
   border-radius: 6px;
   cursor: pointer;
   font-weight: 500;
}

.btn-dismiss {
   background-color: transparent;
   color: #666;
   padding: 10px 20px;
   border: none;
   cursor: pointer;
}

/* iOS Instructions */
.ios-install-instructions {
   position: fixed;
   bottom: 20px;
   left: 20px;
   right: 20px;
   background: #333;
   color: white;
   border-radius: 12px;
   padding: 16px;
   z-index: 1000;
}

.ios-install-instructions .close-btn {
   position: absolute;
   top: 8px;
   right: 12px;
   background: none;
   border: none;
   color: white;
   font-size: 24px;
   cursor: pointer;
}

.ios-install-instructions p {
   margin-bottom: 4px;
}

.share-icon {
   display: inline-block;
}
```

#### 4.7 Update App to Include PWA Components

Update `src/App.tsx` to include the install prompts:

```tsx
// src/App.tsx
import { useIdeas } from "@/hooks/useIdeas";
import { IdeaForm } from "@/components/IdeaForm";
import { IdeaCard } from "@/components/IdeaCard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { IOSInstallInstructions } from "@/components/IOSInstallInstructions";

function App() {
   const { ideas, loading, error, addIdea, editIdea, removeIdea } = useIdeas();

   return (
      <div className="app-container">
         <header className="app-header">
            <h1>Quiver</h1>
            <p>Capture and develop your ideas</p>
         </header>

         <main className="app-main">
            <IdeaForm onSubmit={addIdea} />

            {error && <div className="error-message">{error}</div>}

            {loading ? (
               <div className="loading">Loading ideas...</div>
            ) : ideas.length === 0 ? (
               <div className="empty-state">
                  <p>No ideas yet!</p>
                  <p>Start capturing your thoughts above.</p>
               </div>
            ) : (
               <div className="ideas-list">
                  {ideas.map((idea) => (
                     <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onUpdate={editIdea}
                        onDelete={removeIdea}
                     />
                  ))}
               </div>
            )}
         </main>

         <footer className="app-footer">
            <p>
               {ideas.length} idea{ideas.length !== 1 ? "s" : ""} captured
            </p>
         </footer>

         {/* PWA Install Prompts */}
         <InstallPrompt />
         <IOSInstallInstructions />
      </div>
   );
}

export default App;
```

#### 4.8 Update index.html

Ensure your `index.html` has proper meta tags:

```html
<!DOCTYPE html>
<html lang="en">
   <head>
      <meta charset="UTF-8" />
      <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      <meta
         name="viewport"
         content="width=device-width, initial-scale=1.0, viewport-fit=cover"
      />
      <meta name="theme-color" content="#0066cc" />
      <meta
         name="description"
         content="Capture and develop your ideas anywhere"
      />
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

### Verification

**Important**: PWA features only work in production builds, not in development mode!

1. **Build and preview** the app:

   ```bash
   bun run build
   bun run preview
   ```

2. **Open Chrome DevTools** (F12) and go to the **Application** tab

3. **Check the Manifest**:

   -  Click "Manifest" in the sidebar
   -  You should see your app name, icons, and colors
   -  All icons should be valid (no errors)

4. **Check the Service Worker**:

   -  Click "Service Workers" in the sidebar
   -  You should see a service worker registered
   -  Status should be "activated and running"

5. **Test Installation**:

   -  In the browser address bar, you should see an install icon
   -  Click it to install the app
   -  The app should open in its own window without browser chrome

6. **Test on Mobile** (optional but recommended):
   -  Deploy to Vercel (see Milestone 7) or use ngrok
   -  Open on your phone
   -  Android: You should see an "Add to Home Screen" banner
   -  iOS: Use Safari's share menu → "Add to Home Screen"

**Checkpoint**: Your app is now installable as a PWA!

---

**Commit your progress**:

```bash
git add .
git commit -m "Milestone 4: PWA configuration with install prompts"
```

---

## Milestone 5: Offline Support & Caching

**Time estimate**: 60-90 minutes

### Objective

Make your app work offline by implementing proper caching strategies and offline data storage. By the end, users can capture ideas without an internet connection, and the app will sync when back online.

### Why Offline Support Matters

Ideas don't wait for WiFi. You might have a breakthrough thought:

-  On the subway (no signal)
-  On a plane (no internet)
-  In a basement (weak connection)
-  When your ISP is down

An idea capture app that requires internet is fundamentally broken. This milestone fixes that.

**Our offline strategy:**

1. **Cache the app itself**: Service worker stores HTML/CSS/JS so the app loads offline
2. **Cache data locally**: IndexedDB stores ideas on the device
3. **Queue offline changes**: Track what changed while offline
4. **Sync when online**: Push queued changes to the server

### Concepts to Understand

-  **Caching Strategies** (how the service worker decides where to get data):

   | Strategy                 | How It Works                                          | Best For                        |
   | ------------------------ | ----------------------------------------------------- | ------------------------------- |
   | **CacheFirst**           | Check cache, only hit network if cache misses         | Static assets (images, fonts)   |
   | **NetworkFirst**         | Try network, fall back to cache on failure            | API data you want fresh         |
   | **StaleWhileRevalidate** | Return cached immediately, update cache in background | Data that can be slightly stale |

-  **IndexedDB**: A browser database for storing data offline (more capable than localStorage - can store megabytes, supports queries)
-  **Background Sync**: Queue actions when offline, execute when back online (browser handles retry)

### Steps

#### 5.1 Update Workbox Configuration for Runtime Caching

Update the `vite.config.ts` to add runtime caching strategies:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
   plugins: [
      react(),
      VitePWA({
         registerType: "autoUpdate",
         includeAssets: ["icon.svg"],
         manifest: {
            name: "Quiver - Idea Capture",
            short_name: "Quiver",
            description: "Capture and develop your ideas anywhere",
            theme_color: "#0066cc",
            background_color: "#f5f5f5",
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
                  purpose: "maskable",
               },
            ],
         },
         workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
            runtimeCaching: [
               {
                  // Cache API calls to Turso
                  urlPattern: /^https:\/\/.*\.turso\.io\/.*/i,
                  handler: "NetworkFirst",
                  options: {
                     cacheName: "api-cache",
                     expiration: {
                        maxEntries: 100,
                        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                     },
                     networkTimeoutSeconds: 10,
                  },
               },
               {
                  // Cache Google Fonts
                  urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                  handler: "CacheFirst",
                  options: {
                     cacheName: "google-fonts-cache",
                     expiration: {
                        maxEntries: 10,
                        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                     },
                  },
               },
            ],
         },
      }),
   ],
   resolve: {
      alias: {
         "@": path.resolve(__dirname, "./src"),
      },
   },
});
```

#### 5.2 Create an Offline Storage Layer with IndexedDB

IndexedDB is like having a database inside the browser. It's more powerful than localStorage:

-  Can store megabytes (not just 5MB)
-  Supports indexes for fast queries
-  Handles complex data structures (not just strings)

We use the `idb` library which wraps IndexedDB's callback-based API with modern Promises.

Install the idb library:

```bash
bun add idb
```

Create `src/lib/offline-storage.ts`:

```ts
// src/lib/offline-storage.ts
import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { Idea, CreateIdeaInput } from "@/types/idea";

interface QuiverDB extends DBSchema {
   ideas: {
      key: number;
      value: Idea;
      indexes: { "by-created": Date };
   };
   pendingActions: {
      key: number;
      value: {
         id: number;
         type: "create" | "update" | "delete";
         data: CreateIdeaInput | Partial<Idea> | number;
         timestamp: Date;
      };
   };
}

let dbPromise: Promise<IDBPDatabase<QuiverDB>> | null = null;

function getDB() {
   if (!dbPromise) {
      dbPromise = openDB<QuiverDB>("quiver-db", 1, {
         upgrade(db) {
            // Ideas store for cached data
            const ideasStore = db.createObjectStore("ideas", { keyPath: "id" });
            ideasStore.createIndex("by-created", "createdAt");

            // Pending actions for offline sync
            db.createObjectStore("pendingActions", {
               keyPath: "id",
               autoIncrement: true,
            });
         },
      });
   }
   return dbPromise;
}

// Cache ideas locally
export async function cacheIdeas(ideas: Idea[]): Promise<void> {
   const db = await getDB();
   const tx = db.transaction("ideas", "readwrite");
   await Promise.all([...ideas.map((idea) => tx.store.put(idea)), tx.done]);
}

// Get cached ideas
export async function getCachedIdeas(): Promise<Idea[]> {
   const db = await getDB();
   const ideas = await db.getAllFromIndex("ideas", "by-created");
   return ideas.reverse(); // Newest first
}

// Cache a single idea
export async function cacheIdea(idea: Idea): Promise<void> {
   const db = await getDB();
   await db.put("ideas", idea);
}

// Remove a cached idea
export async function removeCachedIdea(id: number): Promise<void> {
   const db = await getDB();
   await db.delete("ideas", id);
}

// Queue an action for later sync
export async function queueAction(
   type: "create" | "update" | "delete",
   data: CreateIdeaInput | Partial<Idea> | number
): Promise<void> {
   const db = await getDB();
   await db.add("pendingActions", {
      id: Date.now(), // Temporary ID
      type,
      data,
      timestamp: new Date(),
   });
}

// Get all pending actions
export async function getPendingActions() {
   const db = await getDB();
   return db.getAll("pendingActions");
}

// Clear a pending action after sync
export async function clearPendingAction(id: number): Promise<void> {
   const db = await getDB();
   await db.delete("pendingActions", id);
}

// Clear all pending actions
export async function clearAllPendingActions(): Promise<void> {
   const db = await getDB();
   await db.clear("pendingActions");
}
```

#### 5.3 Create an Online Status Hook

Create `src/hooks/useOnlineStatus.ts`:

```ts
// src/hooks/useOnlineStatus.ts
import { useState, useEffect, useCallback } from "react";

export function useOnlineStatus() {
   const [isOnline, setIsOnline] = useState(navigator.onLine);
   const [wasOffline, setWasOffline] = useState(false);

   useEffect(() => {
      const handleOnline = () => {
         setIsOnline(true);
         if (wasOffline) {
            // Trigger sync when coming back online
            window.dispatchEvent(new CustomEvent("app-back-online"));
         }
      };

      const handleOffline = () => {
         setIsOnline(false);
         setWasOffline(true);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
         window.removeEventListener("online", handleOnline);
         window.removeEventListener("offline", handleOffline);
      };
   }, [wasOffline]);

   return { isOnline, wasOffline };
}
```

#### 5.4 Update the Ideas Hook for Offline Support

Update `src/hooks/useIdeas.ts`:

```ts
// src/hooks/useIdeas.ts
import { useState, useEffect, useCallback } from "react";
import type { Idea, CreateIdeaInput, UpdateIdeaInput } from "@/types/idea";
import * as ideasLib from "@/lib/ideas";
import * as offlineStorage from "@/lib/offline-storage";
import { useOnlineStatus } from "./useOnlineStatus";

export function useIdeas() {
   const [ideas, setIdeas] = useState<Idea[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [syncing, setSyncing] = useState(false);
   const { isOnline } = useOnlineStatus();

   // Sync pending actions when back online
   const syncPendingActions = useCallback(async () => {
      if (!isOnline) return;

      setSyncing(true);
      try {
         const pendingActions = await offlineStorage.getPendingActions();

         for (const action of pendingActions) {
            try {
               if (action.type === "create") {
                  await ideasLib.createIdea(action.data as CreateIdeaInput);
               } else if (action.type === "update") {
                  const updateData = action.data as Partial<Idea> & {
                     id: number;
                  };
                  await ideasLib.updateIdea(updateData.id, updateData);
               } else if (action.type === "delete") {
                  await ideasLib.archiveIdea(action.data as number);
               }
               await offlineStorage.clearPendingAction(action.id);
            } catch (err) {
               console.error("Failed to sync action:", action, err);
            }
         }

         // Refresh from server after sync
         await fetchIdeas();
      } finally {
         setSyncing(false);
      }
   }, [isOnline]);

   // Listen for back-online event
   useEffect(() => {
      const handleBackOnline = () => {
         syncPendingActions();
      };

      window.addEventListener("app-back-online", handleBackOnline);
      return () =>
         window.removeEventListener("app-back-online", handleBackOnline);
   }, [syncPendingActions]);

   // Fetch ideas (from server if online, from cache if offline)
   const fetchIdeas = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);

         if (isOnline) {
            // Fetch from server and cache
            const data = await ideasLib.getIdeas();
            setIdeas(data);
            await offlineStorage.cacheIdeas(data);
         } else {
            // Load from cache
            const cachedData = await offlineStorage.getCachedIdeas();
            setIdeas(cachedData);
         }
      } catch (err) {
         // Fall back to cache on error
         try {
            const cachedData = await offlineStorage.getCachedIdeas();
            setIdeas(cachedData);
            setError("Using cached data (offline)");
         } catch {
            setError(
               err instanceof Error ? err.message : "Failed to fetch ideas"
            );
         }
      } finally {
         setLoading(false);
      }
   }, [isOnline]);

   // Initial fetch
   useEffect(() => {
      fetchIdeas();
   }, [fetchIdeas]);

   // Create a new idea (with offline support)
   const addIdea = useCallback(
      async (input: CreateIdeaInput) => {
         try {
            if (isOnline) {
               const newIdea = await ideasLib.createIdea(input);
               setIdeas((prev) => [newIdea, ...prev]);
               await offlineStorage.cacheIdea(newIdea);
               return newIdea;
            } else {
               // Create optimistic local idea
               const tempIdea: Idea = {
                  id: Date.now(), // Temporary ID
                  title: input.title,
                  content: input.content || null,
                  tags: input.tags || [],
                  urls: input.urls || [],
                  archived: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
               };
               setIdeas((prev) => [tempIdea, ...prev]);
               await offlineStorage.cacheIdea(tempIdea);
               await offlineStorage.queueAction("create", input);
               return tempIdea;
            }
         } catch (err) {
            setError(
               err instanceof Error ? err.message : "Failed to create idea"
            );
            throw err;
         }
      },
      [isOnline]
   );

   // Update an idea (with offline support)
   const editIdea = useCallback(
      async (id: number, input: UpdateIdeaInput) => {
         try {
            if (isOnline) {
               const updated = await ideasLib.updateIdea(id, input);
               if (updated) {
                  setIdeas((prev) =>
                     prev.map((idea) => (idea.id === id ? updated : idea))
                  );
                  await offlineStorage.cacheIdea(updated);
               }
               return updated;
            } else {
               // Optimistic update
               const updatedIdea = ideas.find((i) => i.id === id);
               if (updatedIdea) {
                  const newIdea = {
                     ...updatedIdea,
                     ...input,
                     updatedAt: new Date(),
                  };
                  setIdeas((prev) =>
                     prev.map((idea) => (idea.id === id ? newIdea : idea))
                  );
                  await offlineStorage.cacheIdea(newIdea as Idea);
                  await offlineStorage.queueAction("update", { id, ...input });
               }
               return updatedIdea;
            }
         } catch (err) {
            setError(
               err instanceof Error ? err.message : "Failed to update idea"
            );
            throw err;
         }
      },
      [isOnline, ideas]
   );

   // Archive an idea (with offline support)
   const removeIdea = useCallback(
      async (id: number) => {
         try {
            if (isOnline) {
               await ideasLib.archiveIdea(id);
            } else {
               await offlineStorage.queueAction("delete", id);
            }
            setIdeas((prev) => prev.filter((idea) => idea.id !== id));
            await offlineStorage.removeCachedIdea(id);
         } catch (err) {
            setError(
               err instanceof Error ? err.message : "Failed to archive idea"
            );
            throw err;
         }
      },
      [isOnline]
   );

   return {
      ideas,
      loading,
      error,
      syncing,
      isOnline,
      addIdea,
      editIdea,
      removeIdea,
      refreshIdeas: fetchIdeas,
   };
}
```

#### 5.5 Create an Offline Indicator Component

Create `src/components/OfflineIndicator.tsx`:

```tsx
// src/components/OfflineIndicator.tsx
interface OfflineIndicatorProps {
   isOnline: boolean;
   syncing: boolean;
}

export function OfflineIndicator({ isOnline, syncing }: OfflineIndicatorProps) {
   if (isOnline && !syncing) return null;

   return (
      <div className={`offline-indicator ${syncing ? "syncing" : "offline"}`}>
         {syncing ? (
            <span>Syncing...</span>
         ) : (
            <span>You're offline. Changes will sync when connected.</span>
         )}
      </div>
   );
}
```

#### 5.6 Add Offline Indicator Styles

Add to `src/index.css`:

```css
/* Add to src/index.css */

/* Offline Indicator */
.offline-indicator {
   position: fixed;
   top: 0;
   left: 0;
   right: 0;
   padding: 8px 16px;
   text-align: center;
   font-size: 0.875rem;
   z-index: 1001;
}

.offline-indicator.offline {
   background-color: #ff6b6b;
   color: white;
}

.offline-indicator.syncing {
   background-color: #ffd93d;
   color: #333;
}

/* Adjust app container when offline indicator is showing */
body:has(.offline-indicator) .app-container {
   padding-top: 50px;
}
```

#### 5.7 Update App Component with Offline Indicator

Update `src/App.tsx`:

```tsx
// src/App.tsx
import { useIdeas } from "@/hooks/useIdeas";
import { IdeaForm } from "@/components/IdeaForm";
import { IdeaCard } from "@/components/IdeaCard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { IOSInstallInstructions } from "@/components/IOSInstallInstructions";
import { OfflineIndicator } from "@/components/OfflineIndicator";

function App() {
   const {
      ideas,
      loading,
      error,
      syncing,
      isOnline,
      addIdea,
      editIdea,
      removeIdea,
   } = useIdeas();

   return (
      <>
         <OfflineIndicator isOnline={isOnline} syncing={syncing} />

         <div className="app-container">
            <header className="app-header">
               <h1>Quiver</h1>
               <p>Capture and develop your ideas</p>
            </header>

            <main className="app-main">
               <IdeaForm onSubmit={addIdea} />

               {error && <div className="error-message">{error}</div>}

               {loading ? (
                  <div className="loading">Loading ideas...</div>
               ) : ideas.length === 0 ? (
                  <div className="empty-state">
                     <p>No ideas yet!</p>
                     <p>Start capturing your thoughts above.</p>
                  </div>
               ) : (
                  <div className="ideas-list">
                     {ideas.map((idea) => (
                        <IdeaCard
                           key={idea.id}
                           idea={idea}
                           onUpdate={editIdea}
                           onDelete={removeIdea}
                        />
                     ))}
                  </div>
               )}
            </main>

            <footer className="app-footer">
               <p>
                  {ideas.length} idea{ideas.length !== 1 ? "s" : ""} captured
                  {!isOnline && " (offline)"}
               </p>
            </footer>

            <InstallPrompt />
            <IOSInstallInstructions />
         </div>
      </>
   );
}

export default App;
```

#### 5.8 Create an Offline Fallback Page

Create `public/offline.html`:

```html
<!DOCTYPE html>
<html lang="en">
   <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Quiver - Offline</title>
      <style>
         * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
         }
         body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #f5f5f5;
            padding: 20px;
         }
         .container {
            text-align: center;
            max-width: 400px;
         }
         h1 {
            color: #0066cc;
            margin-bottom: 16px;
         }
         p {
            color: #666;
            margin-bottom: 24px;
         }
         button {
            background-color: #0066cc;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
         }
         button:hover {
            background-color: #0052a3;
         }
      </style>
   </head>
   <body>
      <div class="container">
         <h1>Quiver</h1>
         <p>
            You're currently offline. Your cached ideas are still available in
            the app.
         </p>
         <button onclick="window.location.reload()">Try Again</button>
      </div>
   </body>
</html>
```

### Verification

1. **Build and preview** the app:

   ```bash
   bun run build
   bun run preview
   ```

2. **Test offline mode**:

   -  Open Chrome DevTools → Application → Service Workers
   -  Check the "Offline" checkbox
   -  Refresh the page
   -  You should see the offline indicator banner
   -  Your previously loaded ideas should still appear

3. **Test offline creation**:

   -  While offline, create a new idea
   -  The idea should appear immediately in the list
   -  You should see "You're offline. Changes will sync when connected."

4. **Test sync when back online**:

   -  Uncheck the "Offline" checkbox
   -  You should see "Syncing..." briefly
   -  The idea you created offline should now be in your database
   -  Verify in Drizzle Studio: `bun run db:studio`

5. **Test IndexedDB storage**:
   -  In DevTools → Application → IndexedDB
   -  You should see `quiver-db` with `ideas` and `pendingActions` stores
   -  Cached ideas should be visible in the `ideas` store

**Checkpoint**: Your app now works fully offline!

---

**Commit your progress**:

```bash
git add .
git commit -m "Milestone 5: Offline support with IndexedDB and sync"
```

---

## Milestone 6: AI Brainstorming Integration

**Time estimate**: 90-120 minutes

### Objective

Add AI-powered brainstorming that analyzes your ideas and suggests new directions. By the end, users can request AI-generated suggestions based on their captured ideas.

### Why Add AI?

Capturing ideas is only half the battle. The real value comes from:

-  **Finding patterns** you didn't see ("You keep coming back to productivity tools...")
-  **Making connections** between unrelated ideas ("Your cooking app idea + your habit tracker idea could combine into...")
-  **Expanding half-baked thoughts** into actionable plans
-  **Breaking creative blocks** when you're stuck

We're using Claude 3.5 Haiku because:

-  **Fast**: Sub-second response times
-  **Cheap**: ~$0.25 per million input tokens
-  **Smart enough**: Haiku handles creative tasks well
-  **Streaming**: Shows text as it generates (feels responsive)

### Architecture Decision

For a pure client-side Vite app without a server, we have two options:

| Approach                 | Security        | Complexity | Best For        |
| ------------------------ | --------------- | ---------- | --------------- |
| **Direct browser calls** | API key exposed | Simple     | Personal apps   |
| **Serverless functions** | API key hidden  | More setup | Production apps |

For this MVP, we'll call the Claude API directly from the browser. This exposes your API key in the client code, which is acceptable for a personal app but not for a public one.

> **Production Note**: For a public app, you'd deploy serverless API routes (Vercel Functions, Cloudflare Workers) to keep your API key secure. The AI service code would barely change - just move it to the server.

### Steps

#### 6.1 Get Your Claude API Key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Add $5 credit (minimum required)

> **Alternative**: Use OpenAI's GPT-4o mini during development (no upfront cost). The code is nearly identical.

#### 6.2 Add API Key to Environment

Add to your `.env` file:

```bash
# .env
# ... existing variables ...

VITE_ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# OR for OpenAI:
# VITE_OPENAI_API_KEY=sk-your-openai-key-here
```

#### 6.3 Install the Anthropic SDK

```bash
bun add @anthropic-ai/sdk
```

For OpenAI alternative:

```bash
bun add openai
```

#### 6.4 Create the AI Service

This is where the magic happens. We'll create functions that:

1. Take the user's ideas as context
2. Build a thoughtful prompt
3. Stream Claude's response (so users see text appearing, not waiting for full response)

**Streaming vs non-streaming:**

-  Non-streaming: Wait 2-3 seconds, then show all text at once (feels slow)
-  Streaming: Text appears word-by-word as it's generated (feels instant)

Create `src/lib/ai.ts`:

```ts
// src/lib/ai.ts
import Anthropic from "@anthropic-ai/sdk";
import type { Idea } from "@/types/idea";

const anthropic = new Anthropic({
   apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
   dangerouslyAllowBrowser: true, // Required for client-side usage
});

export interface BrainstormResult {
   suggestions: string[];
   themes: string[];
   connections: string[];
}

export async function brainstormIdeas(
   ideas: Idea[],
   onStream?: (text: string) => void
): Promise<string> {
   // Build context from recent ideas
   const ideaContext = ideas
      .slice(0, 10) // Use last 10 ideas for context
      .map((idea) => {
         let text = `- ${idea.title}`;
         if (idea.content) text += `: ${idea.content}`;
         if (idea.tags.length > 0) text += ` [Tags: ${idea.tags.join(", ")}]`;
         return text;
      })
      .join("\n");

   const prompt = `You are a creative brainstorming partner. Based on the user's recent ideas below, suggest 5 new directions they could explore. Be creative, make unexpected connections, and offer fresh perspectives.

User's Recent Ideas:
${ideaContext}

Please provide:
1. 5 new idea suggestions that build on or connect their existing ideas
2. Common themes you notice across their ideas
3. Unexpected connections between seemingly unrelated ideas

Format your response in a clear, readable way with headers for each section.`;

   if (onStream) {
      // Streaming response
      let fullText = "";
      const stream = anthropic.messages.stream({
         model: "claude-3-5-haiku-20241022",
         max_tokens: 1024,
         messages: [{ role: "user", content: prompt }],
      });

      for await (const event of stream) {
         if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
         ) {
            fullText += event.delta.text;
            onStream(fullText);
         }
      }

      return fullText;
   } else {
      // Non-streaming response
      const response = await anthropic.messages.create({
         model: "claude-3-5-haiku-20241022",
         max_tokens: 1024,
         messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      return textBlock ? textBlock.text : "No response generated";
   }
}

// Alternative for single idea expansion
export async function expandIdea(
   idea: Idea,
   onStream?: (text: string) => void
): Promise<string> {
   const prompt = `Help me develop this idea further:

Title: ${idea.title}
${idea.content ? `Description: ${idea.content}` : ""}
${idea.tags.length > 0 ? `Tags: ${idea.tags.join(", ")}` : ""}

Please provide:
1. Three ways to expand or develop this idea
2. Potential challenges and how to address them
3. Related concepts or fields to explore
4. A simple next step to get started`;

   if (onStream) {
      let fullText = "";
      const stream = anthropic.messages.stream({
         model: "claude-3-5-haiku-20241022",
         max_tokens: 1024,
         messages: [{ role: "user", content: prompt }],
      });

      for await (const event of stream) {
         if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
         ) {
            fullText += event.delta.text;
            onStream(fullText);
         }
      }

      return fullText;
   } else {
      const response = await anthropic.messages.create({
         model: "claude-3-5-haiku-20241022",
         max_tokens: 1024,
         messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      return textBlock ? textBlock.text : "No response generated";
   }
}
```

#### 6.5 Create the OpenAI Alternative (Optional)

If you prefer OpenAI, create `src/lib/ai-openai.ts`:

```ts
// src/lib/ai-openai.ts (alternative to ai.ts)
import OpenAI from "openai";
import type { Idea } from "@/types/idea";

const openai = new OpenAI({
   apiKey: import.meta.env.VITE_OPENAI_API_KEY,
   dangerouslyAllowBrowser: true,
});

export async function brainstormIdeas(
   ideas: Idea[],
   onStream?: (text: string) => void
): Promise<string> {
   const ideaContext = ideas
      .slice(0, 10)
      .map((idea) => {
         let text = `- ${idea.title}`;
         if (idea.content) text += `: ${idea.content}`;
         if (idea.tags.length > 0) text += ` [Tags: ${idea.tags.join(", ")}]`;
         return text;
      })
      .join("\n");

   const prompt = `You are a creative brainstorming partner. Based on the user's recent ideas below, suggest 5 new directions they could explore.

User's Recent Ideas:
${ideaContext}

Please provide:
1. 5 new idea suggestions
2. Common themes you notice
3. Unexpected connections between ideas`;

   if (onStream) {
      let fullText = "";
      const stream = await openai.chat.completions.create({
         model: "gpt-4o-mini",
         messages: [{ role: "user", content: prompt }],
         stream: true,
      });

      for await (const chunk of stream) {
         const text = chunk.choices[0]?.delta?.content || "";
         fullText += text;
         onStream(fullText);
      }

      return fullText;
   } else {
      const response = await openai.chat.completions.create({
         model: "gpt-4o-mini",
         messages: [{ role: "user", content: prompt }],
      });

      return response.choices[0]?.message?.content || "No response generated";
   }
}
```

#### 6.6 Create the Brainstorm Component

Create `src/components/BrainstormPanel.tsx`:

```tsx
// src/components/BrainstormPanel.tsx
import { useState } from "react";
import type { Idea } from "@/types/idea";
import { brainstormIdeas, expandIdea } from "@/lib/ai";

interface BrainstormPanelProps {
   ideas: Idea[];
   selectedIdea?: Idea | null;
}

export function BrainstormPanel({ ideas, selectedIdea }: BrainstormPanelProps) {
   const [isLoading, setIsLoading] = useState(false);
   const [result, setResult] = useState<string>("");
   const [error, setError] = useState<string | null>(null);

   const handleBrainstorm = async () => {
      if (ideas.length === 0) {
         setError("Add some ideas first to get AI suggestions!");
         return;
      }

      setIsLoading(true);
      setError(null);
      setResult("");

      try {
         await brainstormIdeas(ideas, (text) => {
            setResult(text);
         });
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Failed to generate ideas"
         );
      } finally {
         setIsLoading(false);
      }
   };

   const handleExpandIdea = async () => {
      if (!selectedIdea) {
         setError("Select an idea to expand!");
         return;
      }

      setIsLoading(true);
      setError(null);
      setResult("");

      try {
         await expandIdea(selectedIdea, (text) => {
            setResult(text);
         });
      } catch (err) {
         setError(err instanceof Error ? err.message : "Failed to expand idea");
      } finally {
         setIsLoading(false);
      }
   };

   const handleClear = () => {
      setResult("");
      setError(null);
   };

   return (
      <div className="brainstorm-panel">
         <div className="brainstorm-header">
            <h2>AI Brainstorm</h2>
            <div className="brainstorm-actions">
               <button
                  onClick={handleBrainstorm}
                  disabled={isLoading || ideas.length === 0}
                  className="btn-brainstorm"
               >
                  {isLoading ? "Thinking..." : "Generate Ideas"}
               </button>
               {selectedIdea && (
                  <button
                     onClick={handleExpandIdea}
                     disabled={isLoading}
                     className="btn-expand"
                  >
                     Expand Selected
                  </button>
               )}
               {result && (
                  <button onClick={handleClear} className="btn-clear">
                     Clear
                  </button>
               )}
            </div>
         </div>

         {error && <div className="brainstorm-error">{error}</div>}

         {result ? (
            <div className="brainstorm-result">
               <pre>{result}</pre>
            </div>
         ) : (
            <div className="brainstorm-empty">
               {ideas.length === 0 ? (
                  <p>
                     Add some ideas first, then click "Generate Ideas" to get
                     AI-powered suggestions!
                  </p>
               ) : (
                  <p>
                     Click "Generate Ideas" to get AI-powered brainstorming
                     based on your {ideas.length} idea
                     {ideas.length !== 1 ? "s" : ""}.
                  </p>
               )}
            </div>
         )}

         {isLoading && (
            <div className="brainstorm-loading">
               <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
               </div>
            </div>
         )}
      </div>
   );
}
```

#### 6.7 Add Brainstorm Styles

Add to `src/index.css`:

```css
/* Add to src/index.css */

/* Brainstorm Panel */
.brainstorm-panel {
   background: white;
   border-radius: 8px;
   padding: 16px;
   margin-top: 24px;
   box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.brainstorm-header {
   display: flex;
   justify-content: space-between;
   align-items: center;
   margin-bottom: 16px;
   flex-wrap: wrap;
   gap: 12px;
}

.brainstorm-header h2 {
   font-size: 1.25rem;
   color: #333;
   margin: 0;
}

.brainstorm-actions {
   display: flex;
   gap: 8px;
   flex-wrap: wrap;
}

.btn-brainstorm {
   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
   color: white;
   border: none;
   padding: 10px 20px;
   border-radius: 6px;
   cursor: pointer;
   font-weight: 500;
   transition: transform 0.2s, box-shadow 0.2s;
}

.btn-brainstorm:hover:not(:disabled) {
   transform: translateY(-1px);
   box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-brainstorm:disabled {
   opacity: 0.6;
   cursor: not-allowed;
}

.btn-expand {
   background-color: #f0f0f0;
   color: #333;
   border: none;
   padding: 10px 20px;
   border-radius: 6px;
   cursor: pointer;
}

.btn-clear {
   background-color: transparent;
   color: #666;
   border: 1px solid #ddd;
   padding: 10px 20px;
   border-radius: 6px;
   cursor: pointer;
}

.brainstorm-result {
   background-color: #f8f9fa;
   border-radius: 6px;
   padding: 16px;
   max-height: 400px;
   overflow-y: auto;
}

.brainstorm-result pre {
   white-space: pre-wrap;
   word-wrap: break-word;
   font-family: inherit;
   font-size: 0.9rem;
   line-height: 1.6;
   margin: 0;
}

.brainstorm-empty {
   color: #666;
   text-align: center;
   padding: 24px;
}

.brainstorm-error {
   background-color: #fff0f0;
   color: #cc0000;
   padding: 12px;
   border-radius: 6px;
   margin-bottom: 16px;
}

.brainstorm-loading {
   display: flex;
   justify-content: center;
   padding: 20px;
}

.loading-dots {
   display: flex;
   gap: 8px;
}

.loading-dots span {
   width: 10px;
   height: 10px;
   background-color: #667eea;
   border-radius: 50%;
   animation: bounce 1.4s infinite ease-in-out;
}

.loading-dots span:nth-child(1) {
   animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
   animation-delay: -0.16s;
}

@keyframes bounce {
   0%,
   80%,
   100% {
      transform: scale(0);
   }
   40% {
      transform: scale(1);
   }
}
```

#### 6.8 Update App Component with Brainstorm Panel

Update `src/App.tsx`:

```tsx
// src/App.tsx
import { useState } from "react";
import { useIdeas } from "@/hooks/useIdeas";
import { IdeaForm } from "@/components/IdeaForm";
import { IdeaCard } from "@/components/IdeaCard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { IOSInstallInstructions } from "@/components/IOSInstallInstructions";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { BrainstormPanel } from "@/components/BrainstormPanel";
import type { Idea } from "@/types/idea";

function App() {
   const {
      ideas,
      loading,
      error,
      syncing,
      isOnline,
      addIdea,
      editIdea,
      removeIdea,
   } = useIdeas();
   const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

   const handleSelectIdea = (idea: Idea) => {
      setSelectedIdea(selectedIdea?.id === idea.id ? null : idea);
   };

   return (
      <>
         <OfflineIndicator isOnline={isOnline} syncing={syncing} />

         <div className="app-container">
            <header className="app-header">
               <h1>Quiver</h1>
               <p>Capture and develop your ideas</p>
            </header>

            <main className="app-main">
               <IdeaForm onSubmit={addIdea} />

               {error && <div className="error-message">{error}</div>}

               {loading ? (
                  <div className="loading">Loading ideas...</div>
               ) : ideas.length === 0 ? (
                  <div className="empty-state">
                     <p>No ideas yet!</p>
                     <p>Start capturing your thoughts above.</p>
                  </div>
               ) : (
                  <div className="ideas-list">
                     {ideas.map((idea) => (
                        <IdeaCard
                           key={idea.id}
                           idea={idea}
                           isSelected={selectedIdea?.id === idea.id}
                           onSelect={() => handleSelectIdea(idea)}
                           onUpdate={editIdea}
                           onDelete={removeIdea}
                        />
                     ))}
                  </div>
               )}

               {/* AI Brainstorming Panel */}
               <BrainstormPanel ideas={ideas} selectedIdea={selectedIdea} />
            </main>

            <footer className="app-footer">
               <p>
                  {ideas.length} idea{ideas.length !== 1 ? "s" : ""} captured
                  {!isOnline && " (offline)"}
               </p>
            </footer>

            <InstallPrompt />
            <IOSInstallInstructions />
         </div>
      </>
   );
}

export default App;
```

#### 6.9 Update IdeaCard for Selection

Update `src/components/IdeaCard.tsx` to support selection:

```tsx
// Add to IdeaCard props interface
interface IdeaCardProps {
   idea: Idea;
   isSelected?: boolean;
   onSelect?: () => void;
   onUpdate: (id: number, input: UpdateIdeaInput) => Promise<void>;
   onDelete: (id: number) => Promise<void>;
}

// Update the component to handle selection
export function IdeaCard({
   idea,
   isSelected,
   onSelect,
   onUpdate,
   onDelete,
}: IdeaCardProps) {
   // ... existing code ...

   return (
      <div
         className={`idea-card ${isSelected ? "selected" : ""}`}
         onClick={onSelect}
      >
         {/* ... existing content ... */}
      </div>
   );
}
```

Add the selected style to `src/index.css`:

```css
/* Add to src/index.css */

.idea-card.selected {
   border: 2px solid #667eea;
   box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.idea-card {
   cursor: pointer;
   transition: border-color 0.2s, box-shadow 0.2s;
}
```

### Verification

1. **Start the dev server**: `bun run dev`

2. **Test API connection**:

   -  Add a few ideas to your app
   -  Click "Generate Ideas"
   -  You should see streaming text appearing as the AI responds
   -  The response should reference your actual ideas

3. **Test idea expansion**:

   -  Click on an idea to select it (highlighted border)
   -  Click "Expand Selected"
   -  You should get detailed suggestions for that specific idea

4. **Test error handling**:

   -  If your API key is invalid, you should see an error message
   -  If you're offline, the brainstorm button should work but show an error

5. **Check API usage**:
   -  Go to https://console.anthropic.com
   -  Check your usage to verify API calls are being made

**Common Issues**:

-  "API key not found": Check your `.env` file has `VITE_ANTHROPIC_API_KEY`
-  "CORS error": Make sure `dangerouslyAllowBrowser: true` is set
-  "401 Unauthorized": Your API key is invalid or has no credits

**Checkpoint**: Your app now has AI-powered brainstorming!

---

**Commit your progress**:

```bash
git add .
git commit -m "Milestone 6: AI brainstorming with Claude"
```

---

## Milestone 7: Deployment to Vercel

**Time estimate**: 30-45 minutes

### Objective

Deploy your app to production so it's accessible from anywhere. By the end, you'll have a live URL where you (and others) can use Quiver.

### Steps

#### 7.1 Prepare Your Repository

First, ensure your code is committed and pushed to GitHub:

```bash
# If you haven't already initialized git
git init

# Add all files
git add .

# Commit
git commit -m "Quiver MVP ready for deployment"

# Create a new repository on GitHub (via github.com)
# Then link and push:
git remote add origin https://github.com/YOUR_USERNAME/quiver.git
git branch -M main
git push -u origin main
```

#### 7.2 Verify .gitignore

Make sure sensitive files aren't committed. Your `.gitignore` should include:

```
# .gitignore
node_modules
dist
.env
.env.local
.env.*.local
*.log
.DS_Store
```

#### 7.3 Create a Vercel Account

1. Go to https://vercel.com
2. Sign up with your GitHub account (recommended for easy integration)
3. Authorize Vercel to access your repositories

#### 7.4 Deploy via Vercel Dashboard

**Option A: Via Web Interface (Recommended for first deploy)**

1. Go to https://vercel.com/new
2. Click "Import Project"
3. Select your `quiver` repository from the list
4. Vercel auto-detects Vite - accept the defaults:
   -  Framework Preset: Vite
   -  Build Command: `bun run build`
   -  Output Directory: `dist`
5. **Add Environment Variables** (Critical!):
   -  Click "Environment Variables"
   -  Add each variable from your `.env` file:
      -  `VITE_TURSO_DATABASE_URL` = your Turso URL
      -  `VITE_TURSO_AUTH_TOKEN` = your Turso token
      -  `VITE_ANTHROPIC_API_KEY` = your Claude API key
6. Click "Deploy"

**Option B: Via CLI**

Install the Vercel CLI:

```bash
bun add -g vercel
```

Deploy:

```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

When prompted, link to your existing project or create a new one.

#### 7.5 Configure Environment Variables (if using CLI)

If you deployed via CLI, add environment variables in the dashboard:

1. Go to your project on vercel.com
2. Click "Settings" → "Environment Variables"
3. Add each variable:
   -  Name: `VITE_TURSO_DATABASE_URL`
   -  Value: Your Turso database URL
   -  Environment: Production, Preview, Development
4. Repeat for `VITE_TURSO_AUTH_TOKEN` and `VITE_ANTHROPIC_API_KEY`
5. Redeploy for changes to take effect:
   ```bash
   vercel --prod
   ```

#### 7.6 Set Up Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions
5. Vercel automatically provisions SSL

#### 7.7 Configure Automatic Deployments

By default, Vercel deploys automatically when you push to GitHub:

-  **Production**: Pushes to `main` branch
-  **Preview**: Pushes to other branches or pull requests

To customize:

1. Go to "Settings" → "Git"
2. Configure production branch and preview settings

#### 7.8 Test the Production Build

Before relying on production, verify everything works:

```bash
# Build locally
bun run build

# Preview the production build
bun run preview
```

Check for:

-  No build errors
-  Environment variables are loaded
-  PWA features work (service worker, manifest)

### Verification

1. **Access your deployed URL**:

   -  Vercel provides a URL like `quiver-xyz.vercel.app`
   -  Open it in your browser

2. **Test core functionality**:

   -  Create a new idea
   -  Refresh the page - idea should persist
   -  Edit and delete ideas

3. **Test PWA features**:

   -  Open Chrome DevTools → Application
   -  Verify service worker is registered
   -  Check manifest is loading correctly
   -  Try the install prompt

4. **Test AI brainstorming**:

   -  Add a few ideas
   -  Click "Generate Ideas"
   -  Should stream AI response

5. **Test on mobile**:

   -  Open your URL on your phone
   -  Install the PWA
   -  Test offline by enabling airplane mode

6. **Check Vercel dashboard**:
   -  Go to your project on vercel.com
   -  Check "Deployments" for build logs
   -  Check "Analytics" (if enabled) for traffic

**Common Deployment Issues**:

| Issue                | Solution                                    |
| -------------------- | ------------------------------------------- |
| Build fails          | Check build logs in Vercel dashboard        |
| Env vars not working | Ensure they start with `VITE_` and redeploy |
| Database errors      | Verify Turso credentials are correct        |
| 404 on refresh       | Add `vercel.json` with rewrites (see below) |

If you get 404s on page refresh, create `vercel.json`:

```json
{
   "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Checkpoint**: Your app is live on the internet!

---

**Commit your progress**:

```bash
git add .
git commit -m "Milestone 7: Deployed to Vercel"
git push
```

---

## Milestone 8: Testing & Polish

**Time estimate**: 60-90 minutes

### Objective

Ensure your app meets PWA standards, works smoothly on mobile devices, and provides a polished user experience. By the end, you'll have a production-quality app.

### Steps

#### 8.1 Run Lighthouse Audit

Lighthouse is Chrome's built-in tool for auditing web app quality.

1. Open your deployed app in Chrome
2. Open DevTools (F12)
3. Go to the "Lighthouse" tab
4. Select categories: Performance, Accessibility, Best Practices, SEO, PWA
5. Click "Analyze page load"

**Target scores**:

-  Performance: 90+
-  Accessibility: 90+
-  Best Practices: 90+
-  SEO: 90+
-  PWA: All checks passing

#### 8.2 Fix Common Lighthouse Issues

**Performance Issues**:

```css
/* Add to index.css for better performance */

/* Use system fonts to avoid font loading delays */
body {
   font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}

/* Optimize image rendering */
img {
   content-visibility: auto;
}
```

**Accessibility Issues**:

```tsx
// Ensure all interactive elements have accessible labels
<button
  onClick={handleDelete}
  aria-label="Archive this idea"
  title="Archive"
>
  Archive
</button>

// Add focus states
<input
  type="text"
  aria-label="Enter idea title"
  placeholder="Capture an idea..."
/>
```

Add focus styles to `src/index.css`:

```css
/* Add to src/index.css */

/* Visible focus states for accessibility */
button:focus-visible,
input:focus-visible,
textarea:focus-visible {
   outline: 2px solid #0066cc;
   outline-offset: 2px;
}

/* Skip link for keyboard users */
.skip-link {
   position: absolute;
   top: -40px;
   left: 0;
   background: #0066cc;
   color: white;
   padding: 8px;
   z-index: 100;
}

.skip-link:focus {
   top: 0;
}
```

Add skip link to `src/App.tsx`:

```tsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

<main id="main-content" className="app-main">
  {/* ... */}
</main>
```

**SEO Issues**:

Update `index.html` with complete meta tags:

```html
<head>
   <meta charset="UTF-8" />
   <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
   />

   <!-- SEO Meta Tags -->
   <title>Quiver - Capture and Develop Your Ideas</title>
   <meta
      name="description"
      content="An offline-first PWA for capturing, organizing, and developing your ideas with AI-powered brainstorming."
   />
   <meta
      name="keywords"
      content="ideas, notes, brainstorming, AI, offline, PWA"
   />
   <meta name="author" content="Your Name" />

   <!-- Open Graph / Social Media -->
   <meta property="og:type" content="website" />
   <meta property="og:title" content="Quiver - Idea Capture App" />
   <meta
      property="og:description"
      content="Capture and develop your ideas anywhere, even offline."
   />
   <meta property="og:image" content="/og-image.png" />

   <!-- Twitter -->
   <meta name="twitter:card" content="summary_large_image" />
   <meta name="twitter:title" content="Quiver - Idea Capture App" />
   <meta
      name="twitter:description"
      content="Capture and develop your ideas anywhere, even offline."
   />

   <!-- PWA Meta Tags -->
   <meta name="theme-color" content="#0066cc" />
   <meta name="apple-mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-status-bar-style" content="default" />
   <meta name="apple-mobile-web-app-title" content="Quiver" />
   <link rel="apple-touch-icon" href="/pwa-192x192.png" />

   <!-- Favicon -->
   <link rel="icon" type="image/svg+xml" href="/icon.svg" />
</head>
```

#### 8.3 Add Loading States

Create `src/components/LoadingSpinner.tsx`:

```tsx
// src/components/LoadingSpinner.tsx
export function LoadingSpinner({
   size = "medium",
}: {
   size?: "small" | "medium" | "large";
}) {
   const sizeClass = {
      small: "spinner-small",
      medium: "spinner-medium",
      large: "spinner-large",
   }[size];

   return (
      <div
         className={`spinner ${sizeClass}`}
         role="status"
         aria-label="Loading"
      >
         <div className="spinner-circle"></div>
      </div>
   );
}
```

Add spinner styles:

```css
/* Add to src/index.css */

.spinner {
   display: inline-flex;
   align-items: center;
   justify-content: center;
}

.spinner-small .spinner-circle {
   width: 16px;
   height: 16px;
}
.spinner-medium .spinner-circle {
   width: 24px;
   height: 24px;
}
.spinner-large .spinner-circle {
   width: 40px;
   height: 40px;
}

.spinner-circle {
   border: 3px solid #e0e0e0;
   border-top-color: #0066cc;
   border-radius: 50%;
   animation: spin 0.8s linear infinite;
}

@keyframes spin {
   to {
      transform: rotate(360deg);
   }
}
```

#### 8.4 Add Error Boundaries

Create `src/components/ErrorBoundary.tsx`:

```tsx
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";

interface Props {
   children: ReactNode;
   fallback?: ReactNode;
}

interface State {
   hasError: boolean;
   error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
   constructor(props: Props) {
      super(props);
      this.state = { hasError: false };
   }

   static getDerivedStateFromError(error: Error): State {
      return { hasError: true, error };
   }

   componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error("Error caught by boundary:", error, errorInfo);
   }

   render() {
      if (this.state.hasError) {
         return (
            this.props.fallback || (
               <div className="error-boundary">
                  <h2>Something went wrong</h2>
                  <p>Please refresh the page and try again.</p>
                  <button onClick={() => window.location.reload()}>
                     Refresh Page
                  </button>
               </div>
            )
         );
      }

      return this.props.children;
   }
}
```

Add error boundary styles:

```css
/* Add to src/index.css */

.error-boundary {
   text-align: center;
   padding: 40px;
   background: #fff0f0;
   border-radius: 8px;
   margin: 20px;
}

.error-boundary h2 {
   color: #cc0000;
   margin-bottom: 12px;
}

.error-boundary button {
   margin-top: 16px;
   padding: 10px 20px;
   background: #cc0000;
   color: white;
   border: none;
   border-radius: 4px;
   cursor: pointer;
}
```

Wrap your app in `src/main.tsx`:

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
   <React.StrictMode>
      <ErrorBoundary>
         <App />
      </ErrorBoundary>
   </React.StrictMode>
);
```

#### 8.5 Add Keyboard Shortcuts

Create `src/hooks/useKeyboardShortcuts.ts`:

```ts
// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from "react";

interface Shortcuts {
   [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcuts) {
   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         // Don't trigger shortcuts when typing in inputs
         if (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement
         ) {
            return;
         }

         const key = [
            e.ctrlKey || e.metaKey ? "mod" : "",
            e.shiftKey ? "shift" : "",
            e.key.toLowerCase(),
         ]
            .filter(Boolean)
            .join("+");

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

Use in your App component:

```tsx
// In src/App.tsx
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

function App() {
   const inputRef = useRef<HTMLInputElement>(null);

   useKeyboardShortcuts({
      "mod+n": () => inputRef.current?.focus(), // Focus new idea input
      "mod+b": () => handleBrainstorm(), // Trigger brainstorm
      escape: () => setSelectedIdea(null), // Deselect idea
   });

   // Pass inputRef to IdeaForm
   return (
      // ...
      <IdeaForm onSubmit={addIdea} inputRef={inputRef} />
      // ...
   );
}
```

#### 8.6 Add Confirmation Dialogs

Create `src/components/ConfirmDialog.tsx`:

```tsx
// src/components/ConfirmDialog.tsx
interface ConfirmDialogProps {
   isOpen: boolean;
   title: string;
   message: string;
   confirmText?: string;
   cancelText?: string;
   onConfirm: () => void;
   onCancel: () => void;
}

export function ConfirmDialog({
   isOpen,
   title,
   message,
   confirmText = "Confirm",
   cancelText = "Cancel",
   onConfirm,
   onCancel,
}: ConfirmDialogProps) {
   if (!isOpen) return null;

   return (
      <div className="dialog-overlay" onClick={onCancel}>
         <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{title}</h3>
            <p>{message}</p>
            <div className="dialog-actions">
               <button onClick={onCancel} className="btn-cancel">
                  {cancelText}
               </button>
               <button onClick={onConfirm} className="btn-confirm">
                  {confirmText}
               </button>
            </div>
         </div>
      </div>
   );
}
```

Add dialog styles:

```css
/* Add to src/index.css */

.dialog-overlay {
   position: fixed;
   inset: 0;
   background: rgba(0, 0, 0, 0.5);
   display: flex;
   align-items: center;
   justify-content: center;
   z-index: 1000;
}

.dialog {
   background: white;
   border-radius: 8px;
   padding: 24px;
   max-width: 400px;
   width: 90%;
}

.dialog h3 {
   margin-bottom: 8px;
}

.dialog p {
   color: #666;
   margin-bottom: 20px;
}

.dialog-actions {
   display: flex;
   justify-content: flex-end;
   gap: 12px;
}

.dialog .btn-cancel {
   background: #f0f0f0;
   color: #333;
   border: none;
   padding: 10px 20px;
   border-radius: 4px;
   cursor: pointer;
}

.dialog .btn-confirm {
   background: #cc0000;
   color: white;
   border: none;
   padding: 10px 20px;
   border-radius: 4px;
   cursor: pointer;
}
```

#### 8.7 Mobile-Specific Testing

Test these scenarios on a real mobile device:

**Touch Interactions**:

-  [ ] Tap to select ideas works
-  [ ] Swipe/scroll is smooth
-  [ ] Form inputs don't zoom on focus (font-size >= 16px)
-  [ ] Buttons have adequate touch targets (min 44x44px)

**PWA Installation**:

-  [ ] Android: "Add to Home Screen" banner appears
-  [ ] iOS: Can add via Share → Add to Home Screen
-  [ ] App opens in standalone mode (no browser chrome)
-  [ ] Splash screen appears during load

**Offline**:

-  [ ] App works with airplane mode on
-  [ ] Ideas sync when connection returns
-  [ ] Offline indicator shows correctly

**Performance**:

-  [ ] First load under 3 seconds on 4G
-  [ ] Interactions feel responsive
-  [ ] No janky scrolling

#### 8.8 Final Polish Checklist

Run through this checklist before considering the app complete:

**Functionality**:

-  [ ] Can create new ideas
-  [ ] Can edit existing ideas
-  [ ] Can archive/delete ideas
-  [ ] Ideas persist after refresh
-  [ ] AI brainstorming generates relevant suggestions
-  [ ] Idea expansion works for selected ideas

**PWA**:

-  [ ] Service worker registered
-  [ ] App is installable
-  [ ] Offline mode works
-  [ ] Data syncs when back online

**Accessibility**:

-  [ ] All interactive elements focusable
-  [ ] Keyboard navigation works
-  [ ] Screen reader compatible (test with VoiceOver/NVDA)
-  [ ] Color contrast meets WCAG AA

**Performance**:

-  [ ] Lighthouse score 90+ in all categories
-  [ ] No console errors
-  [ ] No memory leaks (check DevTools Memory tab)

**UX**:

-  [ ] Loading states for async operations
-  [ ] Error messages are helpful
-  [ ] Empty states guide the user
-  [ ] Confirmation for destructive actions

### Verification

1. **Run final Lighthouse audit** - All categories should be 90+

2. **Test on multiple devices**:

   -  Desktop Chrome
   -  Desktop Firefox
   -  Desktop Safari
   -  Android Chrome
   -  iOS Safari

3. **Test offline workflow**:

   -  Load app while online
   -  Go offline
   -  Create/edit ideas
   -  Go back online
   -  Verify sync

4. **Have someone else test it** - Fresh eyes catch issues you miss

**Checkpoint**: Your app is production-ready!

---

**Commit your progress**:

```bash
git add .
git commit -m "Milestone 8: Testing and polish complete"
git push
```

---

## Troubleshooting Guide

### Build & Development Issues

#### "Module not found" errors

```
Error: Cannot find module '@/lib/ideas'
```

**Solution**: Check your `tsconfig.json` has path aliases configured:

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

And `vite.config.ts` has the alias:

```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

#### TypeScript errors about missing types

```
Cannot find name 'import.meta'
```

**Solution**: Ensure `tsconfig.json` includes:

```json
{
   "compilerOptions": {
      "types": ["vite/client"]
   }
}
```

### Database Issues

#### "SQLITE_ERROR: no such table: ideas"

**Cause**: Migrations haven't been run.

**Solution**:

```bash
bunx drizzle-kit push
```

#### "LIBSQL_CLIENT_ERROR: Unauthorized"

**Cause**: Invalid Turso credentials.

**Solution**:

1. Verify your `.env` file has correct values
2. Regenerate token: `turso db tokens create quiver`
3. Check the URL format: `libsql://quiver-USERNAME.turso.io`

#### Database queries are slow

**Cause**: Missing indexes or inefficient queries.

**Solution**:

```sql
-- Run in Turso CLI or Drizzle Studio
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_archived ON ideas(archived) WHERE archived = 0;
```

### PWA Issues

#### Service worker not registering

**Cause**: Usually a development mode issue.

**Solution**: PWAs only work in production builds:

```bash
bun run build
bun run preview
```

#### Install prompt not showing

**Causes**:

1. Already installed or previously dismissed
2. Not enough user engagement
3. Missing manifest requirements

**Solutions**:

1. Test in incognito mode
2. Clear site data in DevTools → Application → Clear storage
3. Verify manifest in DevTools → Application → Manifest

#### Offline mode not working

**Cause**: Service worker not caching correctly.

**Solution**:

1. Check DevTools → Application → Cache Storage
2. Verify service worker is active
3. Ensure `workbox.globPatterns` includes all needed files

### AI Integration Issues

#### "API key not found"

**Cause**: Environment variable not loading.

**Solution**:

1. Ensure variable starts with `VITE_` for client-side access
2. Restart the dev server after adding env vars
3. Check `.env` file is in project root

#### CORS errors when calling Claude API

**Cause**: Browser security restrictions.

**Solution**: Ensure you have `dangerouslyAllowBrowser: true`:

```ts
const anthropic = new Anthropic({
   apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
   dangerouslyAllowBrowser: true,
});
```

#### "401 Unauthorized" from Claude API

**Causes**:

1. Invalid API key
2. No credits on account
3. Key was deleted/regenerated

**Solution**:

1. Verify key at https://console.anthropic.com
2. Add credits ($5 minimum)
3. Generate new key if needed

#### AI responses are slow

**Cause**: Not using streaming.

**Solution**: Use streaming for better UX:

```ts
const stream = anthropic.messages.stream({...})
for await (const event of stream) {
  // Process chunks as they arrive
}
```

### Deployment Issues

#### Vercel build fails

**Solution**: Check build logs. Common issues:

1. TypeScript errors - fix locally first with `bun run build`
2. Missing dependencies - check `package.json`
3. Environment variables - ensure they're set in Vercel dashboard

#### Environment variables not working in production

**Cause**: Variables not set in Vercel or wrong prefix.

**Solution**:

1. Go to Vercel dashboard → Settings → Environment Variables
2. Add all `VITE_*` variables
3. Redeploy after adding variables

#### 404 errors on page refresh

**Cause**: SPA routing not configured.

**Solution**: Add `vercel.json`:

```json
{
   "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Offline Sync Issues

#### Ideas created offline not syncing

**Cause**: Sync logic not triggering.

**Solution**: Check browser console for errors. Verify:

1. `app-back-online` event fires
2. `syncPendingActions` function runs
3. IndexedDB has queued actions

#### Duplicate ideas after sync

**Cause**: Offline IDs conflict with server IDs.

**Solution**: Use temporary negative IDs for offline items:

```ts
const tempIdea = {
   id: -Date.now(), // Negative to distinguish from server IDs
   // ...
};
```

---

## Next Steps: Browser Extension

The core app is complete, but automated tab capture requires a browser extension. Here's a roadmap for adding that feature.

### Why an Extension?

Web apps cannot access browser tabs due to security restrictions. A browser extension has elevated permissions and can:

-  Read all open tabs
-  Access tab URLs and titles
-  Send data to your web app

### Extension Architecture

```
quiver-extension/
├── manifest.json      # Extension configuration
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic
├── background.js      # Background service worker
└── icons/            # Extension icons
```

### Minimal manifest.json

```json
{
   "manifest_version": 3,
   "name": "Quiver Tab Capture",
   "version": "1.0",
   "description": "Capture browser tabs to Quiver",
   "permissions": ["tabs"],
   "action": {
      "default_popup": "popup.html",
      "default_icon": "icons/icon128.png"
   },
   "icons": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
   }
}
```

### Basic Tab Capture

```js
// popup.js
document.getElementById("capture").addEventListener("click", async () => {
   const tabs = await chrome.tabs.query({ currentWindow: true });

   const tabData = tabs.map((tab) => ({
      title: tab.title,
      url: tab.url,
   }));

   // Send to your web app
   await fetch("https://your-quiver-app.vercel.app/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabs: tabData }),
   });
});
```

### Development Time Estimate

| Task                       | Time            |
| -------------------------- | --------------- |
| Basic extension structure  | 1-2 hours       |
| Tab capture logic          | 1-2 hours       |
| Communication with web app | 2-3 hours       |
| API endpoint in web app    | 1-2 hours       |
| UI polish                  | 2-3 hours       |
| Firefox compatibility      | 2-4 hours       |
| **Total**                  | **10-16 hours** |

### Alternative: Web Share Target

A quicker solution that doesn't require an extension:

1. Add to your PWA manifest:

```json
{
   "share_target": {
      "action": "/share",
      "method": "GET",
      "params": {
         "title": "title",
         "text": "text",
         "url": "url"
      }
   }
}
```

2. Handle shared content in your app:

```ts
// Check URL params on load
const params = new URLSearchParams(window.location.search);
const sharedUrl = params.get("url");
const sharedTitle = params.get("title");

if (sharedUrl) {
   // Create idea with shared content
}
```

This allows users to share URLs from their browser to your PWA via the native share menu.

---

## Quick Reference

### Essential Commands

```bash
# Development
bun run dev              # Start development server
bun run build            # Build for production
bun run preview          # Preview production build

# Database
bun run db:generate      # Generate migrations
bun run db:push          # Push schema to database
bun run db:studio        # Open database GUI

# Deployment
vercel                   # Deploy to Vercel
vercel --prod           # Deploy to production
```

### Environment Variables

```bash
# .env
VITE_TURSO_DATABASE_URL=libsql://your-db.turso.io
VITE_TURSO_AUTH_TOKEN=your-token
VITE_ANTHROPIC_API_KEY=sk-ant-your-key

# For server-side (drizzle-kit)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

### Project Structure

```
quiver/
├── public/
│   ├── icon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── offline.html
├── src/
│   ├── components/
│   │   ├── IdeaCard.tsx
│   │   ├── IdeaForm.tsx
│   │   ├── BrainstormPanel.tsx
│   │   ├── InstallPrompt.tsx
│   │   ├── OfflineIndicator.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useIdeas.ts
│   │   ├── useOnlineStatus.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── lib/
│   │   ├── ideas.ts
│   │   ├── ai.ts
│   │   └── offline-storage.ts
│   ├── db/
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── types/
│   │   └── idea.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── drizzle/
│   └── migrations/
├── .env
├── vite.config.ts
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

### Key Documentation Links

-  **Bun**: https://bun.sh/docs
-  **Vite**: https://vitejs.dev/guide/
-  **vite-plugin-pwa**: https://vite-pwa-org.netlify.app/
-  **Turso**: https://docs.turso.tech/
-  **Drizzle ORM**: https://orm.drizzle.team/docs/overview
-  **Anthropic SDK**: https://docs.anthropic.com/
-  **Vercel**: https://vercel.com/docs

### Cost Summary

| Service      | Free Tier              | Estimated Cost   |
| ------------ | ---------------------- | ---------------- |
| Turso        | 500M reads, 10M writes | $0               |
| Vercel       | 100GB bandwidth        | $0               |
| Claude Haiku | -                      | ~$2.70/month     |
| **Total**    |                        | **~$2.70/month** |

---

## Congratulations!

You've built a production-ready, offline-first Progressive Web App with:

-  Full CRUD functionality for ideas
-  Cloud database with Turso
-  Offline support with IndexedDB
-  AI-powered brainstorming with Claude
-  PWA installation on any device
-  Deployed to Vercel

**What you've learned**:

-  Modern React development with Vite
-  Type-safe database access with Drizzle ORM
-  PWA concepts: service workers, caching, manifests
-  Offline-first architecture patterns
-  AI API integration with streaming
-  Production deployment workflows

**Keep building!** Some ideas for enhancements:

-  Add user authentication
-  Implement idea categories/folders
-  Add rich text editing
-  Build the browser extension
-  Add collaboration features
-  Implement idea search with full-text search

Happy coding!
