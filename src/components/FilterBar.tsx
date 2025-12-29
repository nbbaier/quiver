interface FilterBarProps {
	allTags: string[];
	selectedTags: string[];
	onTagToggle: (tag: string) => void;
	showArchived: boolean;
	onToggleArchived: () => void;
}

/**
 * Filter bar for narrowing down the ideas list.
 *
 * Features:
 * - Filter by one or more tags (OR logic)
 * - Toggle to show/hide archived ideas
 * - Only shows when there are tags to filter by
 */
export function FilterBar({
	allTags,
	selectedTags,
	onTagToggle,
	showArchived,
	onToggleArchived,
}: FilterBarProps) {
	// Don't render if there are no tags
	if (allTags.length === 0) return null;

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
			{/* Tag filters */}
			<div className="mb-3">
				<span className="text-sm font-medium text-gray-700 mr-3">
					Filter by tag:
				</span>
				<div className="inline-flex flex-wrap gap-2 mt-2">
					{allTags.map((tag) => {
						const isSelected = selectedTags.includes(tag);
						return (
							<button
								key={tag}
								onClick={() => onTagToggle(tag)}
								className={`px-3 py-1 text-sm rounded-full border transition-colors
                           ${
															isSelected
																? "bg-primary text-white border-primary"
																: "bg-white text-gray-600 border-gray-300 hover:border-primary"
														}`}
							>
								{tag}
							</button>
						);
					})}

					{/* Clear filters button */}
					{selectedTags.length > 0 && (
						<button
							onClick={() => selectedTags.forEach(onTagToggle)}
							className="px-3 py-1 text-sm text-gray-500 underline
                         hover:text-gray-700"
						>
							Clear filters
						</button>
					)}
				</div>
			</div>

			{/* Archived toggle */}
			<label className="inline-flex items-center gap-2 cursor-pointer">
				<input
					type="checkbox"
					checked={showArchived}
					onChange={onToggleArchived}
					className="w-4 h-4 text-primary rounded border-gray-300
                     focus:ring-primary cursor-pointer"
				/>
				<span className="text-sm text-gray-600">Show archived ideas</span>
			</label>
		</div>
	);
}
