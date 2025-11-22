import { createIdea, deleteIdea, getAllIdeas } from "./ideas";

async function testDatabase() {
	console.log("Testing database connection...\n");

	// Create a test idea
	console.log("Creating test idea...");
	const testIdea = await createIdea({
		title: "Test Idea",
		content: "This is a test to verify the database connection works.",
		tags: ["test"],
	});
	console.log("Created:", testIdea);

	// Read it back
	console.log("\nFetching all ideas...");
	const allIdeas = await getAllIdeas();
	console.log(`Found ${allIdeas.length} idea(s)`);

	// Clean up
	console.log("\nCleaning up test data...");
	await deleteIdea(testIdea.id);
	console.log("Test idea deleted");

	console.log("\n✓ Database connection working!");
}

testDatabase().catch(console.error);
