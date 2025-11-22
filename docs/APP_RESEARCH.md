# Building an Offline-First Idea Capture App: Weekend MVP Implementation Guide

**For a weekend MVP project, the optimal stack is Vite + React + Bun with vite-plugin-pwa, Turso with Drizzle ORM, Inngest for async jobs, and Vercel AI SDK with Claude Haiku 4.5—delivering a fully functional app in 12-16 hours** of development time with near-zero monthly costs. Bun speeds up package installation by 30x compared to npm and reduces build times, while Vercel AI SDK's `useChat` hook simplifies streaming AI responses with built-in state management. Browser tab capture requires a separate Chrome extension (adding 2-3 days), but the core web app can launch immediately with manual URL input and expand tab-capture later.

This combination offers the fastest path from zero to deployed PWA while maintaining production-ready quality. The entire stack costs under $3/month for personal use with generous free tiers, and every technology chosen has excellent documentation with active maintenance. You'll spend Saturday building the core app with Bun's blazing-fast installs and Sunday adding offline capabilities and AI features with the Vercel AI SDK's simple hooks, with time left for polish and deployment.

## Core technology choices deliver maximum speed with minimal complexity

**Vite + React + Bun emerges as the clear winner** for weekend projects, with Bun reducing setup time to just 5-10 minutes compared to 10-20 minutes with npm. The `bun create vite` command scaffolds projects instantly, `bun install` completes in 2-3 seconds (vs 15-30 seconds for npm), and vite-plugin-pwa provides zero-config PWA support. This stack deploys seamlessly to Vercel with native Bun runtime support (as of late 2024), enabling the entire "hello world to deployed PWA" journey in 10-15 minutes total.

**Bun advantages for weekend development:**

-  **30x faster package installation** - Dependencies install in seconds instead of minutes, dramatically improving iteration speed
-  **Native TypeScript support** - Run `.ts` files directly without transpilation
-  **Built-in test runner** - Jest-compatible testing without additional setup
-  **Single executable** - Bun bundles runtime, package manager, bundler, and test runner
-  **Drop-in Node.js replacement** - Works with existing npm packages and Node APIs
-  **Zero configuration** - `.env` files, JSX/TSX work out of the box

Vite with Bun uses `bunx --bun vite` to run the dev server on Bun's runtime rather than Node.js, providing additional speed improvements. Simply update your `package.json` scripts to `"dev": "bunx --bun vite"` and you're running on Bun. Build times improve noticeably, and the development server starts faster.

**Turso paired with Drizzle ORM** works perfectly with Bun - install with `bun add drizzle-orm @libsql/client` and you're ready to go. The setup takes 5-10 minutes: install the Turso CLI (`brew install tursodatabase/tap/turso` or `curl`), authenticate via GitHub, create a database, and grab your credentials. Drizzle offers native Turso support with excellent TypeScript inference, and the free tier (500M row reads, 10M writes, 5GB storage monthly) covers years of personal use.

**Inngest handles async job orchestration** with the least friction for weekend projects. The Vercel Marketplace integration takes just 2 clicks, and the free tier's 50,000 executions per month means you'll never hit limits for personal brainstorming use. Setup with Bun is identical - `bun add inngest` and you're ready. The integration requires only 15-30 minutes: install the package, create an API route, define your function, and deploy.

**Vercel AI SDK with Claude Haiku 4.5** simplifies streaming AI interactions dramatically compared to direct API integration. Instead of manually handling streaming responses, WebSocket connections, and state management, the AI SDK provides React hooks like `useChat` that handle everything automatically. Install with `bun add ai @ai-sdk/anthropic` and you're ready to build chat interfaces.

**AI SDK advantages over direct Anthropic SDK:**

-  **Unified provider interface** - Switch between Claude, GPT, Gemini with a single line change
-  **Built-in React hooks** - `useChat`, `useCompletion`, `useObject` manage streaming state automatically
-  **Streaming by default** - No manual stream parsing or SSE handling required
-  **Type-safe** - Full TypeScript support with inferred types
-  **Framework agnostic** - Works with React, Vue, Svelte, Angular
-  **Tool calling support** - Easy integration of function calling capabilities

The `useChat` hook manages conversation history, handles input state, automatically streams responses, and provides loading/error states - all in about 5 lines of code. Compare this to 50+ lines of manual streaming logic with the direct Anthropic SDK.

## Weekend implementation timeline breaks into manageable chunks

**Saturday morning (3-4 hours)** focuses on core infrastructure with Bun's speed advantage. Start by scaffolding with `bun create vite my-idea-app` and select React + TypeScript - this takes 30 seconds. Install vite-plugin-pwa with `bun add -D vite-plugin-pwa` (2 seconds), configure your basic manifest, and generate PWA icons - total time 30 minutes. Set up Turso by running `turso db create idea-manager`, copy credentials to `.env`, then `bun add drizzle-orm @libsql/client` and `bun add -D drizzle-kit` (combined 5 seconds). Create your schema, run `bunx drizzle-kit generate` and `bunx drizzle-kit migrate` - database setup completes in 30 minutes. Build your basic UI with idea capture form and list view, connecting via Drizzle - budget 90-120 minutes for core functionality.

**Saturday afternoon (3-4 hours)** adds PWA capabilities and offline support. Configure vite-plugin-pwa in `vite.config.js` with Workbox runtime caching - 60-90 minutes including testing. Implement offline detection and custom install prompt component - 45-60 minutes. Build and preview with `bun run build && bun run preview`, test offline functionality in DevTools - 60-90 minutes for testing and refinement.

**Sunday morning (2-3 hours)** integrates AI with Vercel AI SDK's simplified workflow. Install with `bun add ai @ai-sdk/anthropic` (3 seconds). Create an API route using AI SDK Core's `streamText` function:

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export async function POST(req: Request) {
   const { messages } = await req.json();

   const result = streamText({
      model: anthropic("claude-haiku-4-5-20250514"),
      messages,
   });

   return result.toDataStreamResponse();
}
```

On the client, use the `useChat` hook:

```typescript
import { useChat } from "@ai-sdk/react";

function BrainstormChat() {
   const { messages, input, handleInputChange, handleSubmit, isLoading } =
      useChat();

   return (
      <div>
         {messages.map((m) => (
            <div key={m.id}>
               {m.role}: {m.content}
            </div>
         ))}
         <form onSubmit={handleSubmit}>
            <input value={input} onChange={handleInputChange} />
         </form>
      </div>
   );
}
```

That's it - streaming AI chat in about 20 lines of code. The SDK handles message history, streaming tokens, loading states, and error handling automatically. Total implementation time: 60-90 minutes including UI polish.

**Sunday afternoon (2-3 hours)** handles deployment, testing, and polish. Add `"bunVersion": "1.x"` to `vercel.json` to enable Bun runtime, then deploy with `vercel` or Git integration. Vercel automatically detects Bun and uses it for both install and runtime. Run Lighthouse audits, test on mobile devices, and add final polish - 2-3 hours total.

## Database schema optimized for performance and simplicity

The Turso schema design works identically with Bun - Drizzle's type safety and migration system function the same regardless of runtime. **Store tags and URLs as JSON arrays** rather than normalized tables for weekend development speed. A single `ideas` table with columns for `id`, `title`, `content`, `created_at`, `updated_at`, `archived`, `urls` (TEXT storing JSON), `tags` (TEXT storing JSON), and `metadata` (TEXT storing JSON) handles all core functionality.

**FTS5 full-text search** setup with Bun:

```bash
bunx drizzle-kit generate  # Generate FTS5 virtual table migration
bunx drizzle-kit migrate   # Apply migration
```

The Drizzle schema definition provides strong TypeScript typing with Bun's native TypeScript support requiring no transpilation step:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const ideas = sqliteTable("ideas", {
   id: integer("id").primaryKey(),
   title: text("title").notNull(),
   content: text("content").notNull(),
   urls: text("urls", { mode: "json" }).$type<string[]>(),
   tags: text("tags", { mode: "json" }).$type<string[]>(),
   createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
   archived: integer("archived", { mode: "boolean" }).default(false),
});
```

Bun's native TypeScript support means you can import and use this schema directly without build steps during development.

## PWA offline-first patterns enable true everywhere access

**The NetworkFirst strategy with cache fallback** works identically with Bun since PWA features run in the browser. Configure vite-plugin-pwa the same way - Bun just makes the initial installation faster.

**Workbox via vite-plugin-pwa** setup with Bun:

```bash
bun add -D vite-plugin-pwa  # 2 seconds vs 15-30 with npm
```

Configuration in `vite.config.ts` is identical:

```typescript
import { VitePWA } from "vite-plugin-pwa";

export default {
   plugins: [
      VitePWA({
         registerType: "autoUpdate",
         workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
            runtimeCaching: [
               {
                  urlPattern: /^https:\/\/api\./,
                  handler: "NetworkFirst",
                  options: {
                     cacheName: "api-cache",
                     expiration: {
                        maxEntries: 100,
                        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                     },
                  },
               },
            ],
         },
      }),
   ],
};
```

Build and preview with `bun run build && bun run preview` - the build typically completes 20-30% faster than with npm/node.

## AI integration with Vercel AI SDK simplifies streaming

**Vercel AI SDK eliminates streaming complexity** that you'd face with direct Anthropic SDK integration. Instead of:

-  Manually parsing Server-Sent Events
-  Managing WebSocket connections
-  Handling partial message assembly
-  Implementing retry logic
-  Managing conversation state

You get:

-  Automatic streaming with `streamText()`
-  Built-in React hooks with state management
-  Error handling and retries included
-  Type-safe message history
-  One-line provider switching

**Setting up AI brainstorming with Bun:**

```bash
bun add ai @ai-sdk/anthropic inngest  # 3 seconds for all packages
```

Create an Inngest function for brainstorming:

```typescript
import { inngest } from "./client";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export const brainstormIdea = inngest.createFunction(
   { id: "brainstorm-idea" },
   { event: "idea/brainstorm" },
   async ({ event, step }) => {
      const result = await streamText({
         model: anthropic("claude-haiku-4-5-20250514"),
         messages: [
            {
               role: "user",
               content: `Brainstorm 5 directions for this idea: ${event.data.idea}`,
            },
         ],
      });

      // Stream to client via Inngest's streaming response
      return { text: await result.text };
   }
);
```

On the client, trigger with the standard Inngest client and display results using React state. The AI SDK handles all streaming complexity server-side.

**Provider flexibility** - switching from Claude to GPT-4o takes 2 lines:

```typescript
import { openai } from "@ai-sdk/openai"; // Change import
const result = streamText({
   model: openai("gpt-4o-mini"), // Change model
   messages,
});
```

Same API, different model. This flexibility lets you start with cheap models during development (GPT-4o mini at $0.32/month) and upgrade to Claude Haiku ($2.70/month) or Sonnet ($7.88/month) for production without code changes.

**useChat hook provides conversation management:**

```typescript
const {
   messages, // Full conversation history
   input, // Current input value
   handleSubmit, // Form submit handler
   isLoading, // Loading state
   error, // Error state
   setMessages, // Manual message management
   reload, // Retry last message
   stop, // Stop current generation
} = useChat({
   api: "/api/brainstorm",
   onFinish: (message) => {
      // Save to database
   },
});
```

All state management handled automatically - you just wire up the UI.

## Bun deployment to Vercel is seamless

**Vercel native Bun support** (as of late 2024) means adding one line to `vercel.json`:

```json
{
   "bunVersion": "1.x"
}
```

Vercel automatically:

-  Detects the Bun configuration
-  Uses `bun install` for dependencies (30x faster than npm)
-  Runs your app on Bun runtime
-  Enables all Bun APIs (`Bun.file`, `Bun.password.hash`, etc.)
-  Integrates with observability and logging

For Next.js projects, update `package.json` scripts:

```json
{
   "scripts": {
      "dev": "bun --bun next dev",
      "build": "bun --bun next build",
      "start": "bun --bun next start"
   }
}
```

The `--bun` flag ensures Next.js runs on Bun runtime while still using Turbopack/Webpack for bundling.

**Deployment workflow with Bun:**

1. Add `"bunVersion": "1.x"` to `vercel.json`
2. Set environment variables in Vercel dashboard (Turso credentials, Anthropic API key)
3. `git push` or `vercel deploy`
4. Vercel automatically installs via Bun and runs on Bun runtime

Build times improve by 20-30% compared to npm/node, and the runtime uses less memory with faster cold starts.

## Complete implementation checklist with time estimates

### Saturday Morning: Core Infrastructure (3-4 hours)

**Project Setup (10 minutes)**

-  Run `bun create vite idea-capture` and select React + TypeScript (30 seconds)
-  `cd idea-capture && bun install` (2 seconds)
-  `bun add -D vite-plugin-pwa` (2 seconds)
-  Initialize Git and create repository (5 minutes)

**Database Setup (30 minutes)**

-  Install Turso CLI: `brew install tursodatabase/tap/turso` (2 minutes)
-  `turso auth signup` (2 minutes)
-  `turso db create idea-manager` (30 seconds)
-  Get credentials: `turso db show idea-manager --url` and `turso db tokens create idea-manager` (1 minute)
-  `bun add drizzle-orm @libsql/client` (3 seconds)
-  `bun add -D drizzle-kit` (2 seconds)
-  Create `db/schema.ts` with ideas table definition (10 minutes)
-  Create `db/index.ts` with client configuration (5 minutes)
-  Create `drizzle.config.ts` (3 minutes)
-  `bunx drizzle-kit generate && bunx drizzle-kit migrate` (1 minute)

**PWA Configuration (20 minutes)**

-  Configure vite-plugin-pwa in `vite.config.ts` (10 minutes)
-  Generate PWA icons using online tool (5 minutes)
-  Add manifest link to `index.html` (5 minutes)

**Basic UI (90-120 minutes)**

-  Create idea capture form component (30 minutes)
-  Build idea list component with filtering (30 minutes)
-  Connect to Turso via Drizzle queries (20 minutes)
-  Add basic styling with Tailwind (20-40 minutes)
-  Test CRUD operations (20 minutes)

### Saturday Afternoon: PWA Features (3-4 hours)

**Offline Caching (60-90 minutes)**

-  Configure Workbox runtime caching in vite.config.ts (30 minutes)
-  Set NetworkFirst/CacheFirst strategies (20 minutes)
-  Test with `bun run build && bun run preview` (30-40 minutes)

**Installation UX (45-60 minutes)**

-  Create InstallPrompt component (20 minutes)
-  Handle `beforeinstallprompt` event (15 minutes)
-  iOS Safari manual instructions (10-15 minutes)
-  Test installation flow (10 minutes)

**Offline Testing (60-90 minutes)**

-  Add online/offline detection UI (20 minutes)
-  Create `/offline.html` fallback page (15 minutes)
-  Test offline functionality thoroughly (35-55 minutes)

### Sunday Morning: AI Integration (2-3 hours)

**AI SDK Setup (60-90 minutes)**

-  `bun add ai @ai-sdk/anthropic inngest` (3 seconds)
-  Create `/api/brainstorm/route.ts` with `streamText()` (20 minutes)
-  Build brainstorm UI with `useChat` hook (30-45 minutes)
-  Add error handling and loading states (15-20 minutes)
-  Test streaming responses (10-15 minutes)

### Sunday Afternoon: Deployment & Polish (2-3 hours)

**Deployment (20 minutes)**

-  Add `"bunVersion": "1.x"` to `vercel.json` (1 minute)
-  Set environment variables in Vercel (5 minutes)
-  `vercel deploy` or Git push (2 minutes)
-  Test production build (12 minutes)

**Testing (40 minutes)**

-  Run Lighthouse audit (10 minutes)
-  Test on Android/iOS devices (20 minutes)
-  Verify offline functionality (10 minutes)

**Polish (45-60 minutes)**

-  Add loading states (15 minutes)
-  Implement error boundaries (15 minutes)
-  Create empty states (15-20 minutes)
-  Add keyboard shortcuts (15 minutes)

## Recommended tech stack summary

**Runtime: Bun 1.x**

-  Setup time: 5 minutes
-  Install speed: 30x faster than npm
-  Native TypeScript: No transpilation needed
-  Why: Fastest package management, instant dev server, production-ready runtime

**Frontend Framework: Vite + React**

-  Setup time: 30 seconds with Bun
-  PWA plugin: vite-plugin-pwa (zero-config)
-  Deploy to: Vercel with native Bun support
-  Why: Fastest setup, excellent PWA support, flexible

**Database: Turso + Drizzle ORM**

-  Setup time: 30 minutes
-  Free tier: 500M reads, 10M writes monthly
-  Cost: $0 for personal use
-  Why: SQLite simplicity, edge distribution, type-safe queries

**Async Jobs: Inngest**

-  Setup time: 15-30 minutes
-  Free tier: 50,000 executions monthly
-  Cost: $0 for personal use
-  Why: Simplest integration, built-in observability, reliable

**AI Integration: Vercel AI SDK + Claude Haiku 4.5**

-  Setup time: 60 minutes (vs 2-3 hours with direct SDK)
-  AI cost: $2.70/month (225 daily sessions)
-  Why: Simple React hooks, automatic streaming, provider flexibility

**PWA Implementation: Workbox via vite-plugin-pwa**

-  Setup time: 30-60 minutes
-  Why: Zero-config service workers, automatic precaching, battle-tested

**Tab Capture: Chrome Extension (optional, future phase)**

-  Setup time: 4-6 hours with polish
-  Why: Required for automated tab access, web APIs insufficient
-  Alternative: Web Share Target API for manual sharing

## Total cost and time investment

**Development Time: 12-16 hours** (single weekend)

-  Saturday: 6-8 hours
-  Sunday: 6-8 hours
-  Includes deployment and testing

**Monthly Costs: $2.70-$3.00**

-  Claude Haiku 4.5: $2.70
-  Turso: $0 (free tier)
-  Inngest: $0 (free tier)
-  Vercel hosting: $0 (free tier)

**Optional Extension: +2-3 days**

-  Chrome extension: 4-6 hours
-  Firefox compatibility: 2-4 hours
-  Testing and polish: 2-4 hours

## Key advantages of Bun + AI SDK stack

**Bun Benefits:**

-  **30x faster installs** - `bun install` completes in 2-3 seconds
-  **20-30% faster builds** - Noticeable improvement in build times
-  **Native TypeScript** - No transpilation overhead during development
-  **Instant dev server** - `bunx --bun vite` starts in under a second
-  **Production-ready runtime** - Vercel native support with better performance
-  **Lower memory usage** - More efficient than Node.js

**Vercel AI SDK Benefits:**

-  **80% less code** - `useChat` hook vs manual streaming implementation
-  **Provider flexibility** - Switch models in 2 lines
-  **Built-in state management** - No Redux/Zustand needed for chat state
-  **Error handling included** - Automatic retry and error boundaries
-  **Type safety** - Full TypeScript inference
-  **Future-proof** - Easy to add tools, multi-modal, etc.

## Conclusion

This technology stack delivers a production-ready offline-first idea capture app in a single weekend with ongoing costs under $3 monthly. **Vite + React + Bun provides the fastest development experience** with 30x faster installs and 20-30% faster builds, while **Vercel AI SDK simplifies AI integration** from 100+ lines of streaming code down to a 5-line `useChat` hook. **Turso + Drizzle ORM offers SQLite simplicity** with global edge distribution, and **Inngest handles async jobs** with zero configuration.

The **Bun runtime on Vercel** enables native deployment with better performance and lower memory usage than Node.js. The **Vercel AI SDK** provides provider flexibility - start with cheap GPT-4o mini ($0.32/month) for prototyping, switch to Claude Haiku ($2.70/month) for production, or upgrade to Sonnet ($7.88/month) for maximum quality - all with 2 lines of code.

Start Saturday morning with `bun create vite` (30 seconds) and Turso setup (30 minutes), add PWA capabilities Saturday afternoon (3-4 hours), integrate AI with Vercel AI SDK Sunday morning (2-3 hours using `useChat` hook), and deploy with Bun runtime Sunday afternoon (2-3 hours). By Sunday evening you'll have a deployed, installable PWA that captures ideas offline and generates AI-powered brainstorms on demand—all built in 12-16 hours with technologies that scale from weekend prototype to production application.

The browser tab capture feature requires a separate Chrome extension (2-3 additional days), but you can **launch the core web app immediately** with manual URL input and add automated tab capture in a future iteration. This phased approach lets you validate the idea management and AI brainstorming features first, then invest in extension development only if the core app proves valuable.
