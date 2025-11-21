// What an idea looks like after fetching from the database
export interface Idea {
	id: number;
	title: string;
	content: string | null;
	tags: string[]; // Parsed from JSON
	urls: string[]; // Parsed from JSON
	archived: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// What we need to create a new idea
export interface CreateIdeaInput {
	title: string;
	content?: string;
	tags?: string[];
	urls?: string[];
}

// What we can update on an existing idea
export interface UpdateIdeaInput {
	title?: string;
	content?: string;
	tags?: string[];
	urls?: string[];
	archived?: boolean;
}
