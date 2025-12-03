import { Inngest } from "inngest";

export const inngest = new Inngest({
	id: "quiver",
	env: process.env.BRANCH,
});

/**
 * Type definitions for events.
 */
export type Events = {
	"idea/brainstorm": {
		data: {
			brainstormId: number;
			ideaId: number;
			title: string;
			content: string;
			context?: string;
		};
	};
	"idea/brainstorm.completed": {
		data: {
			ideaId: number;
			result: string;
		};
	};
	"idea/brainstorm.failed": {
		data: {
			ideaId: number;
			error: string;
		};
	};
};
