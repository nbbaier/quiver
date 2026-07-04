---
title: "Part 3: The CRUD Interface"
seriesTitle: "Building Quiver: An Offline-First PWA in a Weekend"
slug: "03-crud-interface"
series: "Quiver"
---

_This is Part 3 of a 10-part series on building Quiver. [Start with Part 1](/posts/01-the-weekend-project) if you missed it._

---

We have a database. We have a schema. Now we need a way for humans to interact with it.

In this part, we'll build the core user interface for Quiver. We'll use React hooks to manage state and Tailwind CSS v4 for styling.

## The State Management Hook

React development is often cleaner when you separate data fetching logic from UI rendering. We'll create a custom hook `useIdeas` that handles all our database interactions.

For now, this hook connects directly to the remote Turso database. Later, we'll rewrite this to talk to our local IndexedDB cache for offline support. The beauty of this pattern is that our UI components won't care about that change—the API remains the same.

Create `src/hooks/useIdeas.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import type { Idea } from "../lib/schema";
import * as ideaApi from "../lib/ideas";

export function useIdeas() {
   const [ideas, setIdeas] = useState<Idea[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<Error | null>(null);

   // Fetch all ideas
   const fetchIdeas = useCallback(async () => {
      try {
         setLoading(true);
         const data = await ideaApi.getAllIdeas();
         setIdeas(data);
      } catch (err) {
         setError(err instanceof Error ? err : new Error("Failed to fetch"));
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      fetchIdeas();
   }, [fetchIdeas]);

   // Create an idea (Optimistic UI update could go here, but we'll wait for server for now)
   const createIdea = async (
      title: string,
      content: string,
      tags: string[] = []
   ) => {
      const newIdea = await ideaApi.createIdea({ title, content, tags });
      setIdeas((prev) => [newIdea, ...prev]);
      return newIdea;
   };

   // Delete an idea
   const deleteIdea = async (id: number) => {
      await ideaApi.deleteIdea(id);
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
   };

   return { ideas, loading, error, createIdea, deleteIdea };
}
```

## Building Components with Tailwind v4

Tailwind v4 doesn't change how you write class names, but it works seamlessly with our setup.

### The Input Form

Create `src/components/IdeaForm.tsx`. We want a clean, distraction-free input area.

```tsx
import { useState, FormEvent } from "react";

interface IdeaFormProps {
   onSubmit: (title: string, content: string) => Promise<void>;
}

export function IdeaForm({ onSubmit }: IdeaFormProps) {
   const [title, setTitle] = useState("");
   const [content, setContent] = useState("");
   const [submitting, setSubmitting] = useState(false);

   const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !content.trim()) return;

      setSubmitting(true);
      await onSubmit(title, content);
      setTitle("");
      setContent("");
      setSubmitting(false);
   };

   return (
      <form onSubmit={handleSubmit} className="space-y-4">
         <div>
            <input
               type="text"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               placeholder="What's your idea?"
               className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     transition-colors"
            />
         </div>
         <div>
            <textarea
               value={content}
               onChange={(e) => setContent(e.target.value)}
               placeholder="Describe it..."
               rows={4}
               className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     transition-colors"
            />
         </div>
         <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg
                   hover:bg-primary-hover disabled:opacity-50 transition-colors"
         >
            {submitting ? "Saving..." : "Save Idea"}
         </button>
      </form>
   );
}
```

### The Idea Card

Create `src/components/IdeaCard.tsx` to display individual items.

```tsx
import type { Idea } from "../lib/schema";

interface IdeaCardProps {
   idea: Idea;
   onDelete: (id: number) => void;
}

export function IdeaCard({ idea, onDelete }: IdeaCardProps) {
   return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
         <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
               {idea.title}
            </h3>
            <button
               onClick={() => onDelete(idea.id)}
               className="text-gray-400 hover:text-danger transition-colors"
               aria-label="Delete idea"
            >
               <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
               >
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
               </svg>
            </button>
         </div>
         <p className="text-gray-600 whitespace-pre-wrap mb-4">
            {idea.content}
         </p>
         <div className="text-xs text-gray-400">
            {new Date(idea.createdAt).toLocaleDateString()}
         </div>
      </div>
   );
}
```

## Putting It All Together

Update `src/App.tsx` to use our hook and components:

```tsx
import { useIdeas } from "./hooks/useIdeas";
import { IdeaForm } from "./components/IdeaForm";
import { IdeaCard } from "./components/IdeaCard";

function App() {
   const { ideas, loading, createIdea, deleteIdea } = useIdeas();

   return (
      <div className="min-h-screen bg-gray-50 pb-16">
         <div className="mx-auto max-w-3xl px-4 py-8">
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
            </header>

            <div className="space-y-8">
               <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <IdeaForm onSubmit={createIdea} />
               </section>

               <section className="space-y-4">
                  {loading ? (
                     <p className="text-center text-gray-500">
                        Loading ideas...
                     </p>
                  ) : ideas.length === 0 ? (
                     <p className="text-center text-gray-500">
                        No ideas yet. Add one above!
                     </p>
                  ) : (
                     ideas.map((idea) => (
                        <IdeaCard
                           key={idea.id}
                           idea={idea}
                           onDelete={deleteIdea}
                        />
                     ))
                  )}
               </section>
            </div>
         </div>
      </div>
   );
}

export default App;
```

## We Have an App!

If you run `bun run dev`, you can now add ideas, see them appear in the list, and delete them. This data persists to your Turso database.

But try this: turn off your WiFi and refresh the page.

**It breaks.**

In the modern web, that's not good enough. In Part 4, we'll turn this standard web app into a Progressive Web App that can be installed and run offline.