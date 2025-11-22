import { useCallback, useEffect, useState } from "react";
import * as ideaApi from "../lib/ideas";
import type { Idea } from "../lib/schema";

export function useIdeas() {
	const [ideas, setIdeas] = useState<Idea[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Fetch all ideas
	const fetchIdeas = useCallback(async () => {
		try {
			setLoading(true);
			const data = await ideaApi.getAllIdeas();
			setIdeas(data);
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Failed to fetch"));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchIdeas();
	}, [fetchIdeas]);

	// Create an idea (Optimistic UI update could go here, but we'll wait for server for now)
	const createIdea = async (
		title: string,
		content: string,
		tags: string[] = [],
	): Promise<Idea> => {
		const newIdea = await ideaApi.createIdea({ title, content, tags });
		setIdeas((prev) => [newIdea, ...prev]);
		return newIdea;
	};

	// Delete an idea
	const deleteIdea = async (id: number) => {
		await ideaApi.deleteIdea(id);
		setIdeas((prev) => prev.filter((idea) => idea.id !== id));
	};

	return { ideas, loading, error, createIdea, deleteIdea };
}
