import type { Idea } from "../lib/schema";
import { IdeaCard } from "./IdeaCard";

interface IdeaListProps {
	ideas: Idea[];
	loading: boolean;
	error: Error | null;
	onDelete: (id: number) => Promise<void>;
	onArchive: (id: number) => Promise<void>;
}

/**
 * Displays a list of ideas with loading and error states.
 */
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
				<p>No ideas yet.</p>
				<p className="mt-1">Create your first one above!</p>
			</div>
		);
	}

	// Separate active and archived ideas
	const activeIdeas = ideas.filter((idea) => !idea.archived);
	const archivedIdeas = ideas.filter((idea) => idea.archived);

	return (
		<div className="space-y-6">
			{/* Active ideas */}
			{activeIdeas.length > 0 && (
				<section>
					<h2 className="text-lg font-semibold text-gray-900 mb-4">
						Ideas ({activeIdeas.length})
					</h2>
					<div className="space-y-4">
						{activeIdeas.map((idea) => (
							<IdeaCard
								key={idea.id}
								idea={idea}
								onDelete={onDelete}
								onArchive={onArchive}
							/>
						))}
					</div>
				</section>
			)}

			{/* Archived ideas */}
			{archivedIdeas.length > 0 && (
				<section>
					<h2 className="text-lg font-semibold text-gray-500 mb-4">
						Archived ({archivedIdeas.length})
					</h2>
					<div className="space-y-4">
						{archivedIdeas.map((idea) => (
							<IdeaCard
								key={idea.id}
								idea={idea}
								onDelete={onDelete}
								onArchive={onArchive}
							/>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
