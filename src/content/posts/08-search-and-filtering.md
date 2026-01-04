---
title: "Part 8: Search and Filtering"
seriesTitle: "Building Quiver: An Offline-First PWA in a Weekend"
slug: "08-search-and-filtering"
series: "Quiver"
---

_This is Part 8 of a 10-part series on building Quiver. [Start with Part 1](/posts/01-the-weekend-project) if you missed it._

---

Our app captures ideas, syncs them, and even helps brainstorm. But as your collection grows from 10 ideas to 100 or 1,000, finding what you need becomes painful.

We need search and organization.

Because Quiver is offline-first with a local database, we can do something powerful: **instant, client-side search**. No network requests, no loading spinners. You type, and the results update on every keystroke.

## The Filter Component

First, let's create a visual way to filter by tags and archived status.

Create `src/components/FilterBar.tsx`. This component will show:

1. A list of all available tags (so you can click to filter)
2. A toggle for archived ideas

```tsx
interface FilterBarProps {
   allTags: string[];
   selectedTags: string[];
   onTagToggle: (tag: string) => void;
   showArchived: boolean;
   onToggleArchived: () => void;
}

export function FilterBar({
   allTags,
   selectedTags,
   onTagToggle,
   showArchived,
   onToggleArchived,
}: FilterBarProps) {
   if (allTags.length === 0) return null;

   return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
         <div className="mb-3">
            <span className="text-sm font-medium text-gray-700 mr-3">
               Filter by tag:
            </span>
            <div className="inline-flex flex-wrap gap-2 mt-2">
               {allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                     <button
                        key={tag}
                        onClick={() => onTagToggle(tag)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors
                           ${
                              isSelected
                                 ? "bg-primary text-white border-primary"
                                 : "bg-white text-gray-600 border-gray-300 hover:border-primary"
                           }`}
                     >
                        {tag}
                     </button>
                  );
               })}
            </div>
         </div>

         <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
               type="checkbox"
               checked={showArchived}
               onChange={onToggleArchived}
               className="w-4 h-4 text-primary rounded border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-gray-600">Show archived ideas</span>
         </label>
      </div>
   );
}
```

## Updating the Hook

Now we need to update `useIdeas` to handle this filtering logic. We'll use `useMemo` to keep it performant.

Update `src/hooks/useIdeas.ts`:

```typescript
// ... imports

export function useIdeas() {
   // ... existing state

   const [selectedTags, setSelectedTags] = useState<string[]>([]);
   const [showArchived, setShowArchived] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");

   // Calculate all unique tags from the idea list
   const allTags = useMemo(() => {
      const tags = new Set<string>();
      ideas.forEach((idea) => idea.tags?.forEach((t) => tags.add(t)));
      return Array.from(tags).sort();
   }, [ideas]);

   // The core filtering logic
   const filteredIdeas = useMemo(() => {
      return ideas.filter((idea) => {
         // 1. Filter by archived status
         if (!showArchived && idea.archived) return false;

         // 2. Filter by search query
         if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchTitle = idea.title.toLowerCase().includes(q);
            const matchContent = idea.content.toLowerCase().includes(q);
            if (!matchTitle && !matchContent) return false;
         }

         // 3. Filter by tags (OR logic: match ANY selected tag)
         if (selectedTags.length > 0) {
            const hasTag = selectedTags.some((tag) => idea.tags?.includes(tag));
            if (!hasTag) return false;
         }

         return true;
      });
   }, [ideas, showArchived, searchQuery, selectedTags]);

   // ... return statement
   return {
      ideas: filteredIdeas, // Return the filtered list!
      allTags,
      selectedTags,
      setSelectedTags,
      showArchived,
      setShowArchived,
      searchQuery,
      setSearchQuery,
      // ... rest of hook
   };
}
```

## The Search Bar

We need an input for the search query. While we could put this in the `FilterBar`, it's often better as a prominent header element.

We'll update `App.tsx` to include a search input that updates `setSearchQuery`.

## Performance Note

Since we are filtering on the client, this is extremely fast for up to a few thousand items. If you had 50,000 ideas, you might need a dedicated search index like **FlexSearch** or **MiniSearch**. But for personal knowledge management, a simple array filter is surprisingly robust and keeps our bundle size small.

In the next part, we'll take our finished application and deploy it to the edge.