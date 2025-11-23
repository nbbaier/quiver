import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { inngest } from "./inngest.js";

/**
 * Brainstorm function.
 *
 * This runs in the background when an "idea/brainstorm" event is sent.
 * Inngest handles retries, logging, and error reporting automatically.
 *
 * Why generateText instead of streamText?
 * Background functions can't stream to a browser. Instead, we generate
 * the full response, store it, and the frontend polls for completion.
 */
export const brainstormIdea = inngest.createFunction(
	{
		id: "brainstorm-idea",
		retries: 3,
		concurrency: { limit: 2 },
	},
	{ event: "idea/brainstorm" },
	async ({ event, step }) => {
		const { ideaId, title, content, context } = event.data;

		/**
		 * step.run() wraps operations that should be retried independently.
		 *
		 * If Claude fails but we already saved partial results, the retry
		 * won't redo the saved work. This is "durable execution."
		 */
		const result = await step.run("call-claude", async () => {
			// Temporarily add this to test retries

			const prompt = context
				? `Here's an idea I want to brainstorm:

**Title:** ${title}
**Details:** ${content}

**Additional context:** ${context}

Please help me develop this idea.`
				: `Here's an idea I want to brainstorm:

**Title:** ${title}
**Details:** ${content}

Please help me develop this idea.`;

			const response = await generateText({
				model: anthropic("claude-haiku-4-5-20251001"),
				system: `You are a creative brainstorming assistant. Your role is to help expand and develop ideas.

When given an idea, you should:
1. Identify the core concept and what makes it interesting
2. Suggest 3-5 specific directions to explore
3. Ask 2-3 thought-provoking questions that deepen the idea
4. Offer one unexpected connection or angle

Be concise but insightful. Use bullet points for clarity.
Avoid generic advice—be specific to THIS idea.`,
				prompt,
			});

			return response.text;
		});

		/**
		 * Send a completion event.
		 *
		 * This lets other parts of your system react to brainstorm completion.
		 * For example, you could trigger a notification or update a cache.
		 */
		await step.sendEvent("notify-completion", {
			name: "idea/brainstorm.completed",
			data: {
				ideaId,
				result,
			},
		});

		return { ideaId, result };
	},
);

/**
 * Export all functions for the serve handler.
 */
export const functions = [brainstormIdea];
