import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use("/*", cors());

app.post("/api/brainstorm", async (c) => {
	const { idea, context } = await c.req.json();

	console.log("[Server] Brainstorm request received", { idea, context });

	// Create the streaming response
	const result = streamText({
		model: anthropic("claude-3-5-haiku-20241022"),
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
