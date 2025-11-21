import { useEffect, useState } from "react";

export function IOSInstallInstructions() {
	const [show, setShow] = useState(false);

	useEffect(() => {
		// Detect iOS Safari (not in standalone mode)
		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
		const isStandalone = window.matchMedia(
			"(display-mode: standalone)",
		).matches;
		const isSafari =
			/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

		if (isIOS && isSafari && !isStandalone) {
			setTimeout(() => setShow(true), 5000);
		}
	}, []);

	if (!show) return null;

	return (
		<div className="ios-install-instructions">
			<button
				type="button"
				className="close-btn"
				onClick={() => setShow(false)}
			>
				×
			</button>
			<p>
				<strong>Install Quiver</strong>
			</p>
			<p>Tap the share button then "Add to Home Screen"</p>
		</div>
	);
}
export default IOSInstallInstructions;
