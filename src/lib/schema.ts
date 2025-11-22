import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
/**
 * The ideas table stores all captured ideas.
 */
export const ideas = sqliteTable("ideas", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	title: text("title").notNull(),
	content: text("content").notNull().default(""), // Default empty string to avoid null values
	urls: text("urls", { mode: "json" }).$type<string[]>().default([]),
	tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	archived: integer("archived", { mode: "boolean" }).default(false),
});

// Inference magic
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
