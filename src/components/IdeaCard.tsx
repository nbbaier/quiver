import { useState } from "react";
import type { Idea, UpdateIdeaInput } from "@/types/idea";

interface IdeaCardProps {
	idea: Idea;
	onUpdate: (id: number, input: UpdateIdeaInput) => Promise<unknown>;
	onDelete: (id: number) => Promise<void>;
}

export function IdeaCard({ idea, onUpdate, onDelete }: IdeaCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [title, setTitle] = useState(idea.title);
	const [content, setContent] = useState(idea.content || "");
	const [isDeleting, setIsDeleting] = useState(false);

	const handleSave = async () => {
		await onUpdate(idea.id, { title, content });
		setIsEditing(false);
	};

	const handleCancel = () => {
		setTitle(idea.title);
		setContent(idea.content || "");
		setIsEditing(false);
	};

	const handleDelete = async () => {
		if (window.confirm("Archive this idea?")) {
			setIsDeleting(true);
			await onDelete(idea.id);
		}
	};

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (isEditing) {
		return (
			<div className="idea-card editing">
				<input
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className="idea-title-input"
					placeholder="Idea title..."
				/>
				<textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					className="idea-content-input"
					placeholder="Add more details..."
					rows={3}
				/>
				<div className="idea-actions">
					<button type="button" onClick={handleSave} className="btn-save">
						Save
					</button>
					<button type="button" onClick={handleCancel} className="btn-cancel">
						Cancel
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="idea-card">
			<div className="idea-header">
				<h3 className="idea-title">{idea.title}</h3>
				<span className="idea-date">{formatDate(idea.createdAt)}</span>
			</div>

			{idea.content && <p className="idea-content">{idea.content}</p>}

			{idea.tags.length > 0 && (
				<div className="idea-tags">
					{idea.tags.map((tag) => (
						<span key={tag} className="tag">
							{tag}
						</span>
					))}
				</div>
			)}

			<div className="idea-actions">
				<button
					type="button"
					onClick={() => setIsEditing(true)}
					className="btn-edit"
				>
					Edit
				</button>
				<button
					type="button"
					onClick={handleDelete}
					className="btn-delete"
					disabled={isDeleting}
				>
					{isDeleting ? "Archiving..." : "Archive"}
				</button>
			</div>
		</div>
	);
}
