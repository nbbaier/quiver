import { Monitor, Palette } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export function ThemeSwitcher() {
	const { theme, toggleTheme } = useTheme();

	return (
		<button
			onClick={toggleTheme}
			className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md
                 bg-bg-elevated border border-border-default text-text-muted hover:text-text-main
                 transition-colors"
			title={`Switch to ${theme === "default" ? "SST" : "Default"} theme`}
		>
			{theme === "default" ? (
				<Monitor className="w-4 h-4" />
			) : (
				<Palette className="w-4 h-4" />
			)}
			<span className="hidden sm:inline">
				{theme === "default" ? "Default" : "SST Design"}
			</span>
		</button>
	);
}
