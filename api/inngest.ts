import { serve } from "inngest/next";
import { inngest } from "../src/lib/inngest.js";
import { functions } from "../src/lib/inngest-functions.js";

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions,
});
