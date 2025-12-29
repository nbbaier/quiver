import { useEffect, useRef, useState } from "react";

interface SearchBarProps {
	onSearch: (query: string) => void;
	placeholder?: string;
}

/**
 * Search input with debouncing.
 *
 * Why debounce?
 * - Prevents filtering on every keystroke (which can feel laggy)
 * - Waits for user to pause typing, then filters
 * - 300ms is a good balance between responsiveness and performance
 */
export function SearchBar({
	onSearch,
	placeholder = "Search ideas...",
}: SearchBarProps) {
	const [query, setQuery] = useState("");
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Debounce search
	useEffect(() => {
		// Clear any existing timeout
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		// Set new timeout
		debounceRef.current = setTimeout(() => {
			onSearch(query.trim());
		}, 300);

		// Cleanup on unmount
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [query, onSearch]);

	return (
		<div className="relative">
			{/* Search icon */}
			<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<svg
					className="h-5 w-5 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			</div>

			{/* Input */}
			<input
				type="text"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder={placeholder}
				className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg
                   bg-white shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                   transition-colors"
				aria-label="Search ideas"
			/>

			{/* Clear button */}
			{query && (
				<button
					onClick={() => setQuery("")}
					className="absolute inset-y-0 right-0 pr-3 flex items-center
                     text-gray-400 hover:text-gray-600"
					aria-label="Clear search"
				>
					<svg
						className="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			)}
		</div>
	);
}
