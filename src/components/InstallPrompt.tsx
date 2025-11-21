import { useEffect, useState } from "react";

// TypeScript interface for the browser event
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
	const [installPrompt, setInstallPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [isInstalled, setIsInstalled] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(display-mode: standalone)").matches,
	);
	const [showPrompt, setShowPrompt] = useState(false);

	useEffect(() => {
		// Capture the install prompt event
		const handleBeforeInstall = (e: Event) => {
			e.preventDefault();
			setInstallPrompt(e as BeforeInstallPromptEvent);
			// Show our custom prompt after user engagement
			setTimeout(() => setShowPrompt(true), 3000);
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstall);

		// Handle successful installation
		window.addEventListener("appinstalled", () => {
			setIsInstalled(true);
			setShowPrompt(false);
		});

		return () => {
			window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
		};
	}, []);

	const handleInstall = async () => {
		if (!installPrompt) return;

		await installPrompt.prompt();
		const { outcome } = await installPrompt.userChoice;

		if (outcome === "accepted") {
			setIsInstalled(true);
		}
		setShowPrompt(false);
	};

	const handleDismiss = () => {
		setShowPrompt(false);
	};

	if (isInstalled || !showPrompt) return null;

	return (
		<div className="install-prompt">
			<div className="install-prompt-content">
				<p>
					<strong>Install Quiver</strong>
				</p>
				<p>Add to your home screen for quick access</p>
				<div className="install-prompt-actions">
					<button type="button" onClick={handleInstall} className="btn-install">
						Install
					</button>
					<button type="button" onClick={handleDismiss} className="btn-dismiss">
						Not now
					</button>
				</div>
			</div>
		</div>
	);
}
