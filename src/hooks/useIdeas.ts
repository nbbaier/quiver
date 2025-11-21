import { useCallback, useEffect, useState } from "react";
import * as ideasLib from "@/lib/ideas";
import * as offlineStorage from "@/lib/offline-storage";
import type { CreateIdeaInput, Idea, UpdateIdeaInput } from "@/types/idea";
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
						const updateData = action.data as Partial<Idea> & {
							id: number;
						};
						const { id, ...payload } = updateData;
						const sanitizedPayload: UpdateIdeaInput = {
							...payload,
							content: payload.content === null ? undefined : payload.content,
						};
						await ideasLib.updateIdea(id, sanitizedPayload);
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
		return () =>
			window.removeEventListener("app-back-online", handleBackOnline);
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
		[isOnline],
	);

	// Update an idea (with offline support)
	const editIdea = useCallback(
		async (id: number, input: UpdateIdeaInput) => {
			try {
				if (isOnline) {
					const updated = await ideasLib.updateIdea(id, input);
					if (updated) {
						setIdeas((prev) =>
							prev.map((idea) => (idea.id === id ? updated : idea)),
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
							prev.map((idea) => (idea.id === id ? newIdea : idea)),
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
		[isOnline, ideas],
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
		[isOnline],
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
