import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const dbUrl = import.meta.env.VITE_TURSO_DATABASE_URL;
const dbToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

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
