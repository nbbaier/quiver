// @ts-check

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import linkValidator from "astro-link-validator";

// https://astro.build/config
export default defineConfig({
	vite: {
		plugins: [tailwindcss()],
	},
	integrations: [linkValidator()],
});
