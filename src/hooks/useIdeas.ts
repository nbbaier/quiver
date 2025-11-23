import { useCallback, useEffect, useMemo, useState } from "react";
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

	// Filter state
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [showArchived, setShowArchived] = useState(false);

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
	 * Extract all unique tags from all ideas.
	 * useMemo ensures this is only recalculated when ideas change.
	 */
	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		ideas.forEach((idea) => {
			idea.tags?.forEach((tag) => tagSet.add(tag));
		});
		return Array.from(tagSet).sort();
	}, [ideas]);

	/**
	 * Filter ideas based on selected tags and archived state.
	 *
	 * Logic:
	 * - If no tags selected, show all ideas
	 * - If tags selected, show ideas that have ANY selected tag (OR logic)
	 * - Archived filter applies on top
	 */
	const filteredIdeas = useMemo(() => {
		return ideas.filter((idea) => {
			// Filter by archived state
			if (!showArchived && idea.archived) return false;

			// Filter by tags (OR logic)
			if (selectedTags.length > 0) {
				const ideaTags = idea.tags || [];
				const hasSelectedTag = selectedTags.some((tag) =>
					ideaTags.includes(tag),
				);
				if (!hasSelectedTag) return false;
			}

			return true;
		});
	}, [ideas, selectedTags, showArchived]);

	/**
	 * Toggle a tag in the filter.
	 */
	const toggleTag = (tag: string) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
		);
	};

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
		// Use filtered ideas for display
		ideas: filteredIdeas,
		// Also expose all ideas for other purposes
		allIdeas: ideas,
		loading,
		error,
		syncing,

		// Tag filter
		allTags,
		selectedTags,
		toggleTag,

		// Archived filter
		showArchived,
		toggleArchived: () => setShowArchived((prev) => !prev),

		// Actions
		createIdea,
		deleteIdea,
		archiveIdea,
		refetch: fetchIdeas,
		sync: syncChanges,
	};
}
