import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ideas = sqliteTable("ideas", {
	// Auto-incrementing ID
	id: integer("id").primaryKey({ autoIncrement: true }),

	// Core content
	title: text("title").notNull(),
	content: text("content").notNull(),

	// We store tags and URLs as JSON strings.
	// For a personal app, this denormalization simplifies queries immensely.
	urls: text("urls", { mode: "json" }).$type<string[]>().default([]),
	tags: text("tags", { mode: "json" }).$type<string[]>().default([]),

	// Timestamps
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),

	// Soft delete
	archived: integer("archived", { mode: "boolean" }).default(false),
});

// Inference magic
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
