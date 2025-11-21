import { eq } from "drizzle-orm";
import { db } from "./index";
import { ideas } from "./schema";

async function testConnection() {
	console.log("Testing database connection...\n");

	// CREATE
	const [newIdea] = await db
		.insert(ideas)
		.values({
			title: "Test Idea",
			content: "This is a test to verify the database works!",
		})
		.returning();

	console.log("Created idea:", newIdea);
	console.log("Notice the auto-generated id and timestamps\n");

	// READ
	const allIdeas = await db.select().from(ideas);
	console.log("All ideas in database:", allIdeas);
	console.log(`Found ${allIdeas.length} idea(s)\n`);

	// DELETE (cleanup)
	await db.delete(ideas).where(eq(ideas.id, newIdea.id));
	console.log("Cleaned up test data\n");

	console.log("=".repeat(40));
	console.log("SUCCESS! Database connection verified.");
	console.log("=".repeat(40));
}

testConnection().catch(console.error);
