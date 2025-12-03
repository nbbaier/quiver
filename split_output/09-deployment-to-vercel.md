## Milestone 10: Deployment to Vercel

**Goal:** Deploy the application to production.

**Why Vercel?** It's the simplest way to deploy a Vite app:

-  Automatic builds on git push
-  Free SSL certificates
-  Global CDN
-  Serverless functions for the API
-  Free tier is generous for personal projects

### Step 10.1: Create Vercel API Routes for Polling

For production, we need Vercel API routes that support the polling approach with Inngest. Since Vercel functions are stateless, we'll need to use your database to store brainstorm results instead of an in-memory Map.

**Note:** The existing `api/brainstorm.ts` file uses streaming. For polling with Inngest, we need different routes. You can either:

-  Keep both approaches (streaming for direct calls, polling for Inngest)
-  Or replace the streaming route with polling routes

We'll implement the separate route files approach, which is cleaner and easier to maintain:

#### Step 10.1.1: Add a Brainstorm Results Table

First, add a table to store brainstorm results in your database. Update `src/lib/schema.ts`:

```typescript
// Add to your existing schema
export const brainstormResults = sqliteTable("brainstorm_results", {
   id: integer("id").primaryKey({ autoIncrement: true }),
   ideaId: integer("idea_id").notNull(),
   status: text("status", { enum: ["pending", "completed", "failed"] })
      .notNull()
      .default("pending"),
   result: text("result"),
   error: text("error"),
   createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
   updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
});

export type BrainstormResult = typeof brainstormResults.$inferSelect;
export type NewBrainstormResult = typeof brainstormResults.$inferInsert;
```

Run the migration to create the table:

```bash
bunx drizzle-kit push
```

#### Step 10.1.2: Create the Start Brainstorm Route

Create `api/brainstorm/index.ts`:

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { inngest } from "../../src/lib/inngest";
import { db } from "../../src/lib/db";
import { brainstormResults } from "../../src/lib/schema";

/**
 * POST /api/brainstorm
 *
 * Starts a new brainstorm session:
 * 1. Creates a pending record in the database
 * 2. Sends an event to Inngest to process in the background
 * 3. Returns the brainstorm ID for polling
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
   if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
   }

   try {
      const { ideaId, idea, context } = req.body;

      if (!ideaId || !idea?.title || !idea?.content) {
         return res.status(400).json({ error: "Missing required fields" });
      }

      // Create a pending brainstorm record
      const [record] = await db
         .insert(brainstormResults)
         .values({
            ideaId,
            status: "pending",
         })
         .returning();

      // Send event to Inngest for background processing
      await inngest.send({
         name: "idea/brainstorm",
         data: {
            brainstormId: record.id,
            ideaId,
            title: idea.title,
            content: idea.content,
            context,
         },
      });

      return res.status(200).json({
         id: record.id,
         status: "pending",
         message: "Brainstorm started. Poll /api/brainstorm/:id for results.",
      });
   } catch (error) {
      console.error("Failed to start brainstorm:", error);
      return res.status(500).json({ error: "Failed to start brainstorm" });
   }
}
```

#### Step 10.1.3: Create the Poll for Results Route

Create `api/brainstorm/[id].ts`:

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { brainstormResults } from "../../src/lib/schema";

/**
 * GET /api/brainstorm/:id
 *
 * Poll for brainstorm results:
 * - Returns current status (pending, completed, failed)
 * - Includes result or error when available
 * - Cleans up completed records after returning (optional)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
   if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
   }

   const { id } = req.query;
   const brainstormId = parseInt(id as string, 10);

   if (isNaN(brainstormId)) {
      return res.status(400).json({ error: "Invalid brainstorm ID" });
   }

   try {
      const [record] = await db
         .select()
         .from(brainstormResults)
         .where(eq(brainstormResults.id, brainstormId))
         .limit(1);

      if (!record) {
         return res.status(404).json({
            status: "not_found",
            error: "Brainstorm not found",
         });
      }

      // Return the current status
      const response: {
         status: string;
         result?: string;
         error?: string;
      } = {
         status: record.status,
      };

      if (record.status === "completed" && record.result) {
         response.result = record.result;

         // Optional: Clean up the record after successful retrieval
         // This prevents the table from growing indefinitely
         await db
            .delete(brainstormResults)
            .where(eq(brainstormResults.id, brainstormId));
      } else if (record.status === "failed" && record.error) {
         response.error = record.error;

         // Also clean up failed records
         await db
            .delete(brainstormResults)
            .where(eq(brainstormResults.id, brainstormId));
      }

      return res.status(200).json(response);
   } catch (error) {
      console.error("Failed to get brainstorm status:", error);
      return res.status(500).json({ error: "Failed to get brainstorm status" });
   }
}
```

#### Step 10.1.4: Update the Inngest Function to Write to Database

Update `src/lib/inngest-functions.ts` to store results in the database instead of sending a webhook:

```typescript
import { inngest } from "./inngest";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { brainstormResults } from "./schema";

/**
 * Brainstorm function with database persistence.
 *
 * Instead of sending webhook events, we write directly to the database.
 * This is more reliable for Vercel's stateless serverless functions.
 */
export const brainstormIdea = inngest.createFunction(
   {
      id: "brainstorm-idea",
      retries: 3,
      concurrency: { limit: 2 },
   },
   { event: "idea/brainstorm" },
   async ({ event, step }) => {
      const { brainstormId, ideaId, title, content, context } = event.data;

      try {
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

         // Write success to database
         await step.run("save-result", async () => {
            await db
               .update(brainstormResults)
               .set({
                  status: "completed",
                  result,
                  updatedAt: new Date().toISOString(),
               })
               .where(eq(brainstormResults.id, brainstormId));
         });

         return { brainstormId, ideaId, result };
      } catch (error) {
         // Write failure to database
         await db
            .update(brainstormResults)
            .set({
               status: "failed",
               error: error instanceof Error ? error.message : "Unknown error",
               updatedAt: new Date().toISOString(),
            })
            .where(eq(brainstormResults.id, brainstormId));

         throw error; // Re-throw for Inngest retry logic
      }
   }
);

export const functions = [brainstormIdea];
```

#### Step 10.1.5: Update the Inngest Event Types

Update `src/lib/inngest.ts` to include the new `brainstormId` field:

```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
   id: "quiver",
});

export type Events = {
   "idea/brainstorm": {
      data: {
         brainstormId: number; // Added: database record ID
         ideaId: number;
         title: string;
         content: string;
         context?: string;
      };
   };
};
```

#### Step 10.1.6: Update the useBrainstorm Hook

The hook needs a small update to use the `id` returned from the start endpoint:

```typescript
// In src/hooks/useBrainstorm.ts

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

         const data = await response.json();

         // Poll using the brainstorm record ID, not the idea ID
         pollForResults(data.id);
      } catch (err) {
         setError(
            err instanceof Error ? err : new Error("Failed to brainstorm")
         );
         setIsLoading(false);
      }
   },
   [pollForResults, stopPolling]
);
```

#### Architecture Summary

Here's how the production polling flow works:

```
[Browser] → POST /api/brainstorm
                ↓
         Create DB record (status: pending)
                ↓
         inngest.send("idea/brainstorm")
                ↓
         Return { id, status: "pending" }

[Inngest Cloud] → Invoke brainstormIdea function
                       ↓
                  Call Claude API
                       ↓
                  Update DB record (status: completed, result: "...")

[Browser] → Poll GET /api/brainstorm/:id
                ↓
         Read from DB
                ↓
         Return { status: "completed", result: "..." }
                ↓
         Delete record (cleanup)
```

**Key benefits of this approach:**

-  **Stateless-friendly**: No in-memory state, works with Vercel's serverless model
-  **Reliable**: Database persists results even if functions restart
-  **Scalable**: Multiple instances can read/write without conflicts
-  **Observable**: You can query the database to see pending brainstorms

### Step 10.2: Verify the Brainstorm Hook for Production

**Good news:** The `useBrainstorm` hook already has the correct baseUrl logic for production! No changes are needed.

The hook already includes this pattern:

```5:5:src/hooks/useBrainstorm.ts
const API_URL = import.meta.env.DEV ? "http://localhost:3001" : "";
```

**How it works:**

-  In **development** (`import.meta.env.DEV === true`): Uses `"http://localhost:3001"` to call your local Hono server
-  In **production** (`import.meta.env.DEV === false`): Uses `""` (empty string), which creates relative URLs like `/api/brainstorm` and `/api/brainstorm/:id`

This means your production builds will automatically call Vercel's API routes using relative URLs, which is exactly what we want.

The polling logic in the hook (from Step 7.5) will work perfectly with Vercel API routes once you set up the routes that support polling with Inngest, as mentioned in Step 10.1.

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
