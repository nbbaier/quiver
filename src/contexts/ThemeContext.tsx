import { createContext, useContext, useEffect, useState } from "react";

type Theme = "default" | "sst";

interface ThemeContextType {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>(() => {
		const saved = localStorage.getItem("theme");
		return (saved as Theme) || "default";
	});

	useEffect(() => {
		const root = document.documentElement;
		if (theme === "sst") {
			root.setAttribute("data-theme", "sst");
		} else {
			root.removeAttribute("data-theme");
		}
		localStorage.setItem("theme", theme);
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "default" ? "sst" : "default"));
	};

	return (
		<ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
