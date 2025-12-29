import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { anthropic, systemPrompt, userPrompt } from "./ai.js";
import { db } from "./db.js";
import { inngest } from "./inngest.js";
import { brainstormResults } from "./schema.js";

/**
 * Brainstorm function with database persistence.
 *
 * Instead of sending webhook events, we write directly to the database.
 * This is more reliable for Vercel's stateless serverless functions.
 */
export const brainstormIdea = inngest.createFunction(
	{
		id: "brainstorm-idea",
		retries: 3,
		concurrency: { limit: 2 },
	},
	{ event: "idea/brainstorm" },
	async ({ event, step }) => {
		const { brainstormId, ideaId, title, content, context } = event.data;

		try {
			const result = await step.run("call-claude", async () => {
				const response = await generateText({
					model: anthropic("claude-haiku-4-5-20251001"),
					system: systemPrompt,
					prompt: userPrompt(title, content, context),
				});

				return response.text;
			});

			// Write success to database
			await step.run("save-result", async () => {
				await db
					.update(brainstormResults)
					.set({
						status: "completed",
						result,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(brainstormResults.id, brainstormId));
			});

			return { brainstormId, ideaId, result };
		} catch (error) {
			// Write failure to database
			await db
				.update(brainstormResults)
				.set({
					status: "failed",
					error: error instanceof Error ? error.message : "Unknown error",
					updatedAt: new Date().toISOString(),
				})
				.where(eq(brainstormResults.id, brainstormId));

			throw error; // Re-throw for Inngest retry logic
		}
	},
);

export const functions = [brainstormIdea];
