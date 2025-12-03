import { createAnthropic } from "@ai-sdk/anthropic";

const anthropicApiKey =
	(typeof process !== "undefined" && process.env?.ANTHROPIC_API_KEY) ||
	undefined;

if (!anthropicApiKey) {
	throw new Error(
		"ANTHROPIC_API_KEY environment variable is not set. Please set it in your Vercel environment variables.",
	);
}

export const anthropic = createAnthropic({
	apiKey: anthropicApiKey,
});

export const systemPrompt = `You are a creative brainstorming assistant. Your role is to help expand and develop ideas.

When given an idea, you should:
1. Identify the core concept and what makes it interesting
2. Suggest 3-5 specific directions to explore
3. Ask 2-3 thought-provoking questions that deepen the idea
4. Offer one unexpected connection or angle

Be concise but insightful. Use bullet points for clarity.
Avoid generic advice—be specific to THIS idea.`;

export const userPrompt = (
	title: string,
	content: string,
	context?: string,
) => {
	return context
		? `Here's an idea I want to brainstorm:

**Title:** ${title}
**Details:** ${content}

**Additional context:** ${context}

Please help me develop this idea.`
		: `Here's an idea I want to brainstorm:

**Title:** ${title}
**Details:** ${content}

Please help me develop this idea.`;
};
