import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { useIdeas } from "./hooks/useIdeas";

function App() {
	const { ideas, loading, error, createIdea, deleteIdea, archiveIdea } =
		useIdeas();

	const handleCreateIdea = async (title: string, content: string) => {
		await createIdea(title, content);
	};

	const handleArchiveIdea = async (id: number) => {
		await archiveIdea(id);
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="mx-auto max-w-3xl px-4 py-8">
				{/* Header */}
				<header className="mb-8 text-center">
					<h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
					<p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
				</header>

				<main className="space-y-8">
					{/* Idea capture form */}
					<section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">
							New Idea
						</h2>
						<IdeaForm onSubmit={handleCreateIdea} />
					</section>

					{/* Ideas list */}
					<section>
						<IdeaList
							ideas={ideas}
							loading={loading}
							error={error}
							onDelete={deleteIdea}
							onArchive={handleArchiveIdea}
						/>
					</section>
				</main>
			</div>
			<OfflineIndicator />
		</div>
	);
}

export default App;
