---
title: "Part 4: PWA Fundamentals"
seriesTitle: "Building Quiver: An Offline-First PWA in a Weekend"
series: "Quiver"
slug: "quiver/04-pwa-fundamentals"
---

_This is Part 4 of a 8-part series on building Quiver. [Start with Part 1](/blog/quiver/01-the-weekend-project) if you missed it._

---

Right now, Quiver is a website. It lives in a browser tab. If you close the tab, it's gone. If you lose internet, it breaks.

We want Quiver to be an **app**. We want it on the home screen, launching full-screen, and loading instantly regardless of network status. We want a Progressive Web App (PWA).

## The Magic of vite-plugin-pwa

Manually configuring service workers and manifests is tedious and error-prone. We'll use `vite-plugin-pwa`, which automates the heavy lifting using Google's Workbox library under the hood.

First, install it:

```bash
bun add -D vite-plugin-pwa
```

## Configuring Vite

Open `vite.config.ts`. We need to add the PWA plugin to our configuration. This is where we define how our app looks when installed.

```typescript
import { VitePWA } from "vite-plugin-pwa";
// ... other imports

export default defineConfig({
   plugins: [
      react(),
      tailwindcss(),
      VitePWA({
         registerType: "autoUpdate",
         includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
         manifest: {
            name: "Quiver Idea Capture",
            short_name: "Quiver",
            description: "Offline-first idea capture and brainstorming",
            theme_color: "#ffffff",
            background_color: "#ffffff",
            display: "standalone",
            icons: [
               {
                  src: "pwa-192x192.png",
                  sizes: "192x192",
                  type: "image/png",
               },
               {
                  src: "pwa-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
               },
            ],
         },
      }),
   ],
});
```

## Understanding the Configuration

-  **`registerType: "autoUpdate"`**: This tells the service worker to update immediately when a new version is deployed. For complex apps you might want manual control, but for Quiver, "always latest" is fine.
-  **`manifest`**: This JSON object tells the browser (and OS) how to install your app.
   -  `display: "standalone"` removes the browser address bar, making it look like a native app.
   -  `theme_color` sets the status bar color on mobile.

## Adding Icons

A PWA needs icons. You can generate these using tools like [RealFaviconGenerator](https://realfavicongenerator.net/). For now, you can grab placeholder icons or just create simple PNGs in your `public/` folder named `pwa-192x192.png` and `pwa-512x512.png`.

## The Service Worker

The configuration above automatically generates a service worker that caches your build assets (HTML, CSS, JS).

When you build the app (`bun run build`) and preview it (`bun run preview`), `vite-plugin-pwa` generates a `sw.js` file.

## Verifying It Works

1. Run `bun run build`
2. Run `bun run preview`
3. Open the app in Chrome.
4. Open DevTools -> Application -> Service Workers.
5. You should see a service worker activated.

If you look at the address bar, you might see an "Install" icon (depending on your browser). On mobile, you can "Add to Home Screen".

## But Wait...

If you go offline now, the **shell** of the app will load (because the HTML/JS is cached), but the **data** will fail to load (because our API calls to Turso still require the network).

You'll see the UI, but it will be empty or show an error.

To fix this, we need to move our data layer to the client. We need **Offline-First Architecture**.

[Read Part 5: Offline-First Architecture →](/blog/quiver/05-offline-first)
