import { ArchiveIcon, Brain, TrashIcon } from "lucide-react";
import { useState } from "react";
import type { Idea } from "../lib/schema";
import { BrainstormPanel } from "./BrainstormPanel";

interface IdeaCardProps {
	idea: Idea;
	onDelete: (id: number) => Promise<void>;
	onArchive: (id: number) => Promise<void>;
}

/**
 * Displays a single idea with actions.
 *
 * This is a "presentational" component—it receives data and callbacks
 * as props and doesn't manage any state itself.
 */
export function IdeaCard({ idea, onDelete, onArchive }: IdeaCardProps) {
	const [showBrainstorm, setShowBrainstorm] = useState(false);

	const formattedDate = new Date(idea.createdAt).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	return (
		<>
			<article
				className={`bg-bg-card rounded-lg shadow-sm border border-border-default p-5
                  ${idea.archived ? "opacity-60" : ""}`}
			>
				{/* Header: title and date */}
				<header className="flex justify-between items-start gap-4 mb-3">
					<h3 className="text-lg font-semibold text-text-main leading-tight">
						{idea.title}
					</h3>
					<time
						dateTime={idea.createdAt.toISOString()}
						className="text-sm text-text-muted whitespace-nowrap"
					>
						{formattedDate}
					</time>
				</header>

				{/* Content */}
				<p className="text-text-muted mb-4 whitespace-pre-wrap">{idea.content}</p>

				{/* Tags */}
				{idea.tags && idea.tags.length > 0 && (
					<div className="flex flex-wrap gap-2 mb-4">
						{idea.tags.map((tag) => (
							<span
								key={tag}
								className="inline-block px-2.5 py-0.5 bg-bg-elevated text-text-muted
                         text-xs font-medium rounded-full"
							>
								{tag}
							</span>
						))}
					</div>
				)}

				{/* Actions */}
				<footer className="flex justify-end gap-2">
					{!idea.archived && (
						<>
							<button
								onClick={() => setShowBrainstorm(!showBrainstorm)}
								className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                           ${
															showBrainstorm
																? "bg-primary text-primary-foreground"
																: "bg-primary/10 text-primary hover:bg-primary/20"
														}`}
							>
								{showBrainstorm ? "Hide" : <Brain className="w-4 h-4" />}
							</button>
						</>
					)}

					{!idea.archived && (
						<button
							onClick={() => onArchive(idea.id)}
							className="px-3 py-1.5 text-sm font-medium text-text-muted
                       bg-bg-elevated rounded-md border border-border-default
                       hover:bg-border-default transition-colors"
						>
							<ArchiveIcon className="w-4 h-4" />
						</button>
					)}
					<button
						onClick={() => onDelete(idea.id)}
						className="px-3 py-1.5 text-sm font-medium text-danger
                     bg-danger/10 rounded-md
                     hover:bg-danger/20 transition-colors"
					>
						<TrashIcon className="w-4 h-4" />
					</button>
				</footer>
			</article>
			{/* Brainstorm panel (appears below the card) */}
			{showBrainstorm && (
				<BrainstormPanel idea={idea} onClose={() => setShowBrainstorm(false)} />
			)}
		</>
	);
}
