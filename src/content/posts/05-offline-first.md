---
title: "Part 5: Offline-First Architecture"
seriesTitle: "Building Quiver: An Offline-First PWA in a Weekend"
series: "Quiver"
slug: "quiver/05-offline-first"
---

_This is Part 5 of a 10-part series on building Quiver. [Start with Part 1](/posts/quiver/01-the-weekend-project) if you missed it._

---

This is the core of our project. We have a PWA shell that loads offline, but it's useless without data.

Traditional web apps read from a server. Offline-first apps read from a **local database** and sync with the server in the background.

## The Strategy

1. **Reads are always local**: We display what's in the browser's IndexedDB. It's instant.
2. **Writes are local first**: When you save, we write to IndexedDB immediately.
3. **Sync Queue**: If offline, we add the operation to a "pending changes" queue.
4. **Background Sync**: When online, we process the queue and send changes to Turso.

## Setting up IndexedDB

We'll use `idb`, a tiny wrapper around the native IndexedDB API that makes it usable with Promises.

```bash
bun add idb
```

Create `src/lib/local-db.ts`. This file manages our local data stores.

```typescript
import { openDB, type IDBPDatabase } from "idb";
import type { Idea } from "./schema";

const DB_NAME = "quiver-local";
const DB_VERSION = 1;

// We have two stores: one for ideas, one for pending changes
export async function getDb() {
   return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
         if (!db.objectStoreNames.contains("ideas")) {
            const store = db.createObjectStore("ideas", { keyPath: "id" });
            store.createIndex("createdAt", "createdAt");
         }
         if (!db.objectStoreNames.contains("pending")) {
            db.createObjectStore("pending", {
               keyPath: "id",
               autoIncrement: true,
            });
         }
      },
   });
}

// ... helper functions for get/put/delete
```

(In a real implementation, you'd add helpers like `saveLocalIdea`, `getLocalIdeas`, etc. See the [source code](https://github.com/nbbaier/quiver) for the full implementation).

## The Sync Queue

This is the most critical part. When a user creates an idea offline, we can't give it a real database ID yet. So we use a temporary negative ID.

```typescript
// src/lib/sync.ts

export async function createIdeaOfflineFirst(data: NewIdea) {
   if (navigator.onLine) {
      // Online? Save to server, then cache locally.
      const remote = await api.createIdea(data);
      await localDb.saveLocalIdea(remote);
      return remote;
   }

   // Offline? Create a temp local version.
   const tempIdea = {
      ...data,
      id: -Date.now(), // Negative ID indicates "local only"
      createdAt: new Date(),
      updatedAt: new Date(),
   };

   await localDb.saveLocalIdea(tempIdea);
   await localDb.addPendingChange({ type: "create", data });
   return tempIdea;
}
```

## The Sync Engine

We need a function that runs when connection is restored. It iterates through the `pending` store and replays the actions against the server.

```typescript
export async function syncToRemote() {
   const pending = await localDb.getPendingChanges();

   for (const change of pending) {
      if (change.type === "create") {
         await api.createIdea(change.data);
      }
      // ... handle update/delete
      await localDb.removePendingChange(change.id);
   }

   // Refresh local cache with latest server state
   const fresh = await api.getAllIdeas();
   await localDb.saveLocalIdeas(fresh);
}
```

## Connecting to React

Now we update our `useIdeas` hook. Instead of calling the API directly, it calls our sync service.

```typescript
// src/hooks/useIdeas.ts

useEffect(() => {
   // Sync when coming back online
   const handleOnline = () => sync.syncToRemote().then(fetchIdeas);
   window.addEventListener("online", handleOnline);
   return () => window.removeEventListener("online", handleOnline);
}, []);
```

## The Result

With this architecture, the app feels incredibly fast. Saving an idea is a local disk write—milliseconds. You never see a loading spinner when creating data.

If you're on a plane, you can create 50 ideas. They'll sit in IndexedDB with negative IDs. The moment you reconnect, they flush to the server and get real IDs.

Now that we have a robust, offline-capable app, let's make it smart.
