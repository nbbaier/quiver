---
title: "Part 2: Database Architecture"
seriesTitle: "Building Quiver: An Offline-First PWA in a Weekend"
series: "Quiver"
slug: "quiver/02-database-architecture"
---

_This is Part 2 of a 8-part series on building Quiver. [Start with Part 1](/blog/quiver/01-the-weekend-project) if you missed it._

---

Every app needs a place to store data. For a personal "weekend project," you might be tempted to just use `localStorage` or a simple JSON file. But we're building something that needs to sync across devices and potentially scale.

We're using **Turso** and **Drizzle ORM**.

## Why this stack?

**Turso** is based on libSQL, a fork of SQLite. It's designed for the edge. Unlike a traditional Postgres instance which might sit in `us-east-1`, Turso replicates your data to multiple regions. This means low latency for reads no matter where you are. Plus, the free tier is incredibly generous (500M reads/month).

**Drizzle** is the perfect companion. It's a "TypeScript-first" ORM. There's no code generation step like Prisma (well, mostly), and the query syntax is very close to SQL. It gives us type safety without the bloat.

## Setting up Turso

First, you'll need the Turso CLI.

```bash
# macOS
brew install tursodatabase/tap/turso
# Linux/Other
curl -sSfL https://get.tur.so/install.sh | bash
```

Authenticate and create your database:

```bash
turso auth signup # or login
turso db create quiver
```

Get your connection details:

```bash
turso db show quiver --url
turso db tokens create quiver
```

Create a `.env.local` file in your project root and add these values. Note the `VITE_` prefix, which makes them available to our client-side code.

```env
VITE_TURSO_DATABASE_URL=libsql://quiver-yourusername.turso.io
VITE_TURSO_AUTH_TOKEN=ey...
```

## Installing Drizzle

We need the ORM, the Turso driver, and the development kit for migrations.

```bash
bun add drizzle-orm @libsql/client
bun add -D drizzle-kit
```

## Defining the Schema

Create `src/lib/schema.ts`. This is where Drizzle shines. We define our tables in TypeScript, and these definitions become our types.

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const ideas = sqliteTable("ideas", {
   // Auto-incrementing ID
   id: integer("id").primaryKey({ autoIncrement: true }),

   // Core content
   title: text("title").notNull(),
   content: text("content").notNull(),

   // We store tags and URLs as JSON strings.
   // For a personal app, this denormalization simplifies queries immensely.
   urls: text("urls", { mode: "json" }).$type<string[]>().default([]),
   tags: text("tags", { mode: "json" }).$type<string[]>().default([]),

   // Timestamps
   createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
   updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),

   // Soft delete
   archived: integer("archived", { mode: "boolean" }).default(false),
});

// Inference magic
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
```

Notice the decision to store `tags` as a JSON array. In a strict relational design, you might have an `idea_tags` join table. But for a personal app with maybe a few thousand items, JSON is faster to query (no joins) and simpler to manage.

## Database Connection

Create `src/lib/db.ts` to export our database client:

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
   url: import.meta.env.VITE_TURSO_DATABASE_URL,
   authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

## Running Migrations

We need to tell Drizzle how to update the database. Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
   schema: "./src/lib/schema.ts",
   out: "./drizzle",
   dialect: "turso",
   dbCredentials: {
      url: process.env.VITE_TURSO_DATABASE_URL!,
      authToken: process.env.VITE_TURSO_AUTH_TOKEN,
   },
});
```

Now generate and run the migration:

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

Your database now has the `ideas` table!

## The Data Access Layer

Instead of calling `db.select()` directly in our components, let's create a data access layer. This encapsulates our database logic and makes it easier to swap things out later (like when we add offline support).

Create `src/lib/ideas.ts`:

```typescript
import { db } from "./db";
import { ideas, type Idea, type NewIdea } from "./schema";
import { eq, desc } from "drizzle-orm";

export async function getAllIdeas(): Promise<Idea[]> {
   return db.select().from(ideas).orderBy(desc(ideas.createdAt));
}

export async function createIdea(data: NewIdea): Promise<Idea> {
   const [created] = await db.insert(ideas).values(data).returning();
   return created;
}

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

export async function deleteIdea(id: number): Promise<void> {
   await db.delete(ideas).where(eq(ideas.id, id));
}

export async function archiveIdea(id: number): Promise<Idea | undefined> {
   return updateIdea(id, { archived: true });
}
```

## Conclusion

We now have a cloud database, a type-safe schema, and clean functions to interact with it. But our app is still just a blank screen.

In the next part, we'll build the UI to actually create and view these ideas.

[Read Part 3: The CRUD Interface →](/blog/quiver/03-crud-interface)
