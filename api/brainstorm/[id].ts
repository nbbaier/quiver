import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db.js";
import { brainstormResults } from "../../src/lib/schema.js";

/**
 * GET /api/brainstorm/:id
 *
 * Poll for brainstorm results:
 * - Returns current status (pending, completed, failed)
 * - Includes result or error when available
 * - Cleans up completed records after returning (optional)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { id } = req.query;
	const brainstormId = parseInt(id as string, 10);

	if (isNaN(brainstormId)) {
		return res.status(400).json({ error: "Invalid brainstorm ID" });
	}

	try {
		const [record] = await db
			.select()
			.from(brainstormResults)
			.where(eq(brainstormResults.id, brainstormId))
			.limit(1);

		if (!record) {
			return res.status(404).json({
				status: "not_found",
				error: "Brainstorm not found",
			});
		}

		// Return the current status
		const response: {
			status: string;
			result?: string;
			error?: string;
		} = {
			status: record.status,
		};

		if (record.status === "completed" && record.result) {
			response.result = record.result;

			// Optional: Clean up the record after successful retrieval
			// This prevents the table from growing indefinitely
			await db
				.delete(brainstormResults)
				.where(eq(brainstormResults.id, brainstormId));
		} else if (record.status === "failed" && record.error) {
			response.error = record.error;

			// Also clean up failed records
			await db
				.delete(brainstormResults)
				.where(eq(brainstormResults.id, brainstormId));
		}

		return res.status(200).json(response);
	} catch (error) {
		console.error("Failed to get brainstorm status:", error);
		return res.status(500).json({ error: "Failed to get brainstorm status" });
	}
}
