import { useCallback, useEffect, useState } from "react";
import type { Idea } from "../lib/schema";
import * as sync from "../lib/sync";

/**
 * Custom hook for managing ideas with offline-first support.
 * Handles fetching, creating, deleting, and archiving ideas.
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
			setError(err instanceof Error ? err : new Error("Failed to fetch ideas"));
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
		tags: string[] = [],
	) => {
		const newIdea = await sync.createIdeaOfflineFirst({
			title,
			content,
			tags,
		});

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
			setIdeas((prev) => prev.map((idea) => (idea.id === id ? updated : idea)));
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
