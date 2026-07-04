# Building Quiver: An Offline-First PWA in a Weekend

## Part 5: Offline-First Architecture

*This is Part 5 of a 7-part series on building Quiver, an offline-first Progressive Web App for capturing and developing ideas with AI.*

---

"Works offline" is easy to say, surprisingly hard to do well.

The naive approach—cache some assets and show a "you're offline" page—doesn't cut it for an idea capture app. Ideas happen at inconvenient times. If the app can't accept input offline, it's fundamentally broken.

True offline-first means:
1. Data is stored locally, not just cached
2. Changes made offline are queued for later sync
3. When the connection returns, everything syncs automatically
4. The user never needs to think about connection status

This post covers the architecture that makes this possible: IndexedDB for local storage, a pending action queue, and a sync mechanism that reconciles local and remote state.

## The Offline Strategy

Here's our approach:

**Read path:**
1. When online, fetch from Turso and cache locally
2. When offline (or on error), read from local cache

**Write path:**
1. When online, write to Turso immediately
2. When offline, write to local cache AND queue the action
3. When back online, replay the queue and refresh

The key insight: we always update local state immediately. The user sees instant feedback. The sync to the server happens in the background.

## IndexedDB: A Local Database

IndexedDB is a low-level API for storing structured data in the browser. Unlike localStorage (which only stores strings and has ~5MB limits), IndexedDB can store megabytes of complex data structures and supports indexes for efficient queries.

The raw API is callback-based and verbose. We'll use the `idb` library, which wraps it with promises:

```bash
bun add idb
```

Create `src/lib/offline-storage.ts`:

```typescript
import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { Idea, CreateIdeaInput } from "@/types/idea";

// Define the database schema
interface QuiverDB extends DBSchema {
  ideas: {
    key: number;
    value: Idea;
    indexes: { "by-created": Date };
  };
  pendingActions: {
    key: number;
    value: {
      id: number;
      type: "create" | "update" | "delete";
      data: CreateIdeaInput | Partial<Idea> | number;
      timestamp: Date;
    };
  };
}

// Singleton database connection
let dbPromise: Promise<IDBPDatabase<QuiverDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<QuiverDB>("quiver-db", 1, {
      upgrade(db) {
        // Create ideas store with an index on createdAt
        const ideasStore = db.createObjectStore("ideas", { keyPath: "id" });
        ideasStore.createIndex("by-created", "createdAt");

        // Create pending actions store with auto-increment key
        db.createObjectStore("pendingActions", {
          keyPath: "id",
          autoIncrement: true,
        });
      },
    });
  }
  return dbPromise;
}

// Cache multiple ideas at once
export async function cacheIdeas(ideas: Idea[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("ideas", "readwrite");
  await Promise.all([...ideas.map((idea) => tx.store.put(idea)), tx.done]);
}

// Get all cached ideas, sorted by creation date
export async function getCachedIdeas(): Promise<Idea[]> {
  const db = await getDB();
  const ideas = await db.getAllFromIndex("ideas", "by-created");
  return ideas.reverse(); // Newest first
}

// Cache a single idea
export async function cacheIdea(idea: Idea): Promise<void> {
  const db = await getDB();
  await db.put("ideas", idea);
}

// Remove a cached idea
export async function removeCachedIdea(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("ideas", id);
}

// Queue an action for later sync
export async function queueAction(
  type: "create" | "update" | "delete",
  data: CreateIdeaInput | Partial<Idea> | number
): Promise<void> {
  const db = await getDB();
  await db.add("pendingActions", {
    id: Date.now(),
    type,
    data,
    timestamp: new Date(),
  });
}

// Get all pending actions
export async function getPendingActions() {
  const db = await getDB();
  return db.getAll("pendingActions");
}

// Clear a specific pending action after sync
export async function clearPendingAction(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("pendingActions", id);
}

// Clear all pending actions
export async function clearAllPendingActions(): Promise<void> {
  const db = await getDB();
  await db.clear("pendingActions");
}
```

Let's understand the structure:

**Two stores:** We have `ideas` for cached data and `pendingActions` for operations that need to sync. Separating these is important—cached ideas are a mirror of server state, while pending actions are operations waiting to be applied.

**Transactions:** IndexedDB uses transactions for data integrity. When we cache multiple ideas, we use a single transaction—either all succeed or none do.

**The index on `createdAt`:** This lets us query ideas sorted by date without loading everything into memory.

## Detecting Online Status

Create `src/hooks/useOnlineStatus.ts`:

```typescript
import { useState, useEffect } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Dispatch event for sync trigger
        window.dispatchEvent(new CustomEvent("app-back-online"));
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}
```

The browser fires `online` and `offline` events when connectivity changes. We track both current status and whether we've been offline—this helps trigger syncs when reconnecting.

The custom `app-back-online` event is a communication mechanism. When we come back online, we dispatch this event, and other parts of the app can listen and respond (like syncing pending actions).

## Updating the Ideas Hook

Now we rewrite `useIdeas` to handle offline scenarios. Replace `src/hooks/useIdeas.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import type { Idea, CreateIdeaInput, UpdateIdeaInput } from "@/types/idea";
import * as ideasLib from "@/lib/ideas";
import * as offlineStorage from "@/lib/offline-storage";
import { useOnlineStatus } from "./useOnlineStatus";

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { isOnline } = useOnlineStatus();

  // Sync pending actions when back online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline) return;

    setSyncing(true);
    try {
      const pendingActions = await offlineStorage.getPendingActions();

      for (const action of pendingActions) {
        try {
          if (action.type === "create") {
            await ideasLib.createIdea(action.data as CreateIdeaInput);
          } else if (action.type === "update") {
            const updateData = action.data as Partial<Idea> & { id: number };
            await ideasLib.updateIdea(updateData.id, updateData);
          } else if (action.type === "delete") {
            await ideasLib.archiveIdea(action.data as number);
          }
          await offlineStorage.clearPendingAction(action.id);
        } catch (err) {
          console.error("Failed to sync action:", action, err);
          // Continue with other actions even if one fails
        }
      }

      // Refresh from server after sync
      const freshData = await ideasLib.getIdeas();
      setIdeas(freshData);
      await offlineStorage.cacheIdeas(freshData);
    } finally {
      setSyncing(false);
    }
  }, [isOnline]);

  // Listen for back-online event
  useEffect(() => {
    const handleBackOnline = () => {
      syncPendingActions();
    };

    window.addEventListener("app-back-online", handleBackOnline);
    return () => window.removeEventListener("app-back-online", handleBackOnline);
  }, [syncPendingActions]);

  // Fetch ideas from server or cache
  const fetchIdeas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (isOnline) {
        // Online: fetch from server and cache
        const data = await ideasLib.getIdeas();
        setIdeas(data);
        await offlineStorage.cacheIdeas(data);
      } else {
        // Offline: load from cache
        const cachedData = await offlineStorage.getCachedIdeas();
        setIdeas(cachedData);
      }
    } catch (err) {
      // On error, try to fall back to cache
      try {
        const cachedData = await offlineStorage.getCachedIdeas();
        setIdeas(cachedData);
        setError("Using cached data (offline)");
      } catch {
        setError(err instanceof Error ? err.message : "Failed to fetch ideas");
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  // Initial fetch
  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Create a new idea (with offline support)
  const addIdea = useCallback(
    async (input: CreateIdeaInput) => {
      try {
        if (isOnline) {
          // Online: create on server and cache
          const newIdea = await ideasLib.createIdea(input);
          setIdeas((prev) => [newIdea, ...prev]);
          await offlineStorage.cacheIdea(newIdea);
          return newIdea;
        } else {
          // Offline: create locally and queue for sync
          const tempIdea: Idea = {
            id: Date.now(), // Temporary negative ID
            title: input.title,
            content: input.content || null,
            tags: input.tags || [],
            urls: input.urls || [],
            archived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setIdeas((prev) => [tempIdea, ...prev]);
          await offlineStorage.cacheIdea(tempIdea);
          await offlineStorage.queueAction("create", input);
          return tempIdea;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create idea");
        throw err;
      }
    },
    [isOnline]
  );

  // Update an idea (with offline support)
  const editIdea = useCallback(
    async (id: number, input: UpdateIdeaInput) => {
      try {
        if (isOnline) {
          const updated = await ideasLib.updateIdea(id, input);
          if (updated) {
            setIdeas((prev) =>
              prev.map((idea) => (idea.id === id ? updated : idea))
            );
            await offlineStorage.cacheIdea(updated);
          }
          return updated;
        } else {
          // Optimistic update with queue
          const currentIdea = ideas.find((i) => i.id === id);
          if (currentIdea) {
            const newIdea = {
              ...currentIdea,
              ...input,
              updatedAt: new Date(),
            };
            setIdeas((prev) =>
              prev.map((idea) => (idea.id === id ? newIdea : idea))
            );
            await offlineStorage.cacheIdea(newIdea as Idea);
            await offlineStorage.queueAction("update", { id, ...input });
          }
          return currentIdea;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update idea");
        throw err;
      }
    },
    [isOnline, ideas]
  );

  // Archive an idea (with offline support)
  const removeIdea = useCallback(
    async (id: number) => {
      try {
        if (isOnline) {
          await ideasLib.archiveIdea(id);
        } else {
          await offlineStorage.queueAction("delete", id);
        }
        setIdeas((prev) => prev.filter((idea) => idea.id !== id));
        await offlineStorage.removeCachedIdea(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to archive idea");
        throw err;
      }
    },
    [isOnline]
  );

  return {
    ideas,
    loading,
    error,
    syncing,
    isOnline,
    addIdea,
    editIdea,
    removeIdea,
    refreshIdeas: fetchIdeas,
  };
}
```

This is substantially more complex than before. Let's trace through the key flows:

**Fetching ideas:**
- Online: fetch from Turso, update state, cache locally
- Offline: load from IndexedDB cache
- Error: try cache as fallback

**Creating ideas offline:**
1. Generate a temporary ID based on timestamp
2. Create a local Idea object
3. Add to React state immediately (user sees it)
4. Save to IndexedDB cache
5. Queue a "create" action for later sync

**Syncing when back online:**
1. Get all pending actions from IndexedDB
2. For each action, execute it against Turso
3. Clear the action from the queue on success
4. After all actions, fetch fresh data from server
5. Replace local cache with server data

The temporary ID for offline-created ideas is a potential issue. When the idea syncs to the server, it gets a real ID. Our current implementation handles this by fetching fresh data after sync, which replaces the temporary IDs with real ones.

## The Offline Indicator

Users should know when they're offline. Create `src/components/OfflineIndicator.tsx`:

```typescript
interface OfflineIndicatorProps {
  isOnline: boolean;
  syncing: boolean;
}

export function OfflineIndicator({ isOnline, syncing }: OfflineIndicatorProps) {
  if (isOnline && !syncing) return null;

  return (
    <div className={`offline-indicator ${syncing ? "syncing" : "offline"}`}>
      {syncing ? (
        <span>Syncing...</span>
      ) : (
        <span>You're offline. Changes will sync when connected.</span>
      )}
    </div>
  );
}
```

Add styles to `src/index.css`:

```css
/* Offline Indicator */
.offline-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 8px 16px;
  text-align: center;
  font-size: 0.875rem;
  z-index: 1001;
}

.offline-indicator.offline {
  background-color: #ff6b6b;
  color: white;
}

.offline-indicator.syncing {
  background-color: #ffd93d;
  color: #333;
}

/* Push content down when indicator is showing */
body:has(.offline-indicator) .app-container {
  padding-top: 50px;
}
```

## Updating the App Component

Update `src/App.tsx` to include the offline indicator:

```typescript
import { useIdeas } from "@/hooks/useIdeas";
import { IdeaForm } from "@/components/IdeaForm";
import { IdeaCard } from "@/components/IdeaCard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { IOSInstallInstructions } from "@/components/IOSInstallInstructions";
import { OfflineIndicator } from "@/components/OfflineIndicator";

function App() {
  const {
    ideas,
    loading,
    error,
    syncing,
    isOnline,
    addIdea,
    editIdea,
    removeIdea,
  } = useIdeas();

  return (
    <>
      <OfflineIndicator isOnline={isOnline} syncing={syncing} />

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
            {!isOnline && " (offline)"}
          </p>
        </footer>

        <InstallPrompt />
        <IOSInstallInstructions />
      </div>
    </>
  );
}

export default App;
```

## Workbox Runtime Caching

Update `vite.config.ts` to cache API responses:

```typescript
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["icon.svg"],
  manifest: {
    // ... manifest config
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    runtimeCaching: [
      {
        // Cache API calls to Turso
        urlPattern: /^https:\/\/.*\.turso\.io\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
        // Cache Google Fonts
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts-cache",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
    ],
  },
}),
```

**NetworkFirst for API calls** means: try the network, but fall back to cache if the network fails or times out. This gives us fresh data when possible, cached data when not.

**CacheFirst for fonts** means: use the cache if available, only hit the network if the cache is empty. Fonts don't change, so this is more efficient.

## An Offline Fallback Page

Create `public/offline.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Quiver - Offline</title>
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background-color: #f5f5f5;
        padding: 20px;
      }
      .container {
        text-align: center;
        max-width: 400px;
      }
      h1 {
        color: #0066cc;
        margin-bottom: 16px;
      }
      p {
        color: #666;
        margin-bottom: 24px;
      }
      button {
        background-color: #0066cc;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
      }
      button:hover {
        background-color: #0052a3;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Quiver</h1>
      <p>
        You're currently offline. Your cached ideas are still available in
        the app.
      </p>
      <button onclick="window.location.reload()">Try Again</button>
    </div>
  </body>
</html>
```

This page shows when the service worker can't serve the app shell—a last resort fallback.

## Testing Offline Functionality

Build and preview:

```bash
bun run build
bun run preview
```

Test the full offline flow:

1. **Load and cache**: Open the app, add a few ideas. These get cached in IndexedDB.

2. **Go offline**: In DevTools → Application → Service Workers, check "Offline". Or toggle airplane mode on your device.

3. **Verify cached data**: Refresh the page. Your ideas should still appear. You should see the red "You're offline" banner.

4. **Create offline**: Add a new idea while offline. It should appear immediately with the "(offline)" indicator in the footer.

5. **Go back online**: Uncheck "Offline". You should see "Syncing..." briefly, then the banner disappears.

6. **Verify sync**: Check DevTools → Application → IndexedDB → quiver-db → pendingActions. It should be empty (actions were synced). Check the `ideas` store—your offline-created idea should have a real server-assigned ID now.

## Edge Cases and Limitations

This implementation handles the common case well but has some edge cases:

**Conflict resolution:** If you edit an idea offline and someone else edits it on another device, whoever syncs last "wins." For a personal app, this is fine. For collaboration, you'd need more sophisticated conflict resolution.

**Temporary IDs:** Offline-created ideas get timestamp-based IDs. If you create two ideas in the same millisecond (unlikely but possible), you'd get a collision. Using negative IDs or UUIDs would be more robust.

**Storage limits:** IndexedDB has browser-dependent quotas. On Chrome, it's based on available disk space. For an idea capture app, you're unlikely to hit limits, but a production app should handle quota errors gracefully.

**Background sync:** We sync when the app is open and comes back online. The Background Sync API allows syncing even when the app is closed, but browser support is limited and implementation is more complex.

## What We've Built

The app now works fully offline:

- Ideas are cached locally and displayed without network access
- New ideas can be created offline
- Changes are queued and synced automatically
- Users see clear status indicators

This is true offline-first architecture. The network is an enhancement, not a requirement.

In Part 6, we'll add AI brainstorming. This requires network access, but we'll implement it gracefully—users can brainstorm when online, and results are cached for offline review.

---

*Commit your progress:*

```bash
git add .
git commit -m "Part 5: Offline support with IndexedDB and sync"
```

---

*Next in the series: [Part 6: AI Integration with Claude](/blog/06-ai-integration.md)*
