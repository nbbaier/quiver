import { useState } from "react";

export default function App() {
	// useState creates "reactive" variables that trigger re-renders when changed
	// ideas: an array of strings to store our idea titles
	// input: the current text in the input field
	const [ideas, setIdeas] = useState<string[]>([]);
	const [input, setInput] = useState("");

	// This function adds a new idea to our list
	const addIdea = () => {
		// Only add if there's actual content (not just whitespace)
		if (input.trim()) {
			// Create a NEW array with the old ideas plus the new one
			// We use spread (...) because React needs a new array reference to detect changes
			setIdeas([...ideas, input.trim()]);
			// Clear the input field for the next idea
			setInput("");
		}
	};

	return (
		<div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
			<h1>Quiver</h1>
			<p>Capture your ideas</p>

			{/* Input section: a text field and a button side by side */}
			<div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
				<input
					type="text"
					value={input}
					// Update state on every keystroke - this is "controlled input" pattern
					onChange={(e) => setInput(e.target.value)}
					// Allow pressing Enter to submit (better UX)
					onKeyDown={(e) => e.key === "Enter" && addIdea()}
					placeholder="Enter an idea..."
					style={{ flex: 1, padding: "8px" }}
				/>
				<button type="button" onClick={addIdea} style={{ padding: "8px 16px" }}>
					Add
				</button>
			</div>

			{/* Idea list: map over the array to render each idea */}
			<ul>
				{ideas.map((idea) => (
					// key helps React track which items changed (important for performance)
					// Using index as key is okay here since we're not reordering items
					<li key={idea} style={{ padding: "8px 0" }}>
						{idea}
					</li>
				))}
			</ul>

			{/* Empty state: show helpful text when there are no ideas */}
			{ideas.length === 0 && (
				<p style={{ color: "#666" }}>No ideas yet. Add your first one!</p>
			)}
		</div>
	);
}
