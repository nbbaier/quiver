import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const tursoUrl =
	import.meta.env.VITE_TURSO_DATABASE_URL ||
	(typeof process !== "undefined" ? process.env.TURSO_DATABASE_URL : undefined);

const tursoAuthToken =
	import.meta.env.VITE_TURSO_AUTH_TOKEN ||
	(typeof process !== "undefined" ? process.env.TURSO_AUTH_TOKEN : undefined);

if (!tursoUrl) {
	throw new Error("TURSO_DATABASE_URL is not set");
}

const client = createClient({
	url: tursoUrl,
	authToken: tursoAuthToken,
});

export const db = drizzle(client, { schema });
