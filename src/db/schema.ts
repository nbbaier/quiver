import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ideas = sqliteTable("ideas", {
	// Primary key with auto-increment
	id: integer("id").primaryKey({ autoIncrement: true }),
	title: text("title").notNull(),
	content: text("content"),
	tags: text("tags", { mode: "json" })
		.$type<string[]>()
		.$default(() => []), // Will store: '["productivity", "app-idea"]'
	urls: text("urls", { mode: "json" })
		.$type<string[]>()
		.$default(() => []), // Will store: '["https://example.com"]'
	archived: integer("archived", { mode: "boolean" }).default(false),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

// Infer types from the schema
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
