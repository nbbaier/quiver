import * as remoteDb from "./ideas";
import * as localDb from "./local-db";
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
			console.error("Failed to fetch from remote, using local cache:", error);
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
		const remoteIdea = await remoteDb.createIdea(data);
		await localDb.saveLocalIdea(remoteIdea);
		return remoteIdea;
	}

	// Offline: Create local idea with temporary negative ID
	// Negative IDs indicate "not yet synced"
	const tempIdea: Idea = {
		id: -Date.now(),
		...data,
		urls: data.urls || [],
		tags: data.tags || [],
		createdAt: new Date(),
		updatedAt: new Date(),
		archived: false,
	};

	await localDb.saveLocalIdea(tempIdea);
	await localDb.addPendingChange({ type: "create", data });

	return tempIdea;
}

/**
 * Delete an idea with offline support.
 */
export async function deleteIdeaOfflineFirst(id: number): Promise<void> {
	await localDb.deleteLocalIdea(id);

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
	id: number,
): Promise<Idea | undefined> {
	const ideas = await localDb.getLocalIdeas();
	const idea = ideas.find((i) => i.id === id);

	if (!idea) return undefined;

	const updated = { ...idea, archived: true, updatedAt: new Date() };
	await localDb.saveLocalIdea(updated);

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
