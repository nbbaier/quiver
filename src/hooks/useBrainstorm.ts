import { useCallback, useRef, useState } from "react";

// In development, use the local Hono server
// In production, use Vercel's API routes (relative URL)
const API_URL = import.meta.env.DEV ? "http://localhost:3001" : "";

interface Idea {
	id: number;
	title: string;
	content: string;
}

/**
 * Hook for AI brainstorming with Inngest (polling).
 *
 * Flow:
 * 1. Send brainstorm request
 * 2. Server returns immediately (event sent to Inngest)
 * 3. Poll for results until complete
 *
 * Why polling instead of WebSockets?
 * - Simpler to implement
 * - Works with serverless (no persistent connections)
 * - Polling interval of 1s is fine for 5-10 second operations
 */
export function useBrainstorm() {
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<string>("");
	const [error, setError] = useState<Error | null>(null);

	const pollIntervalRef = useRef<number | null>(null);

	/**
	 * Stop polling.
	 */
	const stopPolling = useCallback(() => {
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current);
			pollIntervalRef.current = null;
		}
	}, []);

	/**
	 * Poll for brainstorm results.
	 */
	const pollForResults = useCallback(
		async (ideaId: number) => {
			const poll = async () => {
				try {
					const response = await fetch(`${API_URL}/api/brainstorm/${ideaId}`);
					const data = await response.json();

					if (data.status === "completed") {
						setResult(data.result);
						setIsLoading(false);
						stopPolling();
					} else if (data.status === "failed") {
						setError(new Error(data.error || "Brainstorm failed"));
						setIsLoading(false);
						stopPolling();
					}
					// If status is "pending", keep polling
				} catch (err) {
					setError(err instanceof Error ? err : new Error("Polling failed"));
					setIsLoading(false);
					stopPolling();
				}
			};

			// Poll every second
			pollIntervalRef.current = window.setInterval(poll, 1000);
			// Also poll immediately
			poll();
		},
		[stopPolling],
	);

	/**
	 * Start a brainstorming session.
	 */
	const brainstorm = useCallback(
		async (idea: Idea, context?: string) => {
			setIsLoading(true);
			setResult("");
			setError(null);
			stopPolling();

			try {
				const response = await fetch(`${API_URL}/api/brainstorm`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						ideaId: idea.id,
						idea: { title: idea.title, content: idea.content },
						context,
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to start brainstorm");
				}

				// Start polling for results
				pollForResults(idea.id);
			} catch (err) {
				setError(
					err instanceof Error ? err : new Error("Failed to brainstorm"),
				);
				setIsLoading(false);
			}
		},
		[pollForResults, stopPolling],
	);

	/**
	 * Cancel the current brainstorm.
	 */
	const cancel = useCallback(() => {
		stopPolling();
		setIsLoading(false);
	}, [stopPolling]);

	return {
		brainstorm,
		cancel,
		isLoading,
		result,
		error,
	};
}
