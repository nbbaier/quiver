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
