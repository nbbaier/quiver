import { IdeaCard } from "@/components/IdeaCard";
import { IdeaForm } from "@/components/IdeaForm";
import { useIdeas } from "@/hooks/useIdeas";

function App() {
	const { ideas, loading, error, addIdea, editIdea, removeIdea } = useIdeas();

	return (
		<div className="app-container">
			<header className="app-header">
				<h1>Quiver</h1>
				<p>Capture and develop your ideas</p>
			</header>

			<main className="app-main">
				<IdeaForm onSubmit={addIdea} />

				{error && <div className="error-message">{error}</div>}

				{loading ? (
					<div className="loading">Loading ideas...</div>
				) : ideas.length === 0 ? (
					<div className="empty-state">
						<p>No ideas yet!</p>
						<p>Start capturing your thoughts above.</p>
					</div>
				) : (
					<div className="ideas-list">
						{ideas.map((idea) => (
							<IdeaCard
								key={idea.id}
								idea={idea}
								onUpdate={editIdea}
								onDelete={removeIdea}
							/>
						))}
					</div>
				)}
			</main>

			<footer className="app-footer">
				<p>
					{ideas.length} idea{ideas.length !== 1 ? "s" : ""} captured
				</p>
			</footer>
		</div>
	);
}

export default App;
