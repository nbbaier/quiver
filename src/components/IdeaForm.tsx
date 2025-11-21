import { useState } from "react";
import type { CreateIdeaInput } from "@/types/idea";

interface IdeaFormProps {
	onSubmit: (input: CreateIdeaInput) => Promise<unknown>;
}

export function IdeaForm({ onSubmit }: IdeaFormProps) {
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [tagInput, setTagInput] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;

		setIsSubmitting(true);
		try {
			const tags = tagInput
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);

			await onSubmit({
				title: title.trim(),
				content: content.trim() || undefined,
				tags: tags.length > 0 ? tags : undefined,
			});

			// Reset form
			setTitle("");
			setContent("");
			setTagInput("");
			setIsExpanded(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			handleSubmit(e);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="idea-form">
			<input
				type="text"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				onFocus={() => setIsExpanded(true)}
				onKeyDown={handleKeyDown}
				placeholder="Capture an idea..."
				className="idea-input-main"
				disabled={isSubmitting}
			/>

			{isExpanded && (
				<>
					<textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Add more details (optional)..."
						className="idea-input-content"
						rows={3}
						disabled={isSubmitting}
					/>

					<input
						type="text"
						value={tagInput}
						onChange={(e) => setTagInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Tags (comma-separated)..."
						className="idea-input-tags"
						disabled={isSubmitting}
					/>

					<div className="form-actions">
						<button type="submit" disabled={!title.trim() || isSubmitting}>
							{isSubmitting ? "Saving..." : "Save Idea"}
						</button>
						<button
							type="button"
							onClick={() => setIsExpanded(false)}
							className="btn-collapse"
						>
							Collapse
						</button>
						<span className="form-hint">Ctrl+Enter to save</span>
					</div>
				</>
			)}
		</form>
	);
}
