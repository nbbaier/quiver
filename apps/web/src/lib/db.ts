import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

const dbUrl =
	(typeof process !== "undefined" && process.env?.VITE_TURSO_DATABASE_URL) ||
	(typeof import.meta !== "undefined" &&
		import.meta.env?.VITE_TURSO_DATABASE_URL) ||
	undefined;
const dbToken =
	(typeof process !== "undefined" && process.env?.VITE_TURSO_AUTH_TOKEN) ||
	(typeof import.meta !== "undefined" &&
		import.meta.env?.VITE_TURSO_AUTH_TOKEN) ||
	undefined;

if (!dbUrl || !dbToken) {
	throw new Error(
		"VITE_TURSO_DATABASE_URL and VITE_TURSO_AUTH_TOKEN must be set",
	);
}

const client = createClient({
	url: dbUrl,
	authToken: dbToken,
});

export const db = drizzle(client, { schema });
