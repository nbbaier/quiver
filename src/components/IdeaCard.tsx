import { ArchiveIcon, TrashIcon } from "lucide-react";
import type { Idea } from "../lib/schema";

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
	// Format the date in a human-readable way
	const formattedDate = new Date(idea.createdAt).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	return (
		<article
			className={`bg-white rounded-lg shadow-sm border border-gray-200 p-5
                  ${idea.archived ? "opacity-60" : ""}`}
		>
			{/* Header: title and date */}
			<header className="flex justify-between items-start gap-4 mb-3">
				<h3 className="text-lg font-semibold text-gray-900 leading-tight">
					{idea.title}
				</h3>
				<time
					dateTime={idea.createdAt.toISOString()}
					className="text-sm text-gray-500 whitespace-nowrap"
				>
					{formattedDate}
				</time>
			</header>

			{/* Content */}
			<p className="text-gray-600 mb-4 whitespace-pre-wrap">{idea.content}</p>

			{/* Tags */}
			{idea.tags && idea.tags.length > 0 && (
				<div className="flex flex-wrap gap-2 mb-4">
					{idea.tags.map((tag) => (
						<span
							key={tag}
							className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-600
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
					<button
						onClick={() => onArchive(idea.id)}
						className="px-3 py-1.5 text-sm font-medium text-gray-600
                       bg-gray-100 rounded-md
                       hover:bg-gray-200 transition-colors"
					>
						<ArchiveIcon className="w-4 h-4" />
					</button>
				)}
				<button
					onClick={() => onDelete(idea.id)}
					className="px-3 py-1.5 text-sm font-medium text-red-600
                     bg-red-50 rounded-md
                     hover:bg-red-100 transition-colors"
				>
					<TrashIcon className="w-4 h-4" />
				</button>
			</footer>
		</article>
	);
}
