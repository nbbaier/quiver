import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ideas } from "@/db/schema";
import type { CreateIdeaInput, Idea, UpdateIdeaInput } from "@/types/idea";

// Transform a database row to our application type
function parseIdea(row: typeof ideas.$inferSelect): Idea {
	return {
		id: row.id,
		title: row.title,
		content: row.content,
		tags: row.tags ?? [],
		urls: row.urls ?? [],
		archived: row.archived ?? false,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

// GET all active ideas, newest first
export async function getIdeas(): Promise<Idea[]> {
	const rows = await db
		.select()
		.from(ideas)
		.where(eq(ideas.archived, false))
		.orderBy(desc(ideas.createdAt));

	return rows.map(parseIdea);
}

// GET a single idea by ID
export async function getIdea(id: number): Promise<Idea | null> {
	const [row] = await db.select().from(ideas).where(eq(ideas.id, id));
	return row ? parseIdea(row) : null;
}

// CREATE a new idea
export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
	const [row] = await db
		.insert(ideas)
		.values({
			title: input.title,
			content: input.content ?? null,
			tags: input.tags ?? [],
			urls: input.urls ?? [],
		})
		.returning();

	return parseIdea(row);
}

// UPDATE an existing idea
export async function updateIdea(
	id: number,
	input: UpdateIdeaInput,
): Promise<Idea | null> {
	const updateData: Record<string, unknown> = {
		updatedAt: new Date(),
	};

	// Only include fields that were actually provided
	if (input.title !== undefined) updateData.title = input.title;
	if (input.content !== undefined) updateData.content = input.content;
	if (input.tags !== undefined) updateData.tags = input.tags;
	if (input.urls !== undefined) updateData.urls = input.urls;
	if (input.archived !== undefined) updateData.archived = input.archived;

	const [row] = await db
		.update(ideas)
		.set(updateData)
		.where(eq(ideas.id, id))
		.returning();

	return row ? parseIdea(row) : null;
}

// ARCHIVE an idea (soft delete)
export async function archiveIdea(id: number): Promise<boolean> {
	const result = await db
		.update(ideas)
		.set({ archived: true, updatedAt: new Date() })
		.where(eq(ideas.id, id));

	return result.rowsAffected > 0;
}

// DELETE an idea permanently
export async function deleteIdea(id: number): Promise<boolean> {
	const result = await db.delete(ideas).where(eq(ideas.id, id));
	return result.rowsAffected > 0;
}
