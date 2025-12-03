## Milestone 3: Basic CRUD UI

**Goal:** Build a working interface to create, read, update, and delete ideas.

**Why this matters:** This milestone connects your database to a real UI. By the end, you'll have a functional (if minimal) app that persists data. This is the core of your application—everything else (offline support, AI, search) builds on this foundation.

### Step 3.1: Create a Custom Hook for Ideas

React hooks let you extract stateful logic into reusable functions. We'll create a hook that manages our ideas state and provides functions to modify it.

Create `src/hooks/useIdeas.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import type { Idea } from "../lib/schema";
import * as ideaApi from "../lib/ideas";

/**
 * Custom hook for managing ideas state.
 *
 * Why a custom hook?
 * - Encapsulates all idea-related state and logic
 * - Can be reused across components
 * - Separates data logic from UI logic
 * - Makes testing easier (you can test the hook independently)
 */
export function useIdeas() {
   // State for the list of ideas
   const [ideas, setIdeas] = useState<Idea[]>([]);

   // Loading state for showing skeletons/spinners
   const [loading, setLoading] = useState(true);

   // Error state for displaying error messages
   const [error, setError] = useState<Error | null>(null);

   /**
    * Fetch all ideas from the database.
    * useCallback ensures this function's identity is stable,
    * which prevents unnecessary re-renders.
    */
   const fetchIdeas = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);
         const data = await ideaApi.getAllIdeas();
         setIdeas(data);
      } catch (err) {
         setError(
            err instanceof Error ? err : new Error("Failed to fetch ideas")
         );
      } finally {
         setLoading(false);
      }
   }, []);

   // Fetch ideas on mount
   useEffect(() => {
      fetchIdeas();
   }, [fetchIdeas]);

   /**
    * Create a new idea and add it to state.
    * We optimistically add to state after the API call succeeds.
    */
   const createIdea = async (
      title: string,
      content: string,
      tags: string[] = []
   ) => {
      const newIdea = await ideaApi.createIdea({ title, content, tags });
      // Add to beginning of array (newest first)
      setIdeas((prev) => [newIdea, ...prev]);
      return newIdea;
   };

   /**
    * Delete an idea and remove from state.
    */
   const deleteIdea = async (id: number) => {
      await ideaApi.deleteIdea(id);
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
   };

   /**
    * Archive an idea and update state.
    */
   const archiveIdea = async (id: number) => {
      const updated = await ideaApi.archiveIdea(id);
      if (updated) {
         setIdeas((prev) =>
            prev.map((idea) => (idea.id === id ? updated : idea))
         );
      }
      return updated;
   };

   return {
      ideas,
      loading,
      error,
      createIdea,
      deleteIdea,
      archiveIdea,
      refetch: fetchIdeas,
   };
}
```

**Understanding the hook pattern:**

This hook follows a common pattern:

1. **State** — `useState` holds the data
2. **Effect** — `useEffect` fetches data on mount
3. **Actions** — Functions that modify state and call the API
4. **Return** — Expose everything consumers need

The consumer (our App component) doesn't know or care about the implementation—it just gets `ideas`, `loading`, `error`, and functions to call.

### Step 3.2: Create the IdeaForm Component

Create `src/components/IdeaForm.tsx`:

```tsx
import { useState, FormEvent } from "react";

interface IdeaFormProps {
   onSubmit: (title: string, content: string) => Promise<void>;
}

/**
 * Form for capturing new ideas.
 *
 * Design decisions:
 * - Controlled inputs (React manages the input state)
 * - Disabled during submission to prevent double-submit
 * - Clears after successful submission
 */
export function IdeaForm({ onSubmit }: IdeaFormProps) {
   const [title, setTitle] = useState("");
   const [content, setContent] = useState("");
   const [submitting, setSubmitting] = useState(false);

   const handleSubmit = async (e: FormEvent) => {
      // Prevent default form submission (page reload)
      e.preventDefault();

      // Validate
      if (!title.trim() || !content.trim()) return;

      setSubmitting(true);
      try {
         await onSubmit(title.trim(), content.trim());
         // Clear form on success
         setTitle("");
         setContent("");
      } finally {
         setSubmitting(false);
      }
   };

   const isValid = title.trim() && content.trim();

   return (
      <form onSubmit={handleSubmit} className="space-y-4">
         {/* Title input */}
         <div>
            <label
               htmlFor="title"
               className="block text-sm font-medium text-gray-700 mb-1"
            >
               Title
            </label>
            <input
               id="title"
               type="text"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               placeholder="What's your idea?"
               disabled={submitting}
               required
               className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     transition-colors"
            />
         </div>

         {/* Content textarea */}
         <div>
            <label
               htmlFor="content"
               className="block text-sm font-medium text-gray-700 mb-1"
            >
               Details
            </label>
            <textarea
               id="content"
               value={content}
               onChange={(e) => setContent(e.target.value)}
               placeholder="Describe your idea in detail..."
               rows={4}
               disabled={submitting}
               required
               className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     transition-colors"
            />
         </div>

         {/* Submit button */}
         <button
            type="submit"
            disabled={submitting || !isValid}
            className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg
                   hover:bg-primary-hover
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
         >
            {submitting ? "Saving..." : "Save Idea"}
         </button>
      </form>
   );
}
```

**Understanding the Tailwind classes:**

Let's break down the input styling:

-  `w-full` — Width 100%
-  `px-4 py-3` — Padding: 1rem horizontal, 0.75rem vertical
-  `border border-gray-300` — 1px border in gray
-  `rounded-lg` — Border radius of 0.5rem (8px)
-  `focus:outline-none` — Remove default browser outline
-  `focus:ring-2` — Add a 2px ring on focus
-  `focus:ring-primary` — Ring color is our custom primary color
-  `focus:border-transparent` — Hide border when ring is showing
-  `disabled:bg-gray-100` — Gray background when disabled
-  `transition-colors` — Smooth color transitions

The `space-y-4` on the form adds `margin-top: 1rem` to all children except the first—a quick way to space out form fields.

### Step 3.3: Create the IdeaCard Component

Create `src/components/IdeaCard.tsx`:

```tsx
import type { Idea } from "../lib/schema";

interface IdeaCardProps {
   idea: Idea;
   onDelete: (id: number) => Promise<void>;
   onArchive: (id: number) => Promise<void>;
}

/**
 * Displays a single idea with actions.
 *
 * This is a "presentational" component—it receives data and callbacks
 * as props and doesn't manage any state itself.
 */
export function IdeaCard({ idea, onDelete, onArchive }: IdeaCardProps) {
   // Format the date in a human-readable way
   const formattedDate = new Date(idea.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
   });

   return (
      <article
         className={`bg-white rounded-lg shadow-sm border border-gray-200 p-5
                  ${idea.archived ? "opacity-60" : ""}`}
      >
         {/* Header: title and date */}
         <header className="flex justify-between items-start gap-4 mb-3">
            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
               {idea.title}
            </h3>
            <time
               dateTime={idea.createdAt.toISOString()}
               className="text-sm text-gray-500 whitespace-nowrap"
            >
               {formattedDate}
            </time>
         </header>

         {/* Content */}
         <p className="text-gray-600 mb-4 whitespace-pre-wrap">
            {idea.content}
         </p>

         {/* Tags */}
         {idea.tags && idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
               {idea.tags.map((tag) => (
                  <span
                     key={tag}
                     className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-600
                         text-xs font-medium rounded-full"
                  >
                     {tag}
                  </span>
               ))}
            </div>
         )}

         {/* Actions */}
         <footer className="flex justify-end gap-2">
            {!idea.archived && (
               <button
                  onClick={() => onArchive(idea.id)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600
                       bg-gray-100 rounded-md
                       hover:bg-gray-200 transition-colors"
               >
                  Archive
               </button>
            )}
            <button
               onClick={() => onDelete(idea.id)}
               className="px-3 py-1.5 text-sm font-medium text-red-600
                     bg-red-50 rounded-md
                     hover:bg-red-100 transition-colors"
            >
               Delete
            </button>
         </footer>
      </article>
   );
}
```

**Semantic HTML note:** We're using `<article>`, `<header>`, `<footer>`, and `<time>` elements. These semantic elements:

-  Improve accessibility (screen readers understand the structure)
-  Help with SEO (search engines understand the content)
-  Make the code more readable

### Step 3.4: Create the IdeaList Component

Create `src/components/IdeaList.tsx`:

```tsx
import type { Idea } from "../lib/schema";
import { IdeaCard } from "./IdeaCard";

interface IdeaListProps {
   ideas: Idea[];
   loading: boolean;
   error: Error | null;
   onDelete: (id: number) => Promise<void>;
   onArchive: (id: number) => Promise<void>;
}

/**
 * Displays a list of ideas with loading and error states.
 *
 * This component handles three states:
 * 1. Loading — Show a loading message
 * 2. Error — Show the error message
 * 3. Empty — Show a helpful message
 * 4. Has data — Show the ideas
 */
export function IdeaList({
   ideas,
   loading,
   error,
   onDelete,
   onArchive,
}: IdeaListProps) {
   // Loading state
   if (loading) {
      return (
         <div className="text-center py-12 text-gray-500">Loading ideas...</div>
      );
   }

   // Error state
   if (error) {
      return (
         <div className="text-center py-12 text-red-600">
            Error: {error.message}
         </div>
      );
   }

   // Empty state
   if (ideas.length === 0) {
      return (
         <div className="text-center py-12 text-gray-500">
            <p>No ideas yet.</p>
            <p className="mt-1">Create your first one above!</p>
         </div>
      );
   }

   // Separate active and archived ideas
   const activeIdeas = ideas.filter((idea) => !idea.archived);
   const archivedIdeas = ideas.filter((idea) => idea.archived);

   return (
      <div className="space-y-6">
         {/* Active ideas */}
         {activeIdeas.length > 0 && (
            <section>
               <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Ideas ({activeIdeas.length})
               </h2>
               <div className="space-y-4">
                  {activeIdeas.map((idea) => (
                     <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onDelete={onDelete}
                        onArchive={onArchive}
                     />
                  ))}
               </div>
            </section>
         )}

         {/* Archived ideas */}
         {archivedIdeas.length > 0 && (
            <section>
               <h2 className="text-lg font-semibold text-gray-500 mb-4">
                  Archived ({archivedIdeas.length})
               </h2>
               <div className="space-y-4">
                  {archivedIdeas.map((idea) => (
                     <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onDelete={onDelete}
                        onArchive={onArchive}
                     />
                  ))}
               </div>
            </section>
         )}
      </div>
   );
}
```

**Why separate active and archived?** Users primarily want to see their active ideas. Archived ideas are "done" or "not relevant right now" but shouldn't be deleted. Separating them visually makes the interface cleaner.

### Step 3.5: Wire Everything Together in App.tsx

Replace `src/App.tsx`:

```tsx
import { useIdeas } from "./hooks/useIdeas";
import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";

function App() {
   const { ideas, loading, error, createIdea, deleteIdea, archiveIdea } =
      useIdeas();

   const handleCreateIdea = async (title: string, content: string) => {
      await createIdea(title, content);
   };

   return (
      <div className="min-h-screen bg-gray-50">
         <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
            </header>

            <main className="space-y-8">
               {/* Idea capture form */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                     New Idea
                  </h2>
                  <IdeaForm onSubmit={handleCreateIdea} />
               </section>

               {/* Ideas list */}
               <section>
                  <IdeaList
                     ideas={ideas}
                     loading={loading}
                     error={error}
                     onDelete={deleteIdea}
                     onArchive={archiveIdea}
                  />
               </section>
            </main>
         </div>
      </div>
   );
}

export default App;
```

**Component composition:** Notice how `App` doesn't know anything about:

-  How ideas are fetched (that's in `useIdeas`)
-  How the form handles input (that's in `IdeaForm`)
-  How individual ideas look (that's in `IdeaCard`)

Each piece has a single responsibility. This makes the code easier to understand, test, and modify.

### Step 3.6: Test the CRUD Functionality

```bash
bun run dev
```

**Checkpoint — Test each operation:**

1. **Create:** Fill out the form with a title and content. Click "Save Idea".

   -  ✓ The idea should appear in the list immediately
   -  ✓ The form should clear

2. **Read:** Refresh the page.

   -  ✓ Your saved ideas should still be there (loaded from Turso)

3. **Archive:** Click "Archive" on an idea.

   -  ✓ It should move to the "Archived" section with reduced opacity

4. **Delete:** Click "Delete" on an idea.

   -  ✓ It should disappear from the list

5. **Create multiple:** Add 3-4 ideas with different content
   -  ✓ Newest should appear at the top
   -  ✓ All should persist after refresh

**Milestone 3 Complete!** You now have a working CRUD application:

-  Form to capture ideas
-  List displaying all ideas
-  Archive and delete functionality
-  Data persists in your Turso database

The app is functional but not yet offline-capable. That's next.

---
