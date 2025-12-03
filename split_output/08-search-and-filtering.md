## Milestone 9: Search

**Goal:** Add full-text search across idea titles and content.

**Why this matters:** Tags are great for categorical filtering, but sometimes you remember a word or phrase from an idea, not its tags. Search provides:

1. **Quick access** — Find ideas by any word they contain
2. **Discovery** — Surface forgotten ideas when searching for related concepts
3. **Flexibility** — Works alongside tag filtering

We're implementing client-side search because:

-  Data is already loaded (we have offline-first architecture)
-  No server round-trip needed
-  Works offline
-  Fast enough for hundreds of ideas

For thousands of ideas, you'd want server-side full-text search (SQLite FTS5).

### Step 9.1: Create the SearchBar Component

Create `src/components/SearchBar.tsx`:

```tsx
import { useState, useEffect, useRef } from "react";

interface SearchBarProps {
   onSearch: (query: string) => void;
   placeholder?: string;
}

/**
 * Search input with debouncing.
 *
 * Why debounce?
 * - Prevents filtering on every keystroke (which can feel laggy)
 * - Waits for user to pause typing, then filters
 * - 300ms is a good balance between responsiveness and performance
 */
export function SearchBar({
   onSearch,
   placeholder = "Search ideas...",
}: SearchBarProps) {
   const [query, setQuery] = useState("");
   const debounceRef = useRef<ReturnType<typeof setTimeout>>();

   // Debounce search
   useEffect(() => {
      // Clear any existing timeout
      if (debounceRef.current) {
         clearTimeout(debounceRef.current);
      }

      // Set new timeout
      debounceRef.current = setTimeout(() => {
         onSearch(query);
      }, 300);

      // Cleanup on unmount
      return () => {
         if (debounceRef.current) {
            clearTimeout(debounceRef.current);
         }
      };
   }, [query, onSearch]);

   return (
      <div className="relative">
         {/* Search icon */}
         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
               className="h-5 w-5 text-gray-400"
               fill="none"
               stroke="currentColor"
               viewBox="0 0 24 24"
            >
               <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
               />
            </svg>
         </div>

         {/* Input */}
         <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg
                   bg-white shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                   transition-colors"
            aria-label="Search ideas"
         />

         {/* Clear button */}
         {query && (
            <button
               onClick={() => setQuery("")}
               className="absolute inset-y-0 right-0 pr-3 flex items-center
                     text-gray-400 hover:text-gray-600"
               aria-label="Clear search"
            >
               <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
               >
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     strokeWidth={2}
                     d="M6 18L18 6M6 6l12 12"
                  />
               </svg>
            </button>
         )}
      </div>
   );
}
```

**Understanding debouncing:**

Without debouncing, if a user types "project", we'd search for:

-  "p"
-  "pr"
-  "pro"
-  "proj"
-  "proje"
-  "projec"
-  "project"

That's 7 searches for one word! With debouncing, we wait 300ms after the user stops typing, then search once for "project".

### Step 9.2: Update useIdeas with Search

Update `src/hooks/useIdeas.ts` to add search:

```typescript
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Idea } from "../lib/schema";
import * as sync from "../lib/sync";

export function useIdeas() {
   const [ideas, setIdeas] = useState<Idea[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<Error | null>(null);
   const [syncing, setSyncing] = useState(false);

   // Filter state
   const [selectedTags, setSelectedTags] = useState<string[]>([]);
   const [showArchived, setShowArchived] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");

   const fetchIdeas = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);
         const data = await sync.fetchAndCacheIdeas();
         setIdeas(data);
      } catch (err) {
         setError(
            err instanceof Error ? err : new Error("Failed to fetch ideas")
         );
      } finally {
         setLoading(false);
      }
   }, []);

   const syncChanges = useCallback(async () => {
      if (syncing) return;
      setSyncing(true);
      try {
         const result = await sync.syncToRemote();
         if (result.success && result.synced > 0) {
            await fetchIdeas();
         }
      } finally {
         setSyncing(false);
      }
   }, [syncing, fetchIdeas]);

   useEffect(() => {
      fetchIdeas();
   }, [fetchIdeas]);

   useEffect(() => {
      const handleOnline = () => syncChanges();
      window.addEventListener("online", handleOnline);
      return () => window.removeEventListener("online", handleOnline);
   }, [syncChanges]);

   // Extract all unique tags
   const allTags = useMemo(() => {
      const tagSet = new Set<string>();
      ideas.forEach((idea) => {
         idea.tags?.forEach((tag) => tagSet.add(tag));
      });
      return Array.from(tagSet).sort();
   }, [ideas]);

   /**
    * Filter ideas based on search, tags, and archived state.
    *
    * Search looks at:
    * - Title (case-insensitive)
    * - Content (case-insensitive)
    * - Tags (case-insensitive)
    */
   const filteredIdeas = useMemo(() => {
      return ideas.filter((idea) => {
         // Filter by archived state
         if (!showArchived && idea.archived) return false;

         // Filter by search query
         if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesTitle = idea.title.toLowerCase().includes(query);
            const matchesContent = idea.content.toLowerCase().includes(query);
            const matchesTags = idea.tags?.some((tag) =>
               tag.toLowerCase().includes(query)
            );

            if (!matchesTitle && !matchesContent && !matchesTags) {
               return false;
            }
         }

         // Filter by tags (OR logic)
         if (selectedTags.length > 0) {
            const ideaTags = idea.tags || [];
            const hasSelectedTag = selectedTags.some((tag) =>
               ideaTags.includes(tag)
            );
            if (!hasSelectedTag) return false;
         }

         return true;
      });
   }, [ideas, selectedTags, showArchived, searchQuery]);

   const toggleTag = (tag: string) => {
      setSelectedTags((prev) =>
         prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      );
   };

   const createIdea = async (
      title: string,
      content: string,
      tags: string[] = []
   ) => {
      const newIdea = await sync.createIdeaOfflineFirst({
         title,
         content,
         tags,
      });
      setIdeas((prev) => [newIdea, ...prev]);
      return newIdea;
   };

   const deleteIdea = async (id: number) => {
      await sync.deleteIdeaOfflineFirst(id);
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
   };

   const archiveIdea = async (id: number) => {
      const updated = await sync.archiveIdeaOfflineFirst(id);
      if (updated) {
         setIdeas((prev) =>
            prev.map((idea) => (idea.id === id ? updated : idea))
         );
      }
      return updated;
   };

   return {
      ideas: filteredIdeas,
      allIdeas: ideas,
      loading,
      error,
      syncing,

      // Search
      searchQuery,
      setSearchQuery,

      // Tag filter
      allTags,
      selectedTags,
      toggleTag,

      // Archived filter
      showArchived,
      toggleArchived: () => setShowArchived((prev) => !prev),

      // Actions
      createIdea,
      deleteIdea,
      archiveIdea,
      refetch: fetchIdeas,
      sync: syncChanges,
   };
}
```

### Step 9.3: Add SearchBar to App.tsx

Update `src/App.tsx`:

```tsx
import { useIdeas } from "./hooks/useIdeas";
import { IdeaForm } from "./components/IdeaForm";
import { IdeaList } from "./components/IdeaList";
import { FilterBar } from "./components/FilterBar";
import { SearchBar } from "./components/SearchBar";
import { OfflineIndicator } from "./components/OfflineIndicator";

function App() {
   const {
      ideas,
      loading,
      error,
      syncing,
      searchQuery,
      setSearchQuery,
      allTags,
      selectedTags,
      toggleTag,
      showArchived,
      toggleArchived,
      createIdea,
      deleteIdea,
      archiveIdea,
   } = useIdeas();

   const handleCreateIdea = async (
      title: string,
      content: string,
      tags: string[]
   ) => {
      await createIdea(title, content, tags);
   };

   return (
      <div className="min-h-screen bg-gray-50 pb-16">
         <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <header className="mb-8 text-center">
               <h1 className="text-4xl font-bold text-gray-900">Quiver</h1>
               <p className="mt-2 text-gray-600">Capture ideas anywhere.</p>
               {syncing && (
                  <p className="mt-1 text-sm text-primary animate-pulse">
                     Syncing...
                  </p>
               )}
            </header>

            <main className="space-y-6">
               {/* Idea capture form */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                     New Idea
                  </h2>
                  <IdeaForm onSubmit={handleCreateIdea} />
               </section>

               {/* Search */}
               <SearchBar
                  onSearch={setSearchQuery}
                  placeholder="Search ideas by title, content, or tag..."
               />

               {/* Filter bar */}
               <FilterBar
                  allTags={allTags}
                  selectedTags={selectedTags}
                  onTagToggle={toggleTag}
                  showArchived={showArchived}
                  onToggleArchived={toggleArchived}
               />

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

         <OfflineIndicator />
      </div>
   );
}

export default App;
```

### Step 9.4: Test Search

```bash
bun run dev
```

**Checkpoint — Test search functionality:**

1. Create several ideas with different words
2. Type part of a title in the search bar
3. ✓ Only matching ideas should appear
4. Type part of an idea's content
5. ✓ Ideas with that content should appear
6. Type a tag name
7. ✓ Ideas with that tag should appear
8. Clear the search
9. ✓ All ideas should reappear

**Checkpoint — Test search + filters combined:**

1. Search for a word
2. Also click a tag filter
3. ✓ Results should match BOTH search AND tag
4. Clear search, keep tag filter
5. ✓ Results should only be filtered by tag

**Milestone 9 Complete!** Your app now has search:

-  Type to search across titles, content, and tags
-  Debounced for smooth performance
-  Works alongside tag and archived filters
-  Works offline (searches local cache)

---
