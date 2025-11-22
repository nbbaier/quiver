import Anthropic from "@anthropic-ai/sdk";
import type { Idea } from "@/types/idea";

const anthropic = new Anthropic({
	apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
	dangerouslyAllowBrowser: true, // Required for client-side usage
});

export async function brainstormIdeas(
	ideas: Idea[],
	onStream?: (text: string) => void,
): Promise<string> {
	// Build context from recent ideas
	const ideaContext = ideas
		.slice(0, 10) // Use last 10 ideas for context
		.map((idea) => {
			let text = `- ${idea.title}`;
			if (idea.content) text += `: ${idea.content}`;
			if (idea.tags.length > 0) text += ` [Tags: ${idea.tags.join(", ")}]`;
			return text;
		})
		.join("\n");

	const prompt = `You are a creative brainstorming partner. Based on the user's recent ideas below, suggest 5 new directions they could explore. Be creative, make unexpected connections, and offer fresh perspectives.

User's Recent Ideas:
${ideaContext}

Please provide:
1. 5 new idea suggestions that build on or connect their existing ideas
2. Common themes you notice across their ideas
3. Unexpected connections between seemingly unrelated ideas

Format your response in a clear, readable way with headers for each section.`;

	if (onStream) {
		// Streaming response
		let fullText = "";
		const stream = anthropic.messages.stream({
			model: "claude-3-5-haiku-20241022",
			max_tokens: 1024,
			messages: [{ role: "user", content: prompt }],
		});

		for await (const event of stream) {
			if (
				event.type === "content_block_delta" &&
				event.delta.type === "text_delta"
			) {
				fullText += event.delta.text;
				onStream(fullText);
			}
		}

		return fullText;
	} else {
		// Non-streaming response
		const response = await anthropic.messages.create({
			model: "claude-3-5-haiku-20241022",
			max_tokens: 1024,
			messages: [{ role: "user", content: prompt }],
		});

		const textBlock = response.content.find((block) => block.type === "text");
		return textBlock ? textBlock.text : "No response generated";
	}
}

export async function expandIdea(
	idea: Idea,
	onStream?: (text: string) => void,
): Promise<string> {
	const prompt = `Help me develop this idea further:

Title: ${idea.title}
${idea.content ? `Description: ${idea.content}` : ""}
${idea.tags.length > 0 ? `Tags: ${idea.tags.join(", ")}` : ""}

Please provide:
1. Three ways to expand or develop this idea
2. Potential challenges and how to address them
3. Related concepts or fields to explore
4. A simple next step to get started`;

	if (onStream) {
		let fullText = "";
		const stream = anthropic.messages.stream({
			model: "claude-3-5-haiku-20241022",
			max_tokens: 1024,
			messages: [{ role: "user", content: prompt }],
		});

		for await (const event of stream) {
			if (
				event.type === "content_block_delta" &&
				event.delta.type === "text_delta"
			) {
				fullText += event.delta.text;
				onStream(fullText);
			}
		}

		return fullText;
	} else {
		const response = await anthropic.messages.create({
			model: "claude-3-5-haiku-20241022",
			max_tokens: 1024,
			messages: [{ role: "user", content: prompt }],
		});

		const textBlock = response.content.find((block) => block.type === "text");
		return textBlock ? textBlock.text : "No response generated";
	}
}
