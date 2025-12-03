## Milestone 4: PWA Configuration

**Goal:** Make the app installable and capable of loading offline.

**Why this matters:** A Progressive Web App (PWA) bridges the gap between websites and native apps. By adding PWA capabilities, your app can:

1. **Be installed** — Users can add it to their home screen and launch it like a native app
2. **Work offline** — The app shell loads even without internet
3. **Load faster** — Assets are cached locally after the first visit
4. **Feel native** — Full-screen mode, splash screens, and OS integration

For an idea capture app, installability is crucial. When inspiration strikes, you want to tap an icon—not open a browser, type a URL, and wait for it to load.

### Understanding Service Workers

Before we dive in, let's understand what makes PWAs work: **service workers**.

A service worker is a JavaScript file that runs separately from your main app. It sits between your app and the network, acting as a proxy. When your app requests a resource (HTML, CSS, JS, API data), the service worker can:

-  **Serve from cache** — Return a cached version instantly
-  **Fetch from network** — Get fresh data from the server
-  **Do both** — Try network first, fall back to cache (or vice versa)

This is what enables offline functionality. When you're offline, the service worker serves cached assets instead of failing.

**We won't write the service worker manually.** That's error-prone and tedious. Instead, we'll use `vite-plugin-pwa`, which uses Google's Workbox library to generate a service worker based on our configuration.

### Step 4.1: Install the PWA Plugin

```bash
bun add -D vite-plugin-pwa
```

**Why `-D` (dev dependency)?** The plugin is only needed during build time. It generates the service worker and manifest—these generated files are what get deployed, not the plugin itself.

### Step 4.2: Create PWA Icons

PWAs need icons in multiple sizes for different contexts (home screen, app switcher, splash screen). You need at least:

-  `pwa-192x192.png` — Standard icon size
-  `pwa-512x512.png` — Large icon for splash screens

**For quick prototyping**, create simple placeholder icons. You can use any image editor, or an online tool like https://favicon.io/favicon-generator/.

Place the icons in your `public/` directory:

-  `public/pwa-192x192.png`
-  `public/pwa-512x512.png`

**For production**, use https://realfavicongenerator.net/ to generate a complete icon set with proper iOS and Android optimizations.

**Why does this matter?** Without proper icons, your app won't be installable on some platforms. iOS Safari is particularly strict—it needs an `apple-touch-icon` to show the install prompt.

### Step 4.3: Configure vite-plugin-pwa

Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
   plugins: [
      react(),
      tailwindcss(),
      VitePWA({
         // Automatically update the service worker when new content is available
         registerType: "autoUpdate",

         // Assets to include in the precache
         includeAssets: [
            "favicon.ico",
            "apple-touch-icon.png",
            "pwa-192x192.png",
            "pwa-512x512.png",
         ],

         // Web app manifest configuration
         manifest: {
            name: "Quiver - Idea Capture",
            short_name: "Quiver",
            description: "Capture ideas anywhere, even offline",
            theme_color: "#2563eb",
            background_color: "#f9fafb",
            display: "standalone",
            scope: "/",
            start_url: "/",
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
               {
                  src: "pwa-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "any maskable",
               },
            ],
         },

         // Workbox configuration for caching strategies
         workbox: {
            // Cache all static assets
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

            // Runtime caching for API requests
            runtimeCaching: [
               {
                  // Cache Turso API responses
                  urlPattern: /^https:\/\/.*\.turso\.io/,
                  handler: "NetworkFirst",
                  options: {
                     cacheName: "turso-api-cache",
                     expiration: {
                        maxEntries: 50,
                        maxAgeSeconds: 60 * 60 * 24, // 24 hours
                     },
                     cacheableResponse: {
                        statuses: [0, 200],
                     },
                  },
               },
            ],
         },
      }),
   ],
});
```

**Understanding the configuration:**

**`registerType: 'autoUpdate'`** — When you deploy a new version, the service worker automatically updates without requiring user interaction. The alternative is `'prompt'`, which asks users to refresh.

**`manifest`** — This is the Web App Manifest, a JSON file that tells browsers how to install your app:

-  `name` / `short_name` — Full name and abbreviated name
-  `display: 'standalone'` — Run without browser chrome (address bar, etc.)
-  `theme_color` — The color of the status bar on mobile
-  `icons` — The app icons in different sizes

**`workbox.globPatterns`** — Which files to precache (download and store during install). We're caching all JS, CSS, HTML, images, and fonts.

**`workbox.runtimeCaching`** — How to handle requests that aren't precached. For our Turso API:

-  `NetworkFirst` — Try the network first; if offline, use cached data
-  `cacheName` — Name of the cache (useful for debugging)
-  `expiration` — Limit cache size and age

### Step 4.4: Add Meta Tags for iOS

iOS Safari doesn't read the Web App Manifest as thoroughly as Android Chrome. We need to add meta tags for proper iOS support.

Update `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
   <head>
      <meta charset="UTF-8" />
      <link rel="icon" type="image/svg+xml" href="/vite.svg" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <!-- PWA meta tags -->
      <meta name="theme-color" content="#2563eb" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Quiver" />
      <link rel="apple-touch-icon" href="/pwa-192x192.png" />

      <title>Quiver</title>
   </head>
   <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
   </body>
</html>
```

**What do these meta tags do?**

-  `theme-color` — Sets the browser toolbar color on Android
-  `apple-mobile-web-app-capable` — Tells Safari this is a web app
-  `apple-mobile-web-app-status-bar-style` — Controls iOS status bar appearance
-  `apple-mobile-web-app-title` — The name shown on iOS home screen
-  `apple-touch-icon` — The icon used on iOS home screen

### Step 4.5: Build and Test the PWA

The PWA features only work in production builds. The dev server doesn't register service workers (which would cause caching headaches during development).

```bash
bun run build
bun run preview
```

**Checkpoint — Verify PWA installation:**

1. Open http://localhost:4173 in Chrome
2. Open DevTools (F12) → Application tab
3. Click "Service Workers" in the left sidebar
   -  ✓ You should see a service worker registered and "activated and is running"
4. Click "Manifest" in the left sidebar
   -  ✓ You should see your app name, icons, and display mode
5. Look for the install icon in Chrome's address bar (right side)
   -  ✓ Click it to install the app

**Checkpoint — Test offline loading:**

1. In DevTools → Network tab, check the "Offline" checkbox
2. Refresh the page
3. ✓ The app shell should still load (header, form, basic layout)
4. ✓ Data loading will fail (we'll fix this in Milestone 5)
5. Uncheck "Offline" to restore connectivity

### Step 4.6: Add an Offline Indicator

Users should know when they're offline. Let's add a visual indicator.

Create `src/components/OfflineIndicator.tsx`:

```tsx
import { useState, useEffect } from "react";

/**
 * Shows a banner when the user is offline.
 *
 * Why track online status?
 * - Users need to know why data isn't syncing
 * - Sets appropriate expectations (can read, can't write to server)
 * - Builds trust by being transparent about app state
 */
export function OfflineIndicator() {
   const [isOnline, setIsOnline] = useState(navigator.onLine);

   useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      // These events fire when the browser's network status changes
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
         window.removeEventListener("online", handleOnline);
         window.removeEventListener("offline", handleOffline);
      };
   }, []);

   // Don't render anything when online
   if (isOnline) return null;

   return (
      <div
         className="fixed bottom-0 left-0 right-0 bg-amber-400 text-amber-900
                    text-center py-3 px-4 font-medium z-50"
      >
         You're offline. Changes will sync when you're back online.
      </div>
   );
}
```

**Understanding the implementation:**

-  `navigator.onLine` — Browser API that returns current network status
-  `online` / `offline` events — Fire when status changes
-  `useState(navigator.onLine)` — Initialize with current status
-  Conditional rendering — Only show when offline

Add it to `App.tsx`:

```tsx
import { useIdeas } from "./hooks/useIdeas";
import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";
import { OfflineIndicator } from "./components/OfflineIndicator";

function App() {
   const { ideas, loading, error, createIdea, deleteIdea, archiveIdea } =
      useIdeas();

   const handleCreateIdea = async (title: string, content: string) => {
      await createIdea(title, content);
   };

   return (
      <div className="min-h-screen bg-gray-50 pb-16">
         <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
            </header>

            <main className="space-y-8">
               {/* Idea capture form */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                     New Idea
                  </h2>
                  <IdeaForm onSubmit={handleCreateIdea} />
               </section>

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

         {/* Offline indicator at bottom of screen */}
         <OfflineIndicator />
      </div>
   );
}

export default App;
```

Note the `pb-16` (padding-bottom) on the container—this prevents the offline banner from covering content.

**Checkpoint:** Build and preview again (`bun run build && bun run preview`), then toggle offline in DevTools. A yellow banner should appear at the bottom.

**Milestone 4 Complete!** Your app is now a PWA:

-  Installable on mobile and desktop
-  Has a proper manifest with icons
-  Service worker caches static assets
-  Shows offline status to users

But there's a problem: when offline, users can see the app but can't interact with their data. That's what we'll fix next.

---
