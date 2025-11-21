import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { CreateIdeaInput, Idea } from "@/types/idea";

// Define the database schema
interface QuiverDB extends DBSchema {
	ideas: {
		key: number;
		value: Idea;
		indexes: { "by-created": Date };
	};
	pendingActions: {
		key: number;
		value: {
			id: number;
			type: "create" | "update" | "delete";
			data: CreateIdeaInput | Partial<Idea> | number;
			timestamp: Date;
		};
	};
}

// Singleton database connection
let dbPromise: Promise<IDBPDatabase<QuiverDB>> | null = null;

function getDB() {
	if (!dbPromise) {
		dbPromise = openDB<QuiverDB>("quiver-db", 1, {
			upgrade(db) {
				// Create ideas store with an index on createdAt
				const ideasStore = db.createObjectStore("ideas", { keyPath: "id" });
				ideasStore.createIndex("by-created", "createdAt");

				// Create pending actions store with auto-increment key
				db.createObjectStore("pendingActions", {
					keyPath: "id",
					autoIncrement: true,
				});
			},
		});
	}
	return dbPromise;
}

// Cache multiple ideas at once
export async function cacheIdeas(ideas: Idea[]): Promise<void> {
	const db = await getDB();
	const tx = db.transaction("ideas", "readwrite");
	await Promise.all([...ideas.map((idea) => tx.store.put(idea)), tx.done]);
}

// Get all cached ideas, sorted by creation date
export async function getCachedIdeas(): Promise<Idea[]> {
	const db = await getDB();
	const ideas = await db.getAllFromIndex("ideas", "by-created");
	return ideas.reverse(); // Newest first
}

// Cache a single idea
export async function cacheIdea(idea: Idea): Promise<void> {
	const db = await getDB();
	await db.put("ideas", idea);
}

// Remove a cached idea
export async function removeCachedIdea(id: number): Promise<void> {
	const db = await getDB();
	await db.delete("ideas", id);
}

// Queue an action for later sync
export async function queueAction(
	type: "create" | "update" | "delete",
	data: CreateIdeaInput | Partial<Idea> | number,
): Promise<void> {
	const db = await getDB();
	await db.add("pendingActions", {
		id: Date.now(),
		type,
		data,
		timestamp: new Date(),
	});
}

// Get all pending actions
export async function getPendingActions() {
	const db = await getDB();
	return db.getAll("pendingActions");
}

// Clear a specific pending action after sync
export async function clearPendingAction(id: number): Promise<void> {
	const db = await getDB();
	await db.delete("pendingActions", id);
}

// Clear all pending actions
export async function clearAllPendingActions(): Promise<void> {
	const db = await getDB();
	await db.clear("pendingActions");
}
