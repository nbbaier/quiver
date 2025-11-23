import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "inngest/hono";
import { inngest } from "../lib/inngest";
import { functions } from "../lib/inngest-functions";

const app = new Hono();

app.use("/*", cors());

app.on(
	["GET", "POST", "PUT"],
	"/api/inngest",
	serve({ client: inngest, functions }),
);

/**
 * Start a brainstorm via Inngest.
 *
 * Instead of calling Claude directly, we send an event to Inngest.
 * This returns immediately—the actual work happens in the background.
 */
app.post("/api/brainstorm", async (c) => {
	const { ideaId, idea, context } = await c.req.json();

	// Initialize as pending so polling knows it's in progress
	brainstormResults.set(ideaId, {
		status: "pending",
	});

	// Send event to Inngest (returns immediately)
	await inngest.send({
		name: "idea/brainstorm",
		data: {
			ideaId,
			title: idea.title,
			content: idea.content,
			context,
		},
	});

	// Return immediately—brainstorm runs in background
	return c.json({
		status: "started",
		message: "Brainstorm started. Poll /api/brainstorm/:id for results.",
	});
});

const brainstormResults = new Map<
	number,
	{
		status: "pending" | "completed" | "failed";
		result?: string;
		error?: string;
	}
>();

/**
 * Event handler for brainstorm completion.
 *
 * When Inngest finishes a brainstorm, it sends a completion event.
 * We listen for this and store the result.
 */
app.post("/api/inngest/webhook", async (c) => {
	const event = await c.req.json();

	console.log("[Webhook] Received event:", event.name, event.data);

	if (event.name === "idea/brainstorm.completed") {
		brainstormResults.set(event.data.ideaId, {
			status: "completed",
			result: event.data.result,
		});
		console.log(
			`[Webhook] Stored completed result for ideaId: ${event.data.ideaId}`,
		);
	} else if (event.name === "idea/brainstorm.failed") {
		brainstormResults.set(event.data.ideaId, {
			status: "failed",
			error: event.data.error,
		});
		console.log(
			`[Webhook] Stored failed result for ideaId: ${event.data.ideaId}`,
		);
	}

	return c.json({ received: true });
});

/**
 * Poll for brainstorm results.
 *
 * The frontend calls this repeatedly until the brainstorm completes.
 */
app.get("/api/brainstorm/:id", async (c) => {
	const ideaId = parseInt(c.req.param("id"));
	const result = brainstormResults.get(ideaId);

	if (!result) {
		return c.json({ status: "pending" });
	}

	// Clean up after returning completed result
	if (result.status !== "pending") {
		brainstormResults.delete(ideaId);
	}

	return c.json(result);
});

app.post("/api/brainstorm/stream", async (c) => {
	const { idea, context } = await c.req.json();

	console.log("[Server] Brainstorm request received", { idea, context });

	// Create the streaming response
	const result = streamText({
		model: anthropic("claude-haiku-4-5"),
		system: `You are a creative brainstorming assistant. Your role is to help expand and develop ideas.

When given an idea, you should:
1. Identify the core concept and what makes it interesting
2. Suggest 3-5 specific directions to explore
3. Ask 2-3 thought-provoking questions that deepen the idea
4. Offer one unexpected connection or angle

Be concise but insightful. Use bullet points for clarity.
Avoid generic advice—be specific to THIS idea.`,

		messages: [
			{
				role: "user",
				content: context
					? `Here's an idea I want to brainstorm:

**Title:** ${idea.title}
**Details:** ${idea.content}

**Additional context:** ${context}

Please help me develop this idea.`
					: `Here's an idea I want to brainstorm:

**Title:** ${idea.title}
**Details:** ${idea.content}

Please help me develop this idea.`,
			},
		],
	});

	console.log("[Server] streamText result created");

	// Return the streaming response with explicit headers
	const streamResponse = result.toTextStreamResponse();

	console.log("[Server] Response created", {
		originalHeaders: Object.fromEntries(streamResponse.headers.entries()),
		hasBody: !!streamResponse.body,
	});

	// Ensure proper streaming headers are set
	return new Response(streamResponse.body, {
		status: streamResponse.status,
		statusText: streamResponse.statusText,
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no", // Disable nginx buffering if present
			...Object.fromEntries(streamResponse.headers.entries()),
		},
	});
});

export default app;
