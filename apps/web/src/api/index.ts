import { serve } from "@hono/node-server";
import app from "./server";

const port = 3001;

console.log(`API server running at http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
