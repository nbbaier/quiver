## Milestone 5: Offline-First Data Layer

**Goal:** Enable creating and viewing ideas while offline, with automatic sync when connectivity returns.

**Why this matters:** This is the heart of "offline-first." Currently, our app requires network connectivity for every operation. When offline:

-  Fetching ideas fails
-  Creating ideas fails
-  The app is essentially broken

We need to flip this: **local storage is the source of truth, and the network is for sync**.

### The Offline-First Architecture

Here's how offline-first works:

1. **All data lives locally first** — We store ideas in IndexedDB (browser database)
2. **Reads are always local** — Display data from IndexedDB, not the network
3. **Writes go local, then sync** — Save to IndexedDB immediately, queue network sync
4. **Sync happens opportunistically** — When online, sync pending changes to Turso

This means the app is **always fast** (reads from local) and **always available** (writes work offline).

### Step 5.1: Install IndexedDB Library

```bash
bun add idb
```

**Why IndexedDB?** It's the only browser API that can store significant amounts of structured data. LocalStorage is limited to ~5MB of strings. IndexedDB can store megabytes of structured data with indexes for fast queries.

**Why the `idb` library?** The native IndexedDB API is callback-based and awkward to use. `idb` wraps it with a clean Promise-based API.

### Step 5.2: Create the Local Database

Create `src/lib/local-db.ts`:

```typescript
import { openDB, type IDBPDatabase } from "idb";
import type { Idea, NewIdea } from "./schema";

/**
 * Local database using IndexedDB.
 *
 * IndexedDB is a browser-native database that:
 * - Persists data across sessions
 * - Can store megabytes of structured data
 * - Supports indexes for fast queries
 * - Works completely offline
 *
 * We use it to:
 * 1. Cache ideas locally for offline reading
 * 2. Store pending changes for offline writing
 */

const DB_NAME = "quiver-local";
const DB_VERSION = 1;
const IDEAS_STORE = "ideas";
const PENDING_STORE = "pending-changes";

/**
 * Represents a change that needs to be synced to the server.
 * We queue these when offline and process them when back online.
 */
interface PendingChange {
   id: string;
   type: "create" | "update" | "delete";
   ideaId?: number; // For update/delete operations
   data?: NewIdea | Partial<NewIdea>; // For create/update operations
   timestamp: number; // When the change was made (for ordering)
}

// Singleton promise to avoid opening multiple connections
let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Get or create the database connection.
 *
 * Why a singleton? Opening IndexedDB is expensive. We want to open it
 * once and reuse the connection for all operations.
 */
function getDb() {
   if (!dbPromise) {
      dbPromise = openDB(DB_NAME, DB_VERSION, {
         upgrade(db) {
            // This runs when the database is created or version increases.
            // It's where we define our object stores (like tables).

            // Store for cached ideas
            if (!db.objectStoreNames.contains(IDEAS_STORE)) {
               const store = db.createObjectStore(IDEAS_STORE, {
                  keyPath: "id",
               });
               // Index for sorting by creation date
               store.createIndex("createdAt", "createdAt");
            }

            // Store for pending changes (offline queue)
            if (!db.objectStoreNames.contains(PENDING_STORE)) {
               db.createObjectStore(PENDING_STORE, { keyPath: "id" });
            }
         },
      });
   }
   return dbPromise;
}

// ============================================================
// Ideas Cache Operations
// ============================================================

/**
 * Get all ideas from local cache.
 */
export async function getLocalIdeas(): Promise<Idea[]> {
   const db = await getDb();
   const ideas = await db.getAll(IDEAS_STORE);
   // Sort by createdAt descending (newest first)
   return ideas.sort(
      (a, b) =>
         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
   );
}

/**
 * Save a single idea to local cache.
 */
export async function saveLocalIdea(idea: Idea): Promise<void> {
   const db = await getDb();
   await db.put(IDEAS_STORE, idea);
}

/**
 * Save multiple ideas to local cache.
 * Uses a transaction for efficiency.
 */
export async function saveLocalIdeas(ideas: Idea[]): Promise<void> {
   const db = await getDb();
   const tx = db.transaction(IDEAS_STORE, "readwrite");
   await Promise.all([
      ...ideas.map((idea) => tx.store.put(idea)),
      tx.done, // Wait for transaction to complete
   ]);
}

/**
 * Delete an idea from local cache.
 */
export async function deleteLocalIdea(id: number): Promise<void> {
   const db = await getDb();
   await db.delete(IDEAS_STORE, id);
}

/**
 * Clear all ideas from local cache.
 * Used when refreshing from server.
 */
export async function clearLocalIdeas(): Promise<void> {
   const db = await getDb();
   await db.clear(IDEAS_STORE);
}

// ============================================================
// Pending Changes Queue Operations
// ============================================================

/**
 * Add a change to the pending queue.
 * These will be synced when we're back online.
 */
export async function addPendingChange(
   change: Omit<PendingChange, "id" | "timestamp">
): Promise<void> {
   const db = await getDb();
   const pendingChange: PendingChange = {
      ...change,
      id: crypto.randomUUID(), // Unique ID for this change
      timestamp: Date.now(), // When it was queued
   };
   await db.put(PENDING_STORE, pendingChange);
}

/**
 * Get all pending changes, ordered by timestamp.
 */
export async function getPendingChanges(): Promise<PendingChange[]> {
   const db = await getDb();
   const changes = await db.getAll(PENDING_STORE);
   // Process in order they were made
   return changes.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Remove a change from the pending queue.
 * Called after successfully syncing to server.
 */
export async function removePendingChange(id: string): Promise<void> {
   const db = await getDb();
   await db.delete(PENDING_STORE, id);
}

/**
 * Clear all pending changes.
 * Use with caution - only after confirming all are synced.
 */
export async function clearPendingChanges(): Promise<void> {
   const db = await getDb();
   await db.clear(PENDING_STORE);
}
```

**Understanding IndexedDB concepts:**

-  **Object Store** — Like a table in SQL. We have two: `ideas` (cache) and `pending-changes` (sync queue)
-  **Key Path** — The property used as the primary key (`id` for both stores)
-  **Index** — Allows fast queries on non-key properties (`createdAt`)
-  **Transaction** — Groups operations together (all succeed or all fail)

### Step 5.3: Create the Sync Service

Create `src/lib/sync.ts`:

```typescript
import * as localDb from "./local-db";
import * as remoteDb from "./ideas";
import type { Idea, NewIdea } from "./schema";

/**
 * Sync service that coordinates between local and remote databases.
 *
 * The sync strategy is:
 * 1. Local-first: All operations happen locally first
 * 2. Opportunistic sync: Sync to server when online
 * 3. Conflict resolution: Server wins (for simplicity)
 */

// Prevent concurrent sync operations
let isSyncing = false;

/**
 * Sync all pending changes to the remote server.
 *
 * This processes the pending queue in order, removing each change
 * after it's successfully synced.
 *
 * Returns statistics about what was synced.
 */
export async function syncToRemote(): Promise<{
   success: boolean;
   synced: number;
}> {
   // Don't sync if already syncing or offline
   if (isSyncing || !navigator.onLine) {
      return { success: false, synced: 0 };
   }

   isSyncing = true;
   let synced = 0;

   try {
      const pendingChanges = await localDb.getPendingChanges();

      for (const change of pendingChanges) {
         try {
            // Process each change type
            switch (change.type) {
               case "create":
                  if (change.data) {
                     await remoteDb.createIdea(change.data as NewIdea);
                  }
                  break;
               case "update":
                  if (change.ideaId && change.data) {
                     await remoteDb.updateIdea(change.ideaId, change.data);
                  }
                  break;
               case "delete":
                  if (change.ideaId) {
                     await remoteDb.deleteIdea(change.ideaId);
                  }
                  break;
            }

            // Remove from queue after successful sync
            await localDb.removePendingChange(change.id);
            synced++;
         } catch (error) {
            // Log but continue with other changes
            console.error("Failed to sync change:", change, error);
            // Keep the change in the queue for retry
         }
      }

      // After syncing, refresh local cache from server
      // This ensures we have the latest data including server-generated IDs
      if (synced > 0 || pendingChanges.length === 0) {
         const remoteIdeas = await remoteDb.getAllIdeas();
         await localDb.clearLocalIdeas();
         await localDb.saveLocalIdeas(remoteIdeas);
      }

      return { success: true, synced };
   } finally {
      isSyncing = false;
   }
}

/**
 * Fetch ideas, using local cache when offline.
 *
 * Strategy:
 * - If online: Fetch from server, update local cache
 * - If offline: Return local cache
 * - If online but fetch fails: Fall back to local cache
 */
export async function fetchAndCacheIdeas(): Promise<Idea[]> {
   if (navigator.onLine) {
      try {
         // Fetch from server
         const remoteIdeas = await remoteDb.getAllIdeas();
         // Update local cache
         await localDb.saveLocalIdeas(remoteIdeas);
         return remoteIdeas;
      } catch (error) {
         // Network error - fall back to cache
         console.error(
            "Failed to fetch from remote, using local cache:",
            error
         );
         return localDb.getLocalIdeas();
      }
   }

   // Offline - use local cache
   return localDb.getLocalIdeas();
}

/**
 * Create an idea with offline support.
 *
 * Strategy:
 * - If online: Create on server, cache locally
 * - If offline: Create locally with temp ID, queue for sync
 */
export async function createIdeaOfflineFirst(data: NewIdea): Promise<Idea> {
   if (navigator.onLine) {
      // Online: Create on server and cache
      const remoteIdea = await remoteDb.createIdea(data);
      await localDb.saveLocalIdea(remoteIdea);
      return remoteIdea;
   }

   // Offline: Create local idea with temporary negative ID
   // Negative IDs indicate "not yet synced"
   const tempIdea: Idea = {
      id: -Date.now(), // Negative timestamp as temp ID
      ...data,
      urls: data.urls || [],
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      archived: false,
   };

   // Save locally
   await localDb.saveLocalIdea(tempIdea);

   // Queue for sync
   await localDb.addPendingChange({ type: "create", data });

   return tempIdea;
}

/**
 * Delete an idea with offline support.
 */
export async function deleteIdeaOfflineFirst(id: number): Promise<void> {
   // Always delete locally first
   await localDb.deleteLocalIdea(id);

   // Only sync deletion for real (positive) IDs
   // Negative IDs are local-only and don't exist on server
   if (id > 0) {
      if (navigator.onLine) {
         await remoteDb.deleteIdea(id);
      } else {
         await localDb.addPendingChange({ type: "delete", ideaId: id });
      }
   }
}

/**
 * Archive an idea with offline support.
 */
export async function archiveIdeaOfflineFirst(
   id: number
): Promise<Idea | undefined> {
   // Get the idea from local cache
   const ideas = await localDb.getLocalIdeas();
   const idea = ideas.find((i) => i.id === id);

   if (!idea) return undefined;

   // Update locally
   const updated = { ...idea, archived: true, updatedAt: new Date() };
   await localDb.saveLocalIdea(updated);

   // Sync if online, queue if offline
   if (id > 0) {
      if (navigator.onLine) {
         return remoteDb.archiveIdea(id);
      } else {
         await localDb.addPendingChange({
            type: "update",
            ideaId: id,
            data: { archived: true },
         });
      }
   }

   return updated;
}
```

**Key design decisions:**

1. **Negative IDs for offline-created items** — This is a simple way to distinguish "not yet synced" items. When synced, they get real server IDs.

2. **Server wins conflict resolution** — After syncing, we replace the local cache with server data. This is simple but means offline changes might be lost if there are conflicts. For a single-user app, this is usually fine.

3. **Queue-based sync** — Changes are queued and processed in order. This maintains consistency (e.g., create before update).

### Step 5.4: Update the useIdeas Hook

Replace `src/hooks/useIdeas.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import type { Idea } from "../lib/schema";
import * as sync from "../lib/sync";

/**
 * Custom hook for managing ideas with offline-first support.
 *
 * Key changes from the online-only version:
 * - Uses sync service instead of direct API calls
 * - Tracks syncing state
 * - Auto-syncs when coming back online
 */
export function useIdeas() {
   const [ideas, setIdeas] = useState<Idea[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<Error | null>(null);
   const [syncing, setSyncing] = useState(false);

   /**
    * Fetch ideas from local cache (and server if online).
    */
   const fetchIdeas = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);
         const data = await sync.fetchAndCacheIdeas();
         setIdeas(data);
      } catch (err) {
         setError(
            err instanceof Error ? err : new Error("Failed to fetch ideas")
         );
      } finally {
         setLoading(false);
      }
   }, []);

   /**
    * Sync pending changes to server.
    */
   const syncChanges = useCallback(async () => {
      if (syncing) return;

      setSyncing(true);
      try {
         const result = await sync.syncToRemote();
         if (result.success && result.synced > 0) {
            // Refresh after successful sync to get server IDs
            await fetchIdeas();
         }
      } finally {
         setSyncing(false);
      }
   }, [syncing, fetchIdeas]);

   // Fetch ideas on mount
   useEffect(() => {
      fetchIdeas();
   }, [fetchIdeas]);

   // Auto-sync when coming back online
   useEffect(() => {
      const handleOnline = () => {
         console.log("Back online, syncing...");
         syncChanges();
      };

      window.addEventListener("online", handleOnline);
      return () => window.removeEventListener("online", handleOnline);
   }, [syncChanges]);

   /**
    * Create a new idea (works offline).
    */
   const createIdea = async (
      title: string,
      content: string,
      tags: string[] = []
   ) => {
      const newIdea = await sync.createIdeaOfflineFirst({
         title,
         content,
         tags,
      });
      // Add to state immediately (optimistic update)
      setIdeas((prev) => [newIdea, ...prev]);
      return newIdea;
   };

   /**
    * Delete an idea (works offline).
    */
   const deleteIdea = async (id: number) => {
      await sync.deleteIdeaOfflineFirst(id);
      // Remove from state immediately
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
   };

   /**
    * Archive an idea (works offline).
    */
   const archiveIdea = async (id: number) => {
      const updated = await sync.archiveIdeaOfflineFirst(id);
      if (updated) {
         // Update in state immediately
         setIdeas((prev) =>
            prev.map((idea) => (idea.id === id ? updated : idea))
         );
      }
      return updated;
   };

   return {
      ideas,
      loading,
      error,
      syncing,
      createIdea,
      deleteIdea,
      archiveIdea,
      refetch: fetchIdeas,
      sync: syncChanges,
   };
}
```

**New features:**

-  `syncing` state — Shows when background sync is happening
-  `syncChanges()` function — Manually trigger sync
-  `online` event listener — Auto-sync when connectivity returns

### Step 5.5: Add Sync Status to the UI

Update `src/App.tsx` to show sync status:

```tsx
import { useIdeas } from "./hooks/useIdeas";
import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";
import { OfflineIndicator } from "./components/OfflineIndicator";

function App() {
   const {
      ideas,
      loading,
      error,
      syncing,
      createIdea,
      deleteIdea,
      archiveIdea,
   } = useIdeas();

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
               {syncing && (
                  <p className="mt-1 text-sm text-primary animate-pulse">
                     Syncing...
                  </p>
               )}
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

         <OfflineIndicator />
      </div>
   );
}

export default App;
```

### Step 5.6: Test Offline Functionality

```bash
bun run build
bun run preview
```

**Checkpoint — Test the full offline flow:**

1. **Initial load (online):**

   -  Open the app
   -  Create 2-3 ideas
   -  ✓ They should save and appear in the list

2. **Go offline:**

   -  DevTools → Network → check "Offline"
   -  ✓ Yellow "You're offline" banner should appear

3. **Create while offline:**

   -  Create a new idea
   -  ✓ It should appear in the list immediately
   -  ✓ Notice it has a negative ID (check React DevTools or console)

4. **Delete while offline:**

   -  Delete one of your original ideas
   -  ✓ It should disappear from the list

5. **Come back online:**

   -  Uncheck "Offline"
   -  ✓ The offline banner should disappear
   -  ✓ "Syncing..." should appear briefly
   -  ✓ Refresh the page — the offline-created idea should now have a positive ID

6. **Verify persistence:**
   -  Close the browser completely
   -  Reopen and navigate to the app
   -  ✓ All your ideas should still be there

**Milestone 5 Complete!** Your app is now truly offline-first:

-  Ideas are cached locally in IndexedDB
-  Creating, deleting, and archiving work offline
-  Changes sync automatically when back online
-  The UI shows sync status and offline state

This is a major milestone—your app now works regardless of connectivity.

---
