import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { type Idea, ideas, type NewIdea } from "./schema";

export async function getAllIdeas(): Promise<Idea[]> {
	return db.select().from(ideas).orderBy(desc(ideas.createdAt));
}

export async function createIdea(data: NewIdea): Promise<Idea> {
	const [created] = await db.insert(ideas).values(data).returning();
	return created;
}

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

export async function deleteIdea(id: number): Promise<void> {
	await db.delete(ideas).where(eq(ideas.id, id));
}

export async function archiveIdea(id: number): Promise<Idea | undefined> {
	return updateIdea(id, { archived: true });
}
