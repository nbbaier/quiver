# Building Quiver: An Offline-First PWA in a Weekend

## Part 2: Database Architecture with Turso & Drizzle

*This is Part 2 of a 7-part series on building Quiver, an offline-first Progressive Web App for capturing and developing ideas with AI.*

---

At the end of Part 1, we had a React app that could capture ideas—but refresh the page and they vanished. Ideas stored in React state live only as long as the browser tab. We need persistence.

This post is about choosing and setting up a database, but it's also about a broader question: what does modern database architecture look like for side projects?

## The Case for SQLite in 2024

If you've built web apps in the last decade, you've probably defaulted to PostgreSQL. It's an excellent database—powerful, reliable, well-documented. For most production applications, it's the right choice.

But PostgreSQL comes with overhead:

- You need a server to run it (or a managed service)
- Connection pooling becomes important at scale
- Configuration isn't trivial
- The free tier of most providers is limited

For a personal project that might see 10 users (you, and your nine closest friends if you're lucky), this overhead starts to feel excessive.

SQLite takes a different approach. It's a database engine that reads and writes directly to a file. No server process, no network connections, no configuration. It's embedded in billions of devices—every iOS and Android phone runs SQLite, every Mac and Windows machine ships with it, every browser uses it internally.

The trade-off has always been that SQLite is local. You couldn't run it "in the cloud" because there was no cloud—it was just a file on disk.

That's what Turso changes.

## Turso: SQLite Goes Global

Turso is built on libSQL, a fork of SQLite that adds the network capabilities SQLite never had. When you create a Turso database, you get:

1. **A primary database** in a region you choose
2. **Edge replicas** that automatically sync from the primary
3. **A client library** that speaks the SQLite protocol over HTTP

From your code's perspective, you're just making SQLite queries. But those queries are hitting a globally-distributed database with single-digit millisecond latency from most locations.

The free tier offers:
- 500 databases
- 9GB total storage
- 1 billion row reads per month
- 25 million row writes per month

For a personal idea capture app, you could use this for years without paying a cent.

## Setting Up Turso

First, install the Turso CLI:

**macOS:**
```bash
brew install tursodatabase/tap/turso
```

**Linux/WSL:**
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Create an account:
```bash
turso auth signup
```

This opens your browser. Sign up with GitHub (recommended) or email. Once authenticated, verify:

```bash
turso auth whoami
```

Now create your database:

```bash
turso db create quiver
```

You need two pieces of information—the database URL and an auth token:

```bash
turso db show quiver --url
# Output: libsql://quiver-YOUR_USERNAME.turso.io

turso db tokens create quiver
# Output: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Save both values. We'll use them shortly.

## Environment Configuration

Create a `.env` file in your project root:

```bash
# For Node.js scripts (migrations, tests)
TURSO_DATABASE_URL=libsql://quiver-YOUR_USERNAME.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here

# For browser code (Vite requires this prefix)
VITE_TURSO_DATABASE_URL=libsql://quiver-YOUR_USERNAME.turso.io
VITE_TURSO_AUTH_TOKEN=your-auth-token-here
```

Why the duplication? Vite only exposes environment variables that start with `VITE_` to browser code—a security measure to prevent accidentally leaking secrets. But our migration scripts run in Node.js, which reads the non-prefixed versions. So we need both.

Add `.env` to your `.gitignore`:

```bash
echo ".env" >> .gitignore
```

Never commit database credentials to version control. Ever.

## Drizzle ORM: Type Safety Without the Weight

We could write raw SQL queries. For a small project, that's viable. But Drizzle ORM gives us something valuable: type safety.

Here's what I mean. With raw SQL:

```typescript
const result = await client.execute("SELECT * FROM ideas WHERE id = ?", [id]);
// result is... any? unknown? You're on your own.
```

With Drizzle:

```typescript
const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
// idea is typed as: { id: number, title: string, content: string | null, ... }
```

Your IDE knows the shape of your data. TypeScript catches errors at compile time. Refactoring becomes safe.

Drizzle achieves this with minimal runtime overhead. Unlike Prisma, which generates a client library and requires a build step, Drizzle is just functions that construct SQL strings. The query `db.select().from(ideas)` compiles to `SELECT * FROM ideas`. No magic, no translation layer.

Install the dependencies:

```bash
bun add drizzle-orm @libsql/client
bun add -d drizzle-kit dotenv
```

## Defining the Schema

The schema is the blueprint for your data. In Drizzle, you define it with TypeScript functions that map directly to SQL column types.

Create `src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const ideas = sqliteTable("ideas", {
  // Primary key with auto-increment
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Required field
  title: text("title").notNull(),

  // Optional field (can be null)
  content: text("content"),

  // JSON stored as text (SQLite doesn't have native arrays)
  tags: text("tags"),   // Will store: '["productivity", "app-idea"]'
  urls: text("urls"),   // Will store: '["https://example.com"]'

  // Boolean as integer (SQLite convention)
  archived: integer("archived", { mode: "boolean" }).default(false),

  // Timestamps as integers (Unix timestamps)
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Infer types from the schema
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
```

Let's break down some decisions here:

**JSON as text:** SQLite doesn't have native JSON or array types. We store arrays as JSON strings: `["tag1", "tag2"]`. It's a pragmatic choice—adding a separate `tags` table with a many-to-many relationship would be more "correct" but also more complex. For a personal app, JSON strings are fine.

**Boolean as integer:** SQLite stores booleans as 0 or 1. The `{ mode: "boolean" }` option tells Drizzle to convert automatically.

**Timestamps as integers:** We store Unix timestamps as integers, again using mode conversion. This is more portable than SQLite's datetime strings.

**Soft delete via archived:** Rather than permanently deleting ideas, we mark them as archived. Users can recover archived ideas, and we keep historical data.

The `$inferSelect` and `$inferInsert` types are Drizzle magic—they derive TypeScript types from your schema definition. When you add a column, the types update automatically.

## The Database Client

Create `src/db/index.ts`:

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url:
    import.meta.env.VITE_TURSO_DATABASE_URL ||
    process.env.TURSO_DATABASE_URL!,
  authToken:
    import.meta.env.VITE_TURSO_AUTH_TOKEN ||
    process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

This creates a single database client that we'll import throughout the app. The client handles HTTP connections to Turso, authentication, and connection reuse.

The conditional logic (`import.meta.env.VITE_* || process.env.*`) supports both browser code and Node.js scripts. In the browser, Vite provides `import.meta.env`. In Node.js scripts, we use `process.env`.

## Configuring Migrations

Migrations are version-controlled changes to your database schema. Instead of manually running `CREATE TABLE`, Drizzle compares your schema definition to the actual database and generates the necessary SQL.

Create `drizzle.config.ts`:

```typescript
import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
```

Add helper scripts to `package.json`:

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

Now push your schema to the database:

```bash
bunx drizzle-kit push
```

You should see output confirming the `ideas` table was created. You can verify in the Turso dashboard at [turso.tech/app](https://turso.tech/app), or use Drizzle Studio:

```bash
bun run db:studio
```

This opens a web interface where you can browse tables, run queries, and inspect data.

## Testing the Connection

Before integrating with our React app, let's verify the database works. Create a test script `src/db/test-connection.ts`:

```typescript
import { db } from "./index";
import { ideas } from "./schema";
import { eq } from "drizzle-orm";

async function testConnection() {
  console.log("Testing database connection...\n");

  // CREATE
  const [newIdea] = await db
    .insert(ideas)
    .values({
      title: "Test Idea",
      content: "This is a test to verify the database works!",
    })
    .returning();

  console.log("Created idea:", newIdea);
  console.log("Notice the auto-generated id and timestamps\n");

  // READ
  const allIdeas = await db.select().from(ideas);
  console.log("All ideas in database:", allIdeas);
  console.log(`Found ${allIdeas.length} idea(s)\n`);

  // DELETE (cleanup)
  await db.delete(ideas).where(eq(ideas.id, newIdea.id));
  console.log("Cleaned up test data\n");

  console.log("=".repeat(40));
  console.log("SUCCESS! Database connection verified.");
  console.log("=".repeat(40));
}

testConnection().catch(console.error);
```

Run it:

```bash
bun run src/db/test-connection.ts
```

You should see:
- A created idea with an auto-generated ID
- Timestamps that are set automatically
- The cleanup removing the test data

If this works, your database is properly configured.

## Understanding the Query Patterns

Let's look at what Drizzle queries actually do. These patterns will recur throughout the app:

**Select all rows:**
```typescript
const allIdeas = await db.select().from(ideas);
// SQL: SELECT * FROM ideas
```

**Select with conditions:**
```typescript
const activeIdeas = await db
  .select()
  .from(ideas)
  .where(eq(ideas.archived, false))
  .orderBy(desc(ideas.createdAt));
// SQL: SELECT * FROM ideas WHERE archived = 0 ORDER BY created_at DESC
```

**Insert and return the new row:**
```typescript
const [newIdea] = await db
  .insert(ideas)
  .values({ title: "My idea", content: "Details..." })
  .returning();
// SQL: INSERT INTO ideas (title, content, ...) VALUES (?, ?) RETURNING *
```

**Update a specific row:**
```typescript
const [updated] = await db
  .update(ideas)
  .set({ title: "New title", updatedAt: new Date() })
  .where(eq(ideas.id, 123))
  .returning();
// SQL: UPDATE ideas SET title = ?, updated_at = ? WHERE id = ? RETURNING *
```

**Delete a row:**
```typescript
await db.delete(ideas).where(eq(ideas.id, 123));
// SQL: DELETE FROM ideas WHERE id = ?
```

The pattern is consistent: chain methods to build a query, await to execute it. Drizzle functions like `eq`, `desc`, `and`, `or` construct the WHERE clauses.

## A Note on Security

You might have noticed that we're connecting directly from browser code to Turso. The database credentials are in `VITE_*` environment variables, which means they're bundled into the JavaScript that runs in users' browsers.

For a personal app that only you use, this is acceptable. The credentials are "your" credentials accessing "your" data.

For a multi-user application, this would be a serious security problem. Each user would have your database token and could read or modify anyone's data. The fix is to add a backend API layer—serverless functions on Vercel or Cloudflare that hold the credentials securely and authorize requests.

We're skipping that layer for this MVP because:
1. It's a personal app
2. Adding API routes doubles the complexity
3. We can always add them later

Just know that "browser talks directly to database" is a shortcut, not a production pattern for multi-user apps.

## What We've Built

At this point, you have:

- A Turso database running in the cloud
- A Drizzle schema defining your data structure
- A configured client connecting to Turso
- A verified connection with CRUD operations

The database layer is complete. Our ideas will persist across sessions, synced globally, with type-safe queries that your IDE understands.

In Part 3, we'll build the React interface on top of this foundation—a custom hook for managing ideas, components for displaying and editing them, and the patterns that make the app feel responsive.

---

*Commit your progress:*

```bash
git add .
git commit -m "Part 2: Database setup with Turso and Drizzle"
```

---

*Next in the series: [Part 3: Building the Core CRUD Interface](/blog/03-crud-interface.md)*
