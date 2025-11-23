---
title: "Part 9: Deployment to Vercel"
seriesTitle: "Building Quiver: An Offline-First PWA in a Weekend"
series: "Quiver"
slug: "quiver/09-deployment-to-vercel"
---

_This is Part 9 of a 10-part series on building Quiver. [Start with Part 1](/posts/quiver/01-the-weekend-project) if you missed it._

---

It works on your machine. Now let's make it work for everyone.

We're deploying to **Vercel**. Vercel is optimized for frontend frameworks, but it also handles our serverless API needs perfectly.

## The Backend Challenge

We built our API using Hono. In development, we ran `bun run dev:api` to spin up a Node.js server. Vercel doesn't run a persistent Node server; it runs **Serverless Functions**.

Fortunately, Hono allows us to export a handle that Vercel can consume directly.

## Creating the Serverless Entrypoint

Create `api/index.ts` (at the root, or in a specific location depending on your configuration, but Vercel looks for `api/` by default for functions).

Wait—our Hono code is in `src/api/server.ts`. We need to bridge the gap.

In `src/api/server.ts`, make sure you export the `app`.

Then create `api/index.ts`:

```typescript
import { handle } from "hono/vercel";
import app from "../src/api/server";

export const config = {
   runtime: "edge",
};

export default handle(app);
```

This tiny adapter tells Vercel: "Hey, take my Hono app and run it on your Edge Runtime."

## Environment Variables

Go to your Vercel dashboard. Import the project from GitHub.

You need to add the following environment variables (the ones from your `.env.local`):

-  `VITE_TURSO_DATABASE_URL`
-  `VITE_TURSO_AUTH_TOKEN`
-  `ANTHROPIC_API_KEY` (for the backend)
-  `INNGEST_SIGNING_KEY` (you'll get this from the Inngest dashboard)
-  `INNGEST_EVENT_KEY`

## Inngest Production Setup

For Inngest to work in production, your app needs to tell Inngest "I exist."

1. Go to [Inngest Cloud](https://app.inngest.com).
2. Create a new app.
3. Get your Signing Key and Event Key.
4. Add them to Vercel.

When you deploy, Inngest will ping your `/api/inngest` endpoint to discover your functions.

## Deploying

```bash
git push origin main
```

Vercel detects the push and starts building.

## Verifying Production

Once deployed, open your Vercel URL.

1. **Check PWA install**: Do you see the install icon?
2. **Check Database**: Create an idea. Does it persist?
3. **Check AI**: Run a brainstorm. Does it complete?

If AI fails, check your Vercel logs. It's often a missing environment variable.

You now have a live, production app. In the final part, we'll do a quality pass to make it shine.
