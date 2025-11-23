import type { Idea } from "../lib/schema";
import { IdeaCard } from "./IdeaCard";

interface IdeaListProps {
	ideas: Idea[];
	loading: boolean;
	error: Error | null;
	onDelete: (id: number) => Promise<void>;
	onArchive: (id: number) => Promise<void>;
}

export function IdeaList({
	ideas,
	loading,
	error,
	onDelete,
	onArchive,
}: IdeaListProps) {
	if (loading) {
		return (
			<div className="text-center py-12 text-gray-500">Loading ideas...</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-12 text-red-600">
				Error: {error.message}
			</div>
		);
	}

	if (ideas.length === 0) {
		return (
			<div className="text-center py-12 text-gray-500">
				<p>No ideas match your filters.</p>
				<p className="mt-1">Try adjusting filters or create a new idea!</p>
			</div>
		);
	}

	return (
		<div>
			<h2 className="text-lg font-semibold text-gray-900 mb-4">
				Ideas ({ideas.length})
			</h2>
			<div className="space-y-4">
				{ideas.map((idea) => (
					<IdeaCard
						key={idea.id}
						idea={idea}
						onDelete={onDelete}
						onArchive={onArchive}
					/>
				))}
			</div>
		</div>
	);
}
