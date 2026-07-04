import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string(),
		seriesTitle: z.string().optional(),
		slug: z.string().optional(),
		series: z.string().optional(),
	}),
});


const guides = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/guides" }),
	schema: z.object({
		title: z.string(),
		series: z.string(),
		description: z.string(),
	}),
});

export const collections = { posts, guides };
