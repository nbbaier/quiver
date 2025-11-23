import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useIdeas } from "./hooks/useIdeas";

function AppContent() {
	const {
		ideas,
		loading,
		error,
		syncing,
		createIdea,
		deleteIdea,
		archiveIdea,
	} = useIdeas();

	const handleCreateIdea = async (title: string, content: string) => {
		await createIdea(title, content);
	};

	const handleArchiveIdea = async (id: number) => {
		await archiveIdea(id);
	};

	return (
		<div className="min-h-screen bg-bg-page transition-colors duration-200">
			<div className="mx-auto max-w-3xl px-4 py-8">
				{/* Header */}
				<header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div className="text-center md:text-left">
						<h1 className="text-4xl font-bold text-text-main">Quiver</h1>
						<p className="mt-2 text-text-muted">Capture ideas anywhere.</p>
						{syncing && (
							<p className="mt-1 text-sm text-primary animate-pulse">
								Syncing...
							</p>
						)}
					</div>
					<div className="self-center md:self-start">
						<ThemeSwitcher />
					</div>
				</header>

				<main className="space-y-8">
					{/* Idea capture form */}
					<section className="bg-bg-card rounded-xl shadow-sm border border-border-default p-6">
						<h2 className="text-lg font-semibold text-text-main mb-4">
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

function App() {
	return (
		<ThemeProvider>
			<AppContent />
		</ThemeProvider>
	);
}

export default App;
