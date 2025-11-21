interface OfflineIndicatorProps {
	isOnline: boolean;
	syncing: boolean;
}

export function OfflineIndicator({ isOnline, syncing }: OfflineIndicatorProps) {
	if (isOnline && !syncing) return null;

	return (
		<div className={`offline-indicator ${syncing ? "syncing" : "offline"}`}>
			{syncing ? (
				<span>Syncing...</span>
			) : (
				<span>You're offline. Changes will sync when connected.</span>
			)}
		</div>
	);
}
