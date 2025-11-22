import type { Idea } from "../lib/schema";

interface IdeaCardProps {
	idea: Idea;
	onDelete: (id: number) => void;
}

export function IdeaCard({ idea, onDelete }: IdeaCardProps) {
	return (
		<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
			<div className="flex justify-between items-start mb-2">
				<h3 className="text-lg font-semibold text-gray-900">{idea.title}</h3>
				<button
					onClick={() => onDelete(idea.id)}
					className="text-gray-400 hover:text-danger transition-colors"
					aria-label="Delete idea"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M3 6h18"></path>
						<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
						<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
					</svg>
				</button>
			</div>
			<p className="text-gray-600 whitespace-pre-wrap mb-4">{idea.content}</p>
			<div className="text-xs text-gray-400">
				{new Date(idea.createdAt).toLocaleDateString()}
			</div>
		</div>
	);
}
