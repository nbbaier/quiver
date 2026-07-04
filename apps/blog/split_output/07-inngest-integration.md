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
