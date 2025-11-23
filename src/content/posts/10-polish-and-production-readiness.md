---
title: "Part 10: Polish & Production Readiness"
seriesTitle: "Building Quiver: An Offline-First PWA in a Weekend"
series: "Quiver"
slug: "quiver/10-polish-and-production-readiness"
---

_This is Part 10 of a 10-part series on building Quiver. [Start with Part 1](/posts/quiver/01-the-weekend-project) if you missed it._

---

We have a deployed app. But does it feel _good_?

"Polish" is the difference between a hackathon demo and a product. Let's look at the final 10% that takes 50% of the effort.

## Skeleton Loading

When you load the app, do you see a white screen, then a flash of content? That's jarring.

We should use **Skeletons**. A skeleton is a gray, pulsing placeholder that mimics the shape of your content.

Create `src/components/Skeleton.tsx`:

```tsx
export function Skeleton({ className }: { className?: string }) {
   return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}
```

Now update `IdeaList.tsx`. Instead of `if (loading) return "Loading..."`, return a list of skeletons:

```tsx
if (loading) {
   return (
      <div className="space-y-4">
         {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 border rounded-xl">
               <Skeleton className="h-6 w-3/4 mb-4" />
               <Skeleton className="h-4 w-full mb-2" />
               <Skeleton className="h-4 w-2/3" />
            </div>
         ))}
      </div>
   );
}
```

This makes the app feel significantly faster because the layout is stable immediately.

## Keyboard Shortcuts

Power users love keyboard shortcuts.

-  `Cmd+K` (or `Ctrl+K`) to search
-  `Cmd+Enter` to submit the form

We can add a global listener in `App.tsx` or use a hook like `useHotkeys`.

```tsx
useEffect(() => {
   const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
         e.preventDefault();
         document.getElementById("search-input")?.focus();
      }
   };
   window.addEventListener("keydown", handleKeyDown);
   return () => window.removeEventListener("keydown", handleKeyDown);
}, []);
```

## Lighthouse Audit

Open Chrome DevTools -> Lighthouse. Run a "Mobile" audit.

Common issues to fix:

1. **Touch targets**: Make sure buttons are at least 44x44px.
2. **Contrast**: Ensure text gray colors are readable against the background.
3. **Meta description**: Add a description in `index.html`.

## Final Checklist

-  [ ] **Offline**: Turn off wifi, reload, create idea. Reconnect. Syncs?
-  [ ] **AI**: Does it fail gracefully if the API is down?
-  [ ] **Mobile**: Does it look good on your phone?
-  [ ] **Install**: Can you add it to the home screen?

## Conclusion

We started with `bun create vite` and ended with a full-stack, offline-first, AI-powered application.

**What we learned:**

-  **Bun** speeds up the feedback loop.
-  **Turso + Drizzle** brings SQL to the edge.
-  **Local-First** is the future of web apps.
-  **Inngest** simplifies background complexity.

The code is yours. [Fork it](https://github.com/nbbaier/quiver). Break it. Build something better.

Thanks for reading.
