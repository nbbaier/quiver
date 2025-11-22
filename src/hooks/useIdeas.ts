import { useCallback, useEffect, useState } from "react";
import * as ideaApi from "../lib/ideas";
import type { Idea } from "../lib/schema";

/**
 * Custom hook for managing ideas state.
 *
 * Why a custom hook?
 * - Encapsulates all idea-related state and logic
 * - Can be reused across components
 * - Separates data logic from UI logic
 * - Makes testing easier (you can test the hook independently)
 */
export function useIdeas() {
	// State for the list of ideas
	const [ideas, setIdeas] = useState<Idea[]>([]);

	// Loading state for showing skeletons/spinners
	const [loading, setLoading] = useState(true);

	// Error state for displaying error messages
	const [error, setError] = useState<Error | null>(null);

	/**
	 * Fetch all ideas from the database.
	 * useCallback ensures this function's identity is stable,
	 * which prevents unnecessary re-renders.
	 */
	const fetchIdeas = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await ideaApi.getAllIdeas();
			setIdeas(data);
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Failed to fetch ideas"));
		} finally {
			setLoading(false);
		}
	}, []);

	// Fetch ideas on mount
	useEffect(() => {
		fetchIdeas();
	}, [fetchIdeas]);

	/**
	 * Create a new idea and add it to state.
	 * We optimistically add to state after the API call succeeds.
	 */
	const createIdea = async (
		title: string,
		content: string,
		tags: string[] = [],
	) => {
		const newIdea = await ideaApi.createIdea({ title, content, tags });
		// Add to beginning of array (newest first)
		setIdeas((prev) => [newIdea, ...prev]);
		return newIdea;
	};

	/**
	 * Delete an idea and remove from state.
	 */
	const deleteIdea = async (id: number) => {
		await ideaApi.deleteIdea(id);
		setIdeas((prev) => prev.filter((idea) => idea.id !== id));
	};

	/**
	 * Archive an idea and update state.
	 */
	const archiveIdea = async (id: number) => {
		const updated = await ideaApi.archiveIdea(id);
		if (updated) {
			setIdeas((prev) => prev.map((idea) => (idea.id === id ? updated : idea)));
		}
		return updated;
	};

	return {
		ideas,
		loading,
		error,
		createIdea,
		deleteIdea,
		archiveIdea,
		refetch: fetchIdeas,
	};
}
