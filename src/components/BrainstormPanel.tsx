import { useState } from "react";
import { useBrainstorm } from "../hooks/useBrainstorm";
import type { Idea } from "../lib/schema";

interface BrainstormPanelProps {
	idea: Idea;
	onClose: () => void;
}

/**
 * Expandable panel for AI brainstorming on a specific idea.
 *
 * Design decisions:
 * - Appears inline below the idea card (not a modal)
 * - Optional context field for directing the brainstorm
 * - Shows streaming results in real-time
 * - Can regenerate with different context
 */
export function BrainstormPanel({ idea, onClose }: BrainstormPanelProps) {
	const [additionalContext, setAdditionalContext] = useState("");
	const { brainstorm, isLoading, result, error, reset } = useBrainstorm();

	const handleBrainstorm = () => {
		console.log("handleBrainstorm", idea, additionalContext);
		brainstorm(idea, additionalContext || undefined);
	};

	return (
		<div
			className="bg-bg-card border-2 border-primary rounded-lg overflow-hidden
                    -mt-2 mb-4 shadow-lg"
		>
			{/* Header */}
			<header className="bg-primary text-primary-foreground px-4 py-3 flex justify-between items-center">
				<h3 className="font-semibold">Brainstorm: {idea.title}</h3>
				<button
					onClick={onClose}
					className="text-primary-foreground/80 hover:text-primary-foreground text-xl leading-none"
					aria-label="Close brainstorm panel"
				>
					×
				</button>
			</header>

			{/* Content */}
			<div className="p-4 space-y-4">
				{/* Context input */}
				<div>
					<label
						htmlFor="context"
						className="block text-sm font-medium text-text-main mb-1"
					>
						Focus your brainstorm (optional)
					</label>
					<textarea
						id="context"
						value={additionalContext}
						onChange={(e) => setAdditionalContext(e.target.value)}
						placeholder="e.g., 'Focus on technical implementation' or 'Explore business model options'"
						rows={2}
						className="w-full px-3 py-2 border border-border-default bg-bg-card text-text-main rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       resize-none placeholder:text-text-muted/50"
					/>
				</div>

				{/* Actions */}
				<div className="flex gap-2">
					<button
						onClick={handleBrainstorm}
						disabled={isLoading}
						className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg
                       hover:bg-primary-hover disabled:opacity-50
                       transition-colors"
					>
						{isLoading
							? "Thinking..."
							: result
								? "Brainstorm Again"
								: "Start Brainstorm"}
					</button>
					{result && (
						<button
							onClick={reset}
							className="px-4 py-2 bg-bg-elevated text-text-main border border-border-default font-medium rounded-lg
                         hover:bg-border-default transition-colors"
						>
							Clear
						</button>
					)}
				</div>

				{/* Error state */}
				{error && (
					<div className="p-3 bg-danger/10 text-danger rounded-lg text-sm">
						Error: {error.message}
					</div>
				)}

				{/* Results */}
				{result && (
					<div className="border-t border-border-default pt-4">
						<h4 className="text-sm font-semibold text-text-muted mb-3">
							Ideas & Directions
						</h4>
						<div className="prose prose-sm max-w-none text-text-main whitespace-pre-wrap">
							{result}
						</div>
					</div>
				)}

				{/* Loading indicator for empty state */}
				{isLoading && !result && (
					<div className="flex items-center gap-2 text-text-muted">
						<div
							className="w-4 h-4 border-2 border-primary border-t-transparent
                            rounded-full animate-spin"
						/>
						<span>Claude is thinking...</span>
					</div>
				)}
			</div>
		</div>
	);
}
