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
