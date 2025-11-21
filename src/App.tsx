import { useState } from "react";
import { BrainstormPanel } from "@/components/BrainstormPanel";
import { IdeaCard } from "@/components/IdeaCard";
import { IdeaForm } from "@/components/IdeaForm";
import { InstallPrompt } from "@/components/InstallPrompt";
import { IOSInstallInstructions } from "@/components/IOSInstallInstructions";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useIdeas } from "@/hooks/useIdeas";
import type { Idea } from "@/types/idea";

function App() {
	const {
		ideas,
		loading,
		error,
		syncing,
		isOnline,
		addIdea,
		editIdea,
		removeIdea,
	} = useIdeas();
	const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

	const handleSelectIdea = (idea: Idea) => {
		setSelectedIdea(selectedIdea?.id === idea.id ? null : idea);
	};

	return (
		<>
			<OfflineIndicator isOnline={isOnline} syncing={syncing} />

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
									isSelected={selectedIdea?.id === idea.id}
									onSelect={() => handleSelectIdea(idea)}
									onUpdate={editIdea}
									onDelete={removeIdea}
								/>
							))}
						</div>
					)}

					{/* AI Brainstorming Panel */}
					<BrainstormPanel ideas={ideas} selectedIdea={selectedIdea} />
				</main>

				<footer className="app-footer">
					<p>
						{ideas.length} idea{ideas.length !== 1 ? "s" : ""} captured
						{!isOnline && " (offline)"}
					</p>
				</footer>

				<InstallPrompt />
				<IOSInstallInstructions />
			</div>
		</>
	);
}

export default App;
