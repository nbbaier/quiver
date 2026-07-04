import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../src/lib/db.js";
import { inngest } from "../../src/lib/inngest.js";
import { brainstormResults } from "../../src/lib/schema.js";

/**
 * POST /api/brainstorm
 *
 * Starts a new brainstorm session:
 * 1. Creates a pending record in the database
 * 2. Sends an event to Inngest to process in the background
 * 3. Returns the brainstorm ID for polling
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { ideaId, idea, context } = req.body;

		if (!ideaId || !idea?.title || !idea?.content) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		// Create a pending brainstorm record
		const [record] = await db
			.insert(brainstormResults)
			.values({
				ideaId,
				status: "pending",
			})
			.returning();

		// Send event to Inngest for background processing
		await inngest.send({
			name: "idea/brainstorm",
			data: {
				brainstormId: record.id,
				ideaId,
				title: idea.title,
				content: idea.content,
				context,
			},
		});

		return res.status(200).json({
			id: record.id,
			status: "pending",
			message: "Brainstorm started. Poll /api/brainstorm/:id for results.",
		});
	} catch (error) {
		console.error("Failed to start brainstorm:", error);
		return res.status(500).json({ error: "Failed to start brainstorm" });
	}
}
