import { type IDBPDatabase, openDB } from "idb";
import type { Idea, NewIdea } from "./schema";

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

function getDb() {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			upgrade(db) {
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
``;
/**
 * Get all ideas from local cache.
 */
export async function getLocalIdeas(): Promise<Idea[]> {
	const db = await getDb();
	const ideas = await db.getAll(IDEAS_STORE);
	// Sort by createdAt descending (newest first)
	return ideas.sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
	change: Omit<PendingChange, "id" | "timestamp">,
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
