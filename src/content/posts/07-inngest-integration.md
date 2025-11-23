---
title: "Part 7: Inngest Integration"
seriesTitle: "Building Quiver: An Offline-First PWA in a Weekend"
series: "Quiver"
slug: "quiver/07-inngest-integration"
---

_This is Part 7 of a 10-part series on building Quiver. [Start with Part 1](/posts/quiver/01-the-weekend-project) if you missed it._

---

In the last part, we added AI brainstorming. It was cool, but it had a flaw: if you clicked "Brainstorm" and closed the tab, the process died. If the AI API timed out, the user saw an error.

For a production-grade app, we need **background jobs**. We need a system that says "Hey, go do this heavy AI task, retry if it fails, and let me know when you're done."

We're using **Inngest** for this. It's a developer-first event platform that works perfectly with serverless frameworks like Hono.

## The Architecture Shift

Previously:
`Browser -> API -> Claude -> Browser (Stream)`

Now:

1. `Browser -> API -> Inngest (Event)`
2. `Inngest -> API (Background Function) -> Claude -> DB`
3. `Browser (Polling) -> API -> DB`

This seems more complex, but it gives us **reliability**. If the AI fails, Inngest retries automatically. If the user goes offline, the job finishes anyway.

## Installing Inngest

```bash
bun add inngest
```

## Setting up the Client

Create `src/lib/inngest.ts`. This is our typed client.

```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "quiver" });

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
      data: { ideaId: number; result: string };
   };
};
```

## Creating the Background Function

This is the code that actually runs the AI job. Create `src/lib/inngest-functions.ts`.

```typescript
import { inngest } from "./inngest";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const brainstormIdea = inngest.createFunction(
   { id: "brainstorm-idea", retries: 3 },
   { event: "idea/brainstorm" },
   async ({ event, step }) => {
      const { title, content, context } = event.data;

      const result = await step.run("call-claude", async () => {
         const response = await generateText({
            model: anthropic("claude-haiku-4-5-20250514"),
            system: "You are a helpful assistant...",
            prompt: `Brainstorm about: ${title}\n${content}`,
         });
         return response.text;
      });

      await step.sendEvent("notify-completion", {
         name: "idea/brainstorm.completed",
         data: { ideaId: event.data.ideaId, result },
      });

      return { result };
   }
);

export const functions = [brainstormIdea];
```

## Serving the Functions

Inngest needs an endpoint to communicate with your app. We add this to our Hono server in `src/api/server.ts`.

```typescript
import { serve } from "inngest/hono";
import { inngest } from "../lib/inngest";
import { functions } from "../lib/inngest-functions";

// ... existing code

app.on(
   ["GET", "POST", "PUT"],
   "/api/inngest",
   serve({ client: inngest, functions })
);

// New trigger endpoint
app.post("/api/brainstorm", async (c) => {
   const body = await c.req.json();
   await inngest.send({
      name: "idea/brainstorm",
      data: body,
   });
   return c.json({ status: "started" });
});
```

## Polling for Results

Since we can't stream the response directly anymore, our frontend needs to poll for the result. We update our `useBrainstorm` hook to check an endpoint every second until the status changes to "completed".

## Why this is worth it

It feels like extra work for a weekend project. But imagine if you had 1,000 users. Imagine if you wanted to add "Generate Image" or "Summarize" features. With Inngest, you just add a function. You get concurrency control (limit to 5 concurrent AI calls to save money), retries, and logs for free.

In the next (and final) part, we'll polish the UI with search and filtering, and finally deploy to Vercel.
