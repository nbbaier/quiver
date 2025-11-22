import { type FormEvent, useState } from "react";
import type { Idea } from "../lib/schema";

interface IdeaFormProps {
	onSubmit: (title: string, content: string, tags?: string[]) => Promise<Idea>;
}
export function IdeaForm({ onSubmit }: IdeaFormProps) {
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!title.trim() || !content.trim()) return;

		setSubmitting(true);
		await onSubmit(title, content);
		setTitle("");
		setContent("");
		setSubmitting(false);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<input
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="What's your idea?"
					className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     transition-colors"
				/>
			</div>
			<div>
				<textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="Describe it..."
					rows={4}
					className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     transition-colors"
				/>
			</div>
			<button
				type="submit"
				disabled={submitting}
				className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg
                   hover:bg-primary-hover disabled:opacity-50 transition-colors"
			>
				{submitting ? "Saving..." : "Save Idea"}
			</button>
		</form>
	);
}
