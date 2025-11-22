import { IdeaCard } from "./components/IdeaCard";
import { IdeaForm } from "./components/IdeaForm";
import { useIdeas } from "./hooks/useIdeas";

function App() {
	const { ideas, loading, createIdea, deleteIdea } = useIdeas();

	return (
		<div className="min-h-screen bg-gray-50 pb-16">
			<div className="mx-auto max-w-3xl px-4 py-8">
				<header className="mb-8 text-center">
					<h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
					<p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
				</header>

				<div className="space-y-8">
					<section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<IdeaForm onSubmit={createIdea} />
					</section>

					<section className="space-y-4">
						{loading ? (
							<p className="text-center text-gray-500">Loading ideas...</p>
						) : ideas.length === 0 ? (
							<p className="text-center text-gray-500">
								No ideas yet. Add one above!
							</p>
						) : (
							ideas.map((idea) => (
								<IdeaCard key={idea.id} idea={idea} onDelete={deleteIdea} />
							))
						)}
					</section>
				</div>
			</div>
		</div>
	);
}

export default App;
