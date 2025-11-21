import { useState } from "react";
import { brainstormIdeas, expandIdea } from "@/lib/ai";
import type { Idea } from "@/types/idea";

interface BrainstormPanelProps {
	ideas: Idea[];
	selectedIdea?: Idea | null;
}

export function BrainstormPanel({ ideas, selectedIdea }: BrainstormPanelProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<string>("");
	const [error, setError] = useState<string | null>(null);

	const handleBrainstorm = async () => {
		if (ideas.length === 0) {
			setError("Add some ideas first to get AI suggestions!");
			return;
		}

		setIsLoading(true);
		setError(null);
		setResult("");

		try {
			await brainstormIdeas(ideas, (text) => {
				setResult(text);
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate ideas");
		} finally {
			setIsLoading(false);
		}
	};

	const handleExpandIdea = async () => {
		if (!selectedIdea) {
			setError("Select an idea to expand!");
			return;
		}

		setIsLoading(true);
		setError(null);
		setResult("");

		try {
			await expandIdea(selectedIdea, (text) => {
				setResult(text);
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to expand idea");
		} finally {
			setIsLoading(false);
		}
	};

	const handleClear = () => {
		setResult("");
		setError(null);
	};

	return (
		<div className="brainstorm-panel">
			<div className="brainstorm-header">
				<h2>AI Brainstorm</h2>
				<div className="brainstorm-actions">
					<button
						type="button"
						onClick={handleBrainstorm}
						disabled={isLoading || ideas.length === 0}
						className="btn-brainstorm"
					>
						{isLoading ? "Thinking..." : "Generate Ideas"}
					</button>
					{selectedIdea && (
						<button
							type="button"
							onClick={handleExpandIdea}
							disabled={isLoading}
							className="btn-expand"
						>
							Expand Selected
						</button>
					)}
					{result && (
						<button type="button" onClick={handleClear} className="btn-clear">
							Clear
						</button>
					)}
				</div>
			</div>

			{error && <div className="brainstorm-error">{error}</div>}

			{result ? (
				<div className="brainstorm-result">
					<pre>{result}</pre>
				</div>
			) : (
				<div className="brainstorm-empty">
					{ideas.length === 0 ? (
						<p>
							Add some ideas first, then click "Generate Ideas" to get
							AI-powered suggestions!
						</p>
					) : (
						<p>
							Click "Generate Ideas" to get AI-powered brainstorming based on
							your {ideas.length} idea
							{ideas.length !== 1 ? "s" : ""}.
						</p>
					)}
				</div>
			)}

			{isLoading && (
				<div className="brainstorm-loading">
					<div className="loading-dots">
						<span></span>
						<span></span>
						<span></span>
					</div>
				</div>
			)}
		</div>
	);
}
