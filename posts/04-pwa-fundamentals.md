# Building Quiver: An Offline-First PWA in a Weekend

## Part 4: Progressive Web App Fundamentals

*This is Part 4 of a 7-part series on building Quiver, an offline-first Progressive Web App for capturing and developing ideas with AI.*

---

Here's an interaction I have with apps constantly: I'm out, I want to capture a thought, I reach for my phone. If the app is a website, I open the browser, wait for it to load, navigate to the URL, wait for that to load. By the time I'm ready to type, the thought is half-forgotten.

Native apps don't have this problem. They're on your home screen. You tap, they open. But building native apps means separate codebases for iOS, Android, and web, plus app store approval processes, update delays, and platform fees.

Progressive Web Apps are the middle ground. A PWA is a website that can be installed like a native app, appearing on your home screen with its own icon, opening in its own window without browser chrome. The same codebase runs everywhere.

This post covers the fundamentals: what makes a PWA installable, how service workers enable offline functionality, and how to configure all of this with minimal boilerplate.

## What Makes a PWA?

A Progressive Web App isn't a different technology—it's a set of enhancements to a regular web app. The browser checks for specific criteria:

1. **HTTPS**: The site must be served over a secure connection
2. **Web App Manifest**: A JSON file describing the app (name, icons, colors)
3. **Service Worker**: A script that runs in the background, handling caching and offline functionality

When all three are present, browsers recognize the site as installable. Chrome shows an install icon in the address bar. Android prompts users to add to home screen. iOS allows "Add to Home Screen" from the share menu.

Once installed, the app:
- Appears on the home screen with its own icon
- Opens in a standalone window (no browser URL bar)
- Can work offline (with proper service worker configuration)
- Receives push notifications (if implemented)

The user experience becomes indistinguishable from a native app.

## The Web App Manifest

The manifest tells browsers about your app. It's a JSON file that describes metadata like the app name, colors, and icons.

With `vite-plugin-pwa`, we don't write a separate manifest file—we configure it in Vite's config. Install the plugin:

```bash
bun add -d vite-plugin-pwa
```

Before configuring the plugin, we need icons. PWAs require at least two sizes: 192x192 and 512x512 pixels. For development, create a simple placeholder.

Create `public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#0066cc"/>
  <text x="256" y="300" font-family="Arial" font-size="280" fill="white" text-anchor="middle">Q</text>
</svg>
```

For production, you'll want proper PNG icons. Tools like [PWABuilder's Image Generator](https://www.pwabuilder.com/imageGenerator) can generate all required sizes from a single source image. For now, you can convert the SVG to PNGs using any image editor, or use online converters.

Name them `pwa-192x192.png` and `pwa-512x512.png` in the `public/` directory.

## Configuring vite-plugin-pwa

Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Quiver - Idea Capture",
        short_name: "Quiver",
        description: "Capture and develop your ideas anywhere",
        theme_color: "#0066cc",
        background_color: "#f5f5f5",
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
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Let's break down the important options:

**`registerType: "autoUpdate"`** — When we deploy a new version, the service worker updates automatically. Users always get the latest code without being prompted. The alternative is `"prompt"`, which asks users before updating.

**`manifest` object** — This becomes the web app manifest. Key fields:
- `name`: Full name shown in app stores and launchers
- `short_name`: Used when space is limited (home screen icons)
- `theme_color`: Colors the mobile status bar and browser chrome
- `background_color`: Splash screen background during app launch
- `display: "standalone"`: Removes browser chrome—the app looks native

**`icons`** — Minimum two: 192x192 and 512x512. The `maskable` variant allows Android to crop the icon into circles or other shapes without cutting off important content.

**`workbox.globPatterns`** — Which files to precache. This pattern caches all static assets (JavaScript, CSS, HTML, images). When users load the app, these files are stored locally.

## Service Workers: The Core Technology

A service worker is JavaScript that runs in a separate thread from your main app. It intercepts network requests and can serve cached responses, enabling offline functionality.

The key mental model: when your app makes a fetch request, the service worker sees it first. It can:
1. Pass it through to the network (normal behavior)
2. Return a cached response (offline or cache-first)
3. Return a cached response while fetching an update (stale-while-revalidate)

`vite-plugin-pwa` uses Workbox to generate service workers automatically. The `globPatterns` config tells Workbox what to precache—files that are stored immediately when the service worker installs.

For API calls and dynamic data, we'll add runtime caching in Part 5.

## HTML Meta Tags

The `index.html` file needs meta tags for proper PWA behavior, especially on iOS.

Update `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <meta name="theme-color" content="#0066cc" />
    <meta
      name="description"
      content="Capture and develop your ideas anywhere"
    />
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

The `apple-*` meta tags are iOS-specific. Safari doesn't fully support the web app manifest, so these provide equivalent functionality:
- `apple-mobile-web-app-capable`: Enables standalone mode on iOS
- `apple-mobile-web-app-status-bar-style`: Status bar appearance
- `apple-mobile-web-app-title`: App name on home screen
- `apple-touch-icon`: Icon for home screen

## Custom Install Prompt

Browsers show their own install prompts, but they're easy to miss. A custom prompt lets us control the timing and presentation.

Create `src/components/InstallPrompt.tsx`:

```typescript
import { useState, useEffect } from "react";

// TypeScript interface for the browser event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Capture the install prompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Show our custom prompt after user engagement
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Handle successful installation
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <p>
          <strong>Install Quiver</strong>
        </p>
        <p>Add to your home screen for quick access</p>
        <div className="install-prompt-actions">
          <button onClick={handleInstall} className="btn-install">
            Install
          </button>
          <button onClick={handleDismiss} className="btn-dismiss">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
```

The flow works like this:

1. Browser fires `beforeinstallprompt` event when it detects an installable PWA
2. We capture and store this event
3. After 3 seconds (giving users time to engage), we show our custom prompt
4. When the user clicks Install, we call `event.prompt()` to trigger the browser's native install dialog
5. The user's choice is available via `event.userChoice`

Delaying the prompt is intentional. Users are more likely to install after they've used the app and see its value.

## iOS Install Instructions

iOS doesn't support `beforeinstallprompt`. We need manual instructions.

Create `src/components/IOSInstallInstructions.tsx`:

```typescript
import { useState, useEffect } from "react";

export function IOSInstallInstructions() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Detect iOS Safari (not in standalone mode)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    const isSafari =
      /Safari/.test(navigator.userAgent) &&
      !/Chrome/.test(navigator.userAgent);

    if (isIOS && isSafari && !isStandalone) {
      setTimeout(() => setShow(true), 5000);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="ios-install-instructions">
      <button className="close-btn" onClick={() => setShow(false)}>
        ×
      </button>
      <p>
        <strong>Install Quiver</strong>
      </p>
      <p>
        Tap the share button then "Add to Home Screen"
      </p>
    </div>
  );
}
```

This component detects iOS Safari and shows instructions after 5 seconds. It's not as seamless as the Android experience, but it's the best we can do on iOS.

## Styles for Install Components

Add to `src/index.css`:

```css
/* Install Prompt */
.install-prompt {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.install-prompt-content p {
  margin-bottom: 8px;
}

.install-prompt-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.btn-install {
  background-color: #0066cc;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-dismiss {
  background-color: transparent;
  color: #666;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
}

/* iOS Instructions */
.ios-install-instructions {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: #333;
  color: white;
  border-radius: 12px;
  padding: 16px;
  z-index: 1000;
}

.ios-install-instructions .close-btn {
  position: absolute;
  top: 8px;
  right: 12px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
}

.ios-install-instructions p {
  margin-bottom: 4px;
}
```

## Updating the App Component

Add the install prompts to `src/App.tsx`:

```typescript
import { useIdeas } from "@/hooks/useIdeas";
import { IdeaForm } from "@/components/IdeaForm";
import { IdeaCard } from "@/components/IdeaCard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { IOSInstallInstructions } from "@/components/IOSInstallInstructions";

function App() {
  const { ideas, loading, error, addIdea, editIdea, removeIdea } = useIdeas();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Quiver</h1>
        <p>Capture and develop your ideas</p>
      </header>

      <main className="app-main">
        <IdeaForm onSubmit={addIdea} />

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Loading ideas...</div>
        ) : ideas.length === 0 ? (
          <div className="empty-state">
            <p>No ideas yet!</p>
            <p>Start capturing your thoughts above.</p>
          </div>
        ) : (
          <div className="ideas-list">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onUpdate={editIdea}
                onDelete={removeIdea}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          {ideas.length} idea{ideas.length !== 1 ? "s" : ""} captured
        </p>
      </footer>

      {/* PWA Install Prompts */}
      <InstallPrompt />
      <IOSInstallInstructions />
    </div>
  );
}

export default App;
```

## Testing PWA Features

**Critical**: PWA features only work in production builds. The development server doesn't register service workers.

Build and preview:

```bash
bun run build
bun run preview
```

Open Chrome and navigate to `http://localhost:4173`. Then:

1. **Check the manifest**: Open DevTools → Application → Manifest. You should see your app name, icons, and colors.

2. **Check the service worker**: DevTools → Application → Service Workers. You should see a registered service worker with status "activated and running."

3. **Test installation**: Look for the install icon in Chrome's address bar (a circled plus or computer-with-arrow icon). Click it. The app should install and open in its own window.

4. **Verify standalone mode**: The installed app should have no URL bar—just your app content in a native-feeling window.

If something's wrong, check the DevTools console for errors. Common issues:
- Missing icons (check paths and filenames)
- Service worker registration failures (check `vite.config.ts` syntax)
- HTTPS requirement (not an issue in local preview, but matters in production)

## What We've Built

The app is now installable. Users can add it to their home screens and launch it like a native app. The service worker precaches static assets, so the app shell loads instantly.

But we're not done with offline support. Right now, if you go offline:
- The app shell loads (good)
- But data fetches fail (bad)
- No ideas appear until you're back online (very bad)

In Part 5, we'll fix this. We'll add IndexedDB for local data storage, queue changes made offline, and sync when the connection returns. The app will work fully without internet.

---

*Commit your progress:*

```bash
git add .
git commit -m "Part 4: PWA configuration with install prompts"
```

---

*Next in the series: [Part 5: Offline-First Architecture](/blog/05-offline-first.md)*
