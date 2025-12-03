# Quiver: Offline-First Idea Capture App Implementation Guide

This guide walks you through building an offline-first idea capture PWA from scratch. Each milestone includes verifiable checkpoints so you can confirm your progress before moving on.

More importantly, this guide explains _why_ you're making each decision. Understanding the reasoning behind architectural choices will help you adapt these patterns to your own projects and make better decisions when you inevitably encounter situations this guide doesn't cover.

## What You're Building

**Quiver** is a Progressive Web App (PWA) for capturing ideas anywhere—even without an internet connection. Think of it as a personal brainstorming tool that:

-  Works offline and syncs when you're back online
-  Lives on your home screen like a native app
-  Uses AI to help expand and develop your ideas
-  Organizes thoughts with tags and full-text search

### Why These Features Matter

**Offline-first** isn't just a nice-to-have for an idea capture app—it's essential. Ideas strike at inconvenient times: on the subway, in airplane mode, in areas with spotty coverage. If your app requires connectivity, you'll lose ideas. We're building the app to work offline _by default_, treating network connectivity as an enhancement rather than a requirement.

**PWA (Progressive Web App)** gives us the best of both worlds: the reach of the web (no app store approval, instant updates, works on any device) with the experience of a native app (home screen icon, full-screen mode, offline support). For a personal productivity tool, this is the sweet spot—you get native-app feel without the overhead of maintaining separate iOS and Android codebases.

**AI brainstorming** transforms a simple note-taking app into an active thinking partner. Instead of just storing ideas, Quiver helps you develop them by suggesting directions, asking questions, and making unexpected connections.

## Tech Stack

Here's what we're using and _why_ each piece was chosen:

### Runtime: Bun

**What it is:** Bun is an all-in-one JavaScript runtime that replaces Node.js, npm, and several other tools.

**Why we're using it:** Speed. Bun installs packages 30x faster than npm—what takes 30 seconds with npm takes 1 second with Bun. For a weekend project where you're iterating quickly, this adds up. Bun also runs TypeScript directly without a separate compilation step, which simplifies our setup.

**The tradeoff:** Bun is newer than Node.js, so you might occasionally hit edge cases with package compatibility. In practice, this is rare for mainstream packages, and the speed benefits are worth it.

### Frontend: Vite + React + TypeScript

**What it is:** Vite is a build tool that provides near-instant dev server startup and hot module replacement. React is a UI library for building component-based interfaces. TypeScript adds static typing to JavaScript.

**Why we're using it:**

-  **Vite** because it's fast and has excellent PWA plugin support
-  **React** because it has the largest ecosystem and most learning resources (helpful for a junior dev)
-  **TypeScript** because catching errors at compile time saves debugging time later, and the autocomplete makes you faster

**The tradeoff:** TypeScript adds some initial setup complexity, but the safety and developer experience improvements pay for themselves quickly.

### Styling: Tailwind CSS v4

**What it is:** Tailwind is a utility-first CSS framework. Instead of writing custom CSS classes, you compose styles using small, single-purpose utility classes directly in your HTML/JSX.

**Why we're using it:**

-  No context-switching between files—styles live right next to the markup they affect
-  Consistent design system out of the box (spacing, colors, typography are all pre-defined)
-  Tailwind v4 is CSS-native with zero JavaScript configuration needed
-  Faster iteration—you rarely need to write custom CSS

**The tradeoff:** Your JSX will have longer `className` strings. Some developers find this ugly at first, but most grow to appreciate the locality and speed once they're used to it.

### Database: Turso + Drizzle ORM

**What it is:** Turso is SQLite deployed at the edge (meaning copies of your data live in data centers around the world). Drizzle is a TypeScript ORM that provides type-safe database queries.

**Why we're using it:**

-  **Turso** gives us a real database with a generous free tier (500M reads/month). SQLite is simple and reliable—no need for complex PostgreSQL setup for a personal app
-  **Drizzle** generates TypeScript types from your schema, so your queries are type-checked. If you rename a column, TypeScript will flag every place that references it

**The tradeoff:** Turso is newer than alternatives like PlanetScale or Supabase. We're using it because the free tier is more generous and SQLite is simpler to reason about.

### PWA: vite-plugin-pwa + Workbox

**What it is:** Service workers are scripts that run in the background and can intercept network requests, enabling offline functionality. Workbox is Google's library for creating service workers. vite-plugin-pwa integrates Workbox with Vite.

**Why we're using it:** Writing service workers from scratch is error-prone and tedious. vite-plugin-pwa handles the boilerplate—caching strategies, update flows, manifest generation—so we can focus on our app logic.

### AI: Vercel AI SDK + Claude Haiku

**What it is:** The Vercel AI SDK provides React hooks and server utilities for building AI features. Claude Haiku is Anthropic's fast, cheap model optimized for quick tasks.

**Why we're using it:**

-  **Vercel AI SDK** handles streaming responses, state management, and error handling. Without it, you'd write 50+ lines of code to handle streaming; with it, you write 5
-  **Claude Haiku** costs ~$0.01 per brainstorming session. At that price, you can brainstorm hundreds of times per month for under $3

**The tradeoff:** You could use the Anthropic SDK directly for more control, but the Vercel AI SDK's abstractions save significant development time.

### Deployment: Vercel

**What it is:** Vercel is a deployment platform optimized for frontend frameworks.

**Why we're using it:** One command deploys your app. Environment variables, HTTPS, CDN, and serverless functions all work out of the box. The free tier is generous for personal projects.

## Time Estimate

-  **Saturday:** 6-8 hours (core app, database, PWA)
-  **Sunday:** 4-6 hours (AI, search, deployment, polish)
-  **Total:** 10-14 hours

This is achievable in a weekend if you follow the guide. Budget extra time if you want to deeply understand each concept rather than just implementing it.

## Cost

-  **Turso:** $0 (free tier: 500M reads, 10M writes/month)
-  **Vercel:** $0 (free tier: 100GB bandwidth/month)
-  **Anthropic:** ~$2-3/month (assuming daily use)
-  **Total:** Under $3/month

---

## Prerequisites

Before starting, ensure you have these installed:

### 1. Install Bun

Bun is our JavaScript runtime. Install it with:

```bash
# macOS or Linux
curl -fsSL https://bun.sh/install | bash

# Or with Homebrew on macOS
brew install bun
```

**Why Bun over Node.js?** Bun is dramatically faster for package installation (the thing you'll do dozens of times during development). It's also an all-in-one tool—runtime, package manager, bundler, and test runner—which means fewer moving parts.

### 2. Verify Your Setup

```bash
bun --version  # Should show 1.x (1.0 or higher)
git --version  # Any recent version
```

### 3. Accounts You'll Need

-  **GitHub account** — For Turso authentication and Vercel deployment
-  **Anthropic API key** — Get one at https://console.anthropic.com (you'll need to add a payment method, but we'll use the cheap model)

---

## Milestone 1: Project Scaffolding with Tailwind v4

**Goal:** Create a working Vite + React project with Tailwind CSS v4 that runs in development mode.

**Why start here?** Before writing any app logic, we need a foundation. This milestone gets the basic tooling working so we can iterate quickly. We're setting up Tailwind v4 now because retrofitting styles later is tedious—better to have the design system in place from day one.

### Step 1.1: Create the Project

```bash
bun create vite quiver --template react-ts
cd quiver
bun install
```

**What just happened?**

-  `bun create vite` runs Vite's project scaffolder
-  `--template react-ts` tells it we want React with TypeScript
-  `bun install` installs the dependencies listed in `package.json`

Notice how fast `bun install` was? With npm, this takes 15-30 seconds. With Bun, it's nearly instant.

### Step 1.2: Verify the Development Server

```bash
bun run dev
```

**Checkpoint:** Open http://localhost:5173 in your browser. You should see the Vite + React starter page with a counter button. Click the button—it should increment. This confirms:

-  Vite's dev server is working
-  React is rendering
-  Hot Module Replacement (HMR) is active (try editing `src/App.tsx` and watch the page update without a full reload)

### Step 1.3: Install Tailwind CSS v4

Tailwind v4 is a significant rewrite that's simpler to set up than v3. No more `tailwind.config.js`—configuration happens in CSS.

```bash
bun add tailwindcss @tailwindcss/vite
```

**Why these packages?**

-  `tailwindcss` is the core framework
-  `@tailwindcss/vite` is the official Vite plugin that makes Tailwind work with Vite's build system

### Step 1.4: Configure Vite for Tailwind

Replace the contents of `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
   plugins: [react(), tailwindcss()],
});
```

**What's happening here?** Vite uses a plugin system. Each plugin can hook into the build process. The Tailwind plugin processes your CSS and generates the utility classes you use.

### Step 1.5: Set Up Tailwind CSS

Replace the contents of `src/index.css`:

```css
@import "tailwindcss";

@theme {
   /* Custom color palette - these extend Tailwind's defaults */
   --color-primary: #2563eb;
   --color-primary-hover: #1d4ed8;
   --color-danger: #dc2626;
   --color-danger-hover: #b91c1c;

   /* Custom font */
   --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
}

/* Base styles applied to all elements */
@layer base {
   body {
      @apply bg-gray-50 text-gray-900 antialiased;
   }
}
```

**Understanding Tailwind v4's structure:**

-  `@import "tailwindcss"` — This single import brings in all of Tailwind's utility classes. In v3, you needed three separate directives.

-  `@theme { }` — This is where you customize Tailwind's design tokens (colors, fonts, spacing, etc.). These become CSS custom properties that Tailwind's utilities reference. For example, defining `--color-primary` means you can use `bg-primary` and `text-primary` in your markup.

-  `@layer base { }` — Tailwind organizes styles into layers: `base` (element defaults), `components` (reusable patterns), and `utilities` (single-purpose classes). The `@layer` directive ensures your styles are inserted at the right point in the cascade.

-  `@apply` — This directive lets you use Tailwind utilities inside regular CSS. It's useful for base styles that should apply everywhere.

### Step 1.6: Clean Up Starter Code

The Vite starter includes demo code we don't need. Let's replace it with a minimal starting point.

Replace `src/App.tsx`:

```tsx
function App() {
   return (
      <div className="min-h-screen">
         <div className="mx-auto max-w-3xl px-4 py-8">
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
            </header>

            <main>
               <p className="text-center text-gray-500">
                  Your ideas will appear here.
               </p>
            </main>
         </div>
      </div>
   );
}

export default App;
```

**Reading Tailwind classes:** If you're new to Tailwind, here's how to read these classes:

-  `min-h-screen` — Minimum height of 100vh (full viewport height)
-  `mx-auto` — Horizontal margin auto (centers the element)
-  `max-w-3xl` — Maximum width of 48rem (768px)
-  `px-4` — Padding left and right of 1rem (16px)
-  `py-8` — Padding top and bottom of 2rem (32px)
-  `mb-8` — Margin bottom of 2rem
-  `text-center` — Center-aligned text
-  `text-4xl` — Font size of 2.25rem (36px)
-  `font-bold` — Font weight 700
-  `text-gray-900` — Near-black text color
-  `mt-2` — Margin top of 0.5rem (8px)
-  `text-gray-600` — Medium gray text

The pattern is: `{property}-{value}`. Once you learn the abbreviations (`m` for margin, `p` for padding, `text` for typography, `bg` for background), you can read and write Tailwind fluently.

Delete these files we won't use:

```bash
rm src/App.css
rm src/assets/react.svg
```

### Step 1.7: Set Up Project Structure

Create the directory structure we'll use throughout the project:

```bash
mkdir -p src/components src/hooks src/lib src/types
```

**Why this structure?**

-  `src/components/` — React components (UI building blocks)
-  `src/hooks/` — Custom React hooks (reusable stateful logic)
-  `src/lib/` — Non-React utilities (database client, API functions)
-  `src/types/` — TypeScript type definitions

This is a common React project structure. Components are isolated UI pieces, hooks extract reusable logic, and lib contains everything else.

### Step 1.8: Verify Tailwind is Working

```bash
bun run dev
```

**Checkpoint:** Open http://localhost:5173. You should see:

-  "Quiver" as a large, bold heading
-  "Capture ideas anywhere." in gray below it
-  "Your ideas will appear here." centered in lighter gray
-  A light gray background (`bg-gray-50`)

If the text is unstyled (default browser serif font, no colors), Tailwind isn't loading. Double-check that:

1. `@import "tailwindcss"` is in `src/index.css`
2. The Tailwind Vite plugin is in `vite.config.ts`
3. You've restarted the dev server after making config changes

### Step 1.9: Test Hot Reloading

While the dev server is running, try changing `text-4xl` to `text-6xl` in App.tsx. The heading should immediately grow larger without a page refresh.

This is **Hot Module Replacement (HMR)**—Vite replaces the changed module while preserving application state. For UI development, this dramatically speeds up iteration.

**Milestone 1 Complete!** You now have a working development environment with:

-  Bun as the package manager and runtime
-  Vite as the dev server and build tool
-  React + TypeScript for the UI
-  Tailwind v4 for styling

---
