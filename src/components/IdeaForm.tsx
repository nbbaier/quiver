import { type FormEvent, useState } from "react";

interface IdeaFormProps {
	onSubmit: (title: string, content: string) => Promise<void>;
}

/**
 * Form for capturing new ideas.
 *
 * Design decisions:
 * - Controlled inputs (React manages the input state)
 * - Disabled during submission to prevent double-submit
 * - Clears after successful submission
 */
export function IdeaForm({ onSubmit }: IdeaFormProps) {
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		// Prevent default form submission (page reload)
		e.preventDefault();

		// Validate
		if (!title.trim() || !content.trim()) return;

		setSubmitting(true);
		try {
			await onSubmit(title.trim(), content.trim());
			// Clear form on success
			setTitle("");
			setContent("");
		} finally {
			setSubmitting(false);
		}
	};

	const isValid = title.trim() && content.trim();

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Title input */}
			<div>
				<label
					htmlFor="title"
					className="block text-sm font-medium text-gray-700 mb-1"
				>
					Title
				</label>
				<input
					id="title"
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="What's your idea?"
					disabled={submitting}
					required
					className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     transition-colors"
				/>
			</div>

			{/* Content textarea */}
			<div>
				<label
					htmlFor="content"
					className="block text-sm font-medium text-gray-700 mb-1"
				>
					Details
				</label>
				<textarea
					id="content"
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="Describe your idea in detail..."
					rows={4}
					disabled={submitting}
					required
					className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     transition-colors"
				/>
			</div>

			{/* Submit button */}
			<button
				type="submit"
				disabled={submitting || !isValid}
				className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg
                   hover:bg-primary-hover
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
			>
				{submitting ? "Saving..." : "Save Idea"}
			</button>
		</form>
	);
}
