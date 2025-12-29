import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
/**
 * The ideas table stores all captured ideas.
 */
export const ideas = sqliteTable("ideas", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	title: text("title").notNull(),
	content: text("content").notNull(),
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

// Add to your existing schema
export const brainstormResults = sqliteTable("brainstorm_results", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	ideaId: integer("idea_id").notNull(),
	status: text("status", { enum: ["pending", "completed", "failed"] })
		.notNull()
		.default("pending"),
	result: text("result"),
	error: text("error"),
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updatedAt: text("updated_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

export type BrainstormResult = typeof brainstormResults.$inferSelect;
export type NewBrainstormResult = typeof brainstormResults.$inferInsert;

export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
