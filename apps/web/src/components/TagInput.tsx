import { type KeyboardEvent, useState } from "react";

interface TagInputProps {
	tags: string[];
	onChange: (tags: string[]) => void;
	placeholder?: string;
}

/**
 * Tag input component with keyboard navigation.
 *
 * UX features:
 * - Press Enter or comma to add a tag
 * - Press Backspace on empty input to remove last tag
 * - Tags are normalized (lowercase, trimmed)
 * - Duplicate tags are prevented
 */
export function TagInput({
	tags,
	onChange,
	placeholder = "Add tags...",
}: TagInputProps) {
	const [input, setInput] = useState("");

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		// Add tag on Enter or comma
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			const newTag = input.trim().toLowerCase();

			// Validate: non-empty and not duplicate
			if (newTag && !tags.includes(newTag)) {
				onChange([...tags, newTag]);
			}
			setInput("");
		}

		// Remove last tag on Backspace with empty input
		if (e.key === "Backspace" && !input && tags.length > 0) {
			onChange(tags.slice(0, -1));
		}
	};

	const removeTag = (tagToRemove: string) => {
		onChange(tags.filter((tag) => tag !== tagToRemove));
	};

	return (
		<div
			className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg
                    focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent
                    bg-white"
		>
			{/* Existing tags */}
			{tags.map((tag) => (
				<span
					key={tag}
					className="inline-flex items-center gap-1 px-2.5 py-1
                     bg-primary text-white text-sm rounded-full"
				>
					{tag}
					<button
						type="button"
						onClick={() => removeTag(tag)}
						className="text-white/70 hover:text-white"
						aria-label={`Remove ${tag} tag`}
					>
						×
					</button>
				</span>
			))}

			{/* Input for new tags */}
			<input
				type="text"
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={tags.length === 0 ? placeholder : ""}
				className="flex-1 min-w-[100px] outline-none bg-transparent text-sm py-1"
			/>
		</div>
	);
}
