import { useEffect, useState } from "react";

/**
 * Shows a banner when the user is offline.
 *
 * Why track online status?
 * - Users need to know why data isn't syncing
 * - Sets appropriate expectations (can read, can't write to server)
 * - Builds trust by being transparent about app state
 */
export function OfflineIndicator() {
	const [isOnline, setIsOnline] = useState(navigator.onLine);

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	// Don't render anything when online
	if (isOnline) return null;

	return (
		<div
			className="fixed bottom-0 left-0 right-0 bg-amber-400 text-amber-900
                    text-center py-3 px-4 font-medium z-50"
		>
			You're offline. Changes will sync when you're back online.
		</div>
	);
}
