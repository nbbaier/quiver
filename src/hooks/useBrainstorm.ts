import { useCallback, useState } from "react";

const API_URL = import.meta.env.DEV ? "http://localhost:3001" : ""; //

interface Idea {
	title: string;
	content: string;
}

/**
 * Hook for AI brainstorming with streaming support.
 *
 * Why a custom hook instead of useChat?
 * - useChat is designed for multi-turn conversations
 * - We want single-shot brainstorming with custom UI
 * - Easier to control the exact request format
 */
export function useBrainstorm() {
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<string>("");
	const [error, setError] = useState<Error | null>(null);

	/**
	 * Start a brainstorming session.
	 *
	 * @param idea - The idea to brainstorm
	 * @param context - Optional additional context from the user
	 */
	const brainstorm = useCallback(async (idea: Idea, context?: string) => {
		console.log("[Brainstorm] Starting brainstorm request", { idea, context });
		setIsLoading(true);
		setResult("");
		setError(null);

		try {
			const response = await fetch(`${API_URL}/api/brainstorm`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idea, context }),
			});

			console.log("[Brainstorm] Response received", {
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				contentType: response.headers.get("content-type"),
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}

			// Get the readable stream from the response
			const reader = response.body?.getReader();
			if (!reader) throw new Error("No response body");

			console.log(
				"[Brainstorm] Stream reader created, starting to read chunks",
			);

			const decoder = new TextDecoder();
			let fullText = "";
			let chunkCount = 0;

			// Read the stream chunk by chunk
			// toTextStreamResponse() sends plain text, not SSE format
			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					console.log("[Brainstorm] Stream done", {
						totalChunks: chunkCount,
						finalTextLength: fullText.length,
					});
					break;
				}

				chunkCount++;
				const chunk = decoder.decode(value, { stream: true });

				// toTextStreamResponse() sends plain text directly
				// Just append each chunk to the full text
				fullText += chunk;

				console.log(`[Brainstorm] Chunk ${chunkCount} received`, {
					chunkLength: chunk.length,
					chunkPreview: chunk.substring(0, 50),
					fullTextLength: fullText.length,
					fullTextPreview: fullText.substring(0, 200),
				});

				// Update UI with accumulated text
				setResult(fullText);
			}

			console.log("[Brainstorm] Stream processing complete", {
				finalText: fullText,
				finalTextLength: fullText.length,
			});
		} catch (err) {
			console.error("[Brainstorm] Error occurred", {
				error: err,
				message: err instanceof Error ? err.message : String(err),
			});
			setError(err instanceof Error ? err : new Error("Brainstorm failed"));
		} finally {
			console.log("[Brainstorm] Setting isLoading to false");
			setIsLoading(false);
		}
	}, []);

	/**
	 * Clear the current result.
	 */
	const reset = useCallback(() => {
		setResult("");
		setError(null);
	}, []);

	return { brainstorm, isLoading, result, error, reset };
}
