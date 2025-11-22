import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { type Idea, ideas, type NewIdea } from "./schema";

/**
 * Fetch all ideas, newest first.
 */
export async function getAllIdeas(): Promise<Idea[]> {
	return db.select().from(ideas).orderBy(desc(ideas.createdAt));
}

/**
 * Fetch a single idea by ID.
 * Returns undefined if not found.
 */
export async function getIdea(id: number): Promise<Idea | undefined> {
	const results = await db.select().from(ideas).where(eq(ideas.id, id));
	return results[0];
}

/**
 * Create a new idea.
 * Returns the created idea with its generated ID.
 */
export async function createIdea(data: NewIdea): Promise<Idea> {
	const [created] = await db.insert(ideas).values(data).returning(); // Returns the inserted row
	return created;
}

/**
 * Update an existing idea.
 * Automatically updates the updatedAt timestamp.
 */
export async function updateIdea(
	id: number,
	data: Partial<NewIdea>,
): Promise<Idea | undefined> {
	const [updated] = await db
		.update(ideas)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(ideas.id, id))
		.returning();
	return updated;
}

/**
 * Permanently delete an idea.
 * Consider using archiveIdea for soft delete instead.
 */
export async function deleteIdea(id: number): Promise<void> {
	await db.delete(ideas).where(eq(ideas.id, id));
}

/**
 * Archive an idea (soft delete).
 * Archived ideas can be restored; deleted ones cannot.
 */
export async function archiveIdea(id: number): Promise<Idea | undefined> {
	return updateIdea(id, { archived: true });
}
