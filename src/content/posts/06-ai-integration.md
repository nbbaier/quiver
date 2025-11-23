---
title: "Part 6: AI Integration"
seriesTitle: "Building Quiver: An Offline-First PWA in a Weekend"
series: "Quiver"
slug: "quiver/06-ai-integration"
---

_This is Part 6 of a 10-part series on building Quiver. [Start with Part 1](/posts/quiver/01-the-weekend-project) if you missed it._

---

Idea capture is passive. Brainstorming is active. We want Quiver to be an active partner in your thought process.

We'll use **Claude Haiku** via the **Vercel AI SDK** to add a "Brainstorm" feature that expands on your ideas.

## The Challenge: API Keys & Streaming

We can't put our Anthropic API key in the frontend code (anyone could steal it). We need a backend.
Since we're using Vite (a frontend tool), we'll create a small, separate API server using **Hono**.

Also, we want **streaming**. We don't want the user to wait 10 seconds for a spinner; we want text to appear as it's generated.

## Setting up the Backend

Install the dependencies:

```bash
bun add ai @ai-sdk/anthropic hono @hono/node-server
```

Create `src/api/server.ts`. This is a minimal Node.js server that exposes a single endpoint.

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const app = new Hono();
app.use("/*", cors());

app.post("/api/brainstorm", async (c) => {
   const { idea, context } = await c.req.json();

   const result = streamText({
      model: anthropic("claude-haiku-4-5-20250514"), // Fast & Cheap
      system: `You are a creative brainstorming assistant...`, // (Add your prompt here)
      messages: [
         {
            role: "user",
            content: `Help me develop this idea: ${idea.title}\n${idea.content}`,
         },
      ],
   });

   return result.toDataStreamResponse();
});

export default app;
```

## Running the Server

We need to run this alongside Vite. Update `package.json`:

```json
"scripts": {
  "dev": "bun run dev:all",
  "dev:client": "vite",
  "dev:api": "bun run --watch src/api/index.ts",
  "dev:all": "bun run dev:api & bun run dev:client"
}
```

## Consuming the Stream

In React, we need a way to read this stream. The Vercel AI SDK provides hooks, but for a custom "single-shot" interaction like this, we can also write a simple fetch reader.

Create `src/hooks/useBrainstorm.ts`:

```typescript
// ... imports

export function useBrainstorm() {
   const [result, setResult] = useState("");

   const brainstorm = async (idea) => {
      const response = await fetch("http://localhost:3001/api/brainstorm", {
         method: "POST",
         body: JSON.stringify({ idea }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
         const { done, value } = await reader.read();
         if (done) break;

         const chunk = decoder.decode(value);
         // Parse the AI SDK format (it sends data like '0:"text"')
         // ... (parsing logic here)
         setResult((prev) => prev + parsedText);
      }
   };

   return { brainstorm, result };
}
```

## The UI

We create a `BrainstormPanel` that slides down when you click a "Brainstorm" button on an idea.

The result is magical: you click a button, and immediately see Claude thinking through your idea, suggesting improvements, asking questions, and expanding the scope.

## Costs

Claude Haiku is incredibly cheap. You can brainstorm hundreds of ideas for pennies. This makes it feasible to include in a personal tool without worrying about the bill.
