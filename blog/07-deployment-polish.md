# Building Quiver: An Offline-First PWA in a Weekend

## Part 7: Deployment & Production Polish

*This is Part 7 of a 7-part series on building Quiver, an offline-first Progressive Web App for capturing and developing ideas with AI.*

---

We've built something real: an offline-first idea capture app with AI brainstorming. It runs locally on your machine. Now it needs to run everywhere else.

This final post covers deployment to Vercel, Lighthouse audits, accessibility improvements, and the polish that separates a weekend project from something that feels genuinely good to use.

## Preparing for Deployment

Before deploying, verify your code is production-ready:

```bash
# Run a production build locally
bun run build

# Preview it
bun run preview
```

Open `http://localhost:4173` and test:
- [ ] Ideas persist after refresh
- [ ] PWA installs correctly
- [ ] Offline mode works
- [ ] AI brainstorming generates responses

If everything works locally, we're ready to deploy.

## Deploying to Vercel

Vercel offers the smoothest deployment experience for Vite apps. The free tier includes:
- Unlimited personal projects
- 100GB bandwidth per month
- Automatic SSL
- Automatic deployments on Git push

### Option A: Web Interface (Recommended First Time)

1. Push your code to GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/quiver.git
git branch -M main
git push -u origin main
```

2. Go to [vercel.com/new](https://vercel.com/new)

3. Click "Import Project" and select your repository

4. Vercel auto-detects Vite. Verify these settings:
   - Framework Preset: Vite
   - Build Command: `bun run build`
   - Output Directory: `dist`

5. Add environment variables. Click "Environment Variables" and add:
   - `VITE_TURSO_DATABASE_URL` = your Turso URL
   - `VITE_TURSO_AUTH_TOKEN` = your Turso token
   - `VITE_ANTHROPIC_API_KEY` = your Claude API key

6. Click "Deploy"

### Option B: CLI

```bash
# Install Vercel CLI
bun add -g vercel

# Login
vercel login

# Deploy (first time will prompt for configuration)
vercel

# Production deployment
vercel --prod
```

For CLI deployments, add environment variables in the Vercel dashboard under Settings → Environment Variables.

### Handling SPA Routing

If you add client-side routing later (React Router, etc.), you'll need to handle 404s on page refresh. Create `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

This tells Vercel to serve `index.html` for all routes, letting React handle routing.

## Lighthouse Audit

Lighthouse is Chrome's built-in tool for auditing web quality. Run it on your deployed site:

1. Open your deployed URL in Chrome
2. Open DevTools (F12)
3. Go to the "Lighthouse" tab
4. Select all categories: Performance, Accessibility, Best Practices, SEO, PWA
5. Click "Analyze page load"

**Target scores**: 90+ in all categories.

Common issues and fixes:

### Performance Issues

**Render-blocking resources**: Vite handles most of this, but ensure you're not importing large libraries unnecessarily.

**Image optimization**: If you add images later, use modern formats (WebP, AVIF) and lazy loading:
```tsx
<img loading="lazy" src="/image.webp" alt="Description" />
```

**Font loading**: We use system fonts, which avoids font-related delays entirely.

### Accessibility Fixes

Add proper ARIA labels and focus states:

```tsx
// Accessible button
<button
  onClick={handleDelete}
  aria-label="Archive this idea"
>
  Archive
</button>

// Accessible input
<input
  type="text"
  aria-label="Enter idea title"
  placeholder="Capture an idea..."
/>
```

Add focus styles to `src/index.css`:

```css
/* Visible focus states */
button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Skip link for keyboard navigation */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #0066cc;
  color: white;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

Add a skip link in `App.tsx`:

```tsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

<main id="main-content" className="app-main">
  {/* ... */}
</main>
```

### SEO Improvements

Update `index.html` with complete meta tags:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

  <!-- SEO Meta Tags -->
  <title>Quiver - Capture and Develop Your Ideas</title>
  <meta name="description" content="An offline-first PWA for capturing, organizing, and developing your ideas with AI-powered brainstorming." />
  <meta name="keywords" content="ideas, notes, brainstorming, AI, offline, PWA" />
  <meta name="author" content="Your Name" />

  <!-- Open Graph / Social Media -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Quiver - Idea Capture App" />
  <meta property="og:description" content="Capture and develop your ideas anywhere, even offline." />
  <meta property="og:image" content="/og-image.png" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Quiver - Idea Capture App" />
  <meta name="twitter:description" content="Capture and develop your ideas anywhere, even offline." />

  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#0066cc" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Quiver" />
  <link rel="apple-touch-icon" href="/pwa-192x192.png" />
  <link rel="icon" type="image/svg+xml" href="/icon.svg" />
</head>
```

## Error Boundaries

React error boundaries catch JavaScript errors in child components and display fallback UI instead of crashing the whole app.

Create `src/components/ErrorBoundary.tsx`:

```typescript
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-boundary">
            <h2>Something went wrong</h2>
            <p>Please refresh the page and try again.</p>
            <button onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

Add styles:

```css
.error-boundary {
  text-align: center;
  padding: 40px;
  background: #fff0f0;
  border-radius: 8px;
  margin: 20px;
}

.error-boundary h2 {
  color: #cc0000;
  margin-bottom: 12px;
}

.error-boundary button {
  margin-top: 16px;
  padding: 10px 20px;
  background: #cc0000;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
```

Wrap your app in `src/main.tsx`:

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

## Keyboard Shortcuts

Power users love keyboard shortcuts. Create `src/hooks/useKeyboardShortcuts.ts`:

```typescript
import { useEffect } from "react";

interface Shortcuts {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = [
        e.ctrlKey || e.metaKey ? "mod" : "",
        e.shiftKey ? "shift" : "",
        e.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join("+");

      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
```

Use in your App component:

```typescript
import { useRef } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

function App() {
  const inputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcuts({
    "mod+n": () => inputRef.current?.focus(), // Cmd/Ctrl+N focuses new idea input
    "escape": () => setSelectedIdea(null),    // Escape deselects idea
  });

  // Pass ref to IdeaForm...
}
```

## Loading Spinner Component

Create `src/components/LoadingSpinner.tsx`:

```typescript
export function LoadingSpinner({ size = "medium" }: { size?: "small" | "medium" | "large" }) {
  const sizeClass = {
    small: "spinner-small",
    medium: "spinner-medium",
    large: "spinner-large",
  }[size];

  return (
    <div className={`spinner ${sizeClass}`} role="status" aria-label="Loading">
      <div className="spinner-circle"></div>
    </div>
  );
}
```

Add styles:

```css
.spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.spinner-small .spinner-circle { width: 16px; height: 16px; }
.spinner-medium .spinner-circle { width: 24px; height: 24px; }
.spinner-large .spinner-circle { width: 40px; height: 40px; }

.spinner-circle {
  border: 3px solid #e0e0e0;
  border-top-color: #0066cc;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Mobile Testing Checklist

Test on real devices, not just browser emulators:

**Touch interactions:**
- [ ] Tap to select ideas works
- [ ] Scroll is smooth
- [ ] Form inputs don't zoom on focus (font-size >= 16px)
- [ ] Buttons have adequate touch targets (min 44x44px)

**PWA installation:**
- [ ] Android: "Add to Home Screen" appears
- [ ] iOS: Share → Add to Home Screen works
- [ ] App opens in standalone mode
- [ ] Splash screen appears during load

**Offline:**
- [ ] App works with airplane mode on
- [ ] Ideas sync when connection returns
- [ ] Offline indicator shows correctly

**Performance:**
- [ ] First load under 3 seconds on 4G
- [ ] Interactions feel responsive
- [ ] No janky scrolling

## Final Polish Checklist

Before declaring the app complete:

**Functionality:**
- [ ] Create, edit, delete ideas work
- [ ] Ideas persist across sessions
- [ ] AI brainstorming generates responses
- [ ] Idea expansion works

**PWA:**
- [ ] Service worker registered
- [ ] App is installable
- [ ] Offline mode works
- [ ] Data syncs when back online

**Accessibility:**
- [ ] All interactive elements focusable
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader compatible

**Performance:**
- [ ] Lighthouse score 90+ all categories
- [ ] No console errors
- [ ] No memory leaks

**UX:**
- [ ] Loading states for async operations
- [ ] Error messages are helpful
- [ ] Empty states guide the user
- [ ] Confirmation for destructive actions

## What We've Built

Over this series, we've built a production-ready application:

- **A complete CRUD interface** with type-safe database queries
- **Full offline support** with IndexedDB caching and sync
- **AI-powered brainstorming** with streaming responses
- **PWA installation** on all platforms
- **Production deployment** with Lighthouse 90+ scores

The app works. Ideas capture, persist, sync. AI helps develop them. It installs on your phone and works in airplane mode.

More importantly, you've learned patterns that apply far beyond this project:
- Offline-first architecture with IndexedDB
- Service worker caching strategies
- Type-safe database queries with Drizzle
- AI integration with streaming
- React hooks for complex state management

## What's Next

The core app is complete, but there's always more to build:

**Browser extension** (2-3 days): Capture open tabs with one click. Web apps can't access browser tabs—you need an extension for that.

**Advanced sync**: Handle conflicts when the same idea is edited on multiple devices. The current "last write wins" approach is fine for personal use but not for collaboration.

**Search with FTS5**: SQLite's full-text search for finding ideas by content. We store the data; searching it efficiently is the next step.

**Reminders**: Background notifications to revisit old ideas. The Push API enables this, though implementation is non-trivial.

**Export**: Markdown, JSON, or plain text exports. Your ideas shouldn't be locked in any single app.

But don't let feature creep prevent you from shipping. The app as built is genuinely useful. Deploy it, use it, and iterate based on what you actually need.

---

*Final commit:*

```bash
git add .
git commit -m "Part 7: Deployment and polish complete"
git push origin main
```

---

## Series Conclusion

We started with a goal: build a production-ready PWA in a weekend. Seven posts later, we have:

| Milestone | What We Built |
|-----------|---------------|
| Part 1 | Project scaffolding with Vite, React, TypeScript |
| Part 2 | Cloud database with Turso and type-safe queries with Drizzle |
| Part 3 | Complete CRUD interface with optimistic updates |
| Part 4 | PWA configuration with install prompts |
| Part 5 | Offline-first architecture with IndexedDB and sync |
| Part 6 | AI brainstorming with Claude streaming |
| Part 7 | Production deployment and polish |

**Total cost**: ~$2.70/month (Claude API). Everything else is free tier.

**Development time**: 12-16 hours spread across a weekend.

The techniques here—offline-first architecture, edge databases, AI integration—aren't just for idea capture apps. They're patterns you can apply to any client-side application that needs to work reliably, quickly, and intelligently.

Now go build something.

---

*The complete source code is available at github.com/YOUR_USERNAME/quiver*
