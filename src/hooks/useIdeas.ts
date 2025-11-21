import { useCallback, useEffect, useState } from "react";
import * as ideasLib from "@/lib/ideas";
import type { CreateIdeaInput, Idea, UpdateIdeaInput } from "@/types/idea";

export function useIdeas() {
	const [ideas, setIdeas] = useState<Idea[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch ideas from the database
	const fetchIdeas = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await ideasLib.getIdeas();
			setIdeas(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch ideas");
		} finally {
			setLoading(false);
		}
	}, []);

	// Initial fetch on mount
	useEffect(() => {
		fetchIdeas();
	}, [fetchIdeas]);

	// Add a new idea
	const addIdea = useCallback(async (input: CreateIdeaInput) => {
		try {
			const newIdea = await ideasLib.createIdea(input);
			// Optimistic update: add to local state immediately
			setIdeas((prev) => [newIdea, ...prev]);
			return newIdea;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create idea");
			throw err;
		}
	}, []);

	// Edit an existing idea
	const editIdea = useCallback(async (id: number, input: UpdateIdeaInput) => {
		try {
			const updated = await ideasLib.updateIdea(id, input);
			if (updated) {
				// Replace the old idea with the updated one
				setIdeas((prev) =>
					prev.map((idea) => (idea.id === id ? updated : idea)),
				);
			}
			return updated;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update idea");
			throw err;
		}
	}, []);

	// Archive an idea
	const removeIdea = useCallback(async (id: number) => {
		try {
			await ideasLib.archiveIdea(id);
			// Remove from local state
			setIdeas((prev) => prev.filter((idea) => idea.id !== id));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to archive idea");
			throw err;
		}
	}, []);

	return {
		ideas,
		loading,
		error,
		addIdea,
		editIdea,
		removeIdea,
		refreshIdeas: fetchIdeas,
	};
}
