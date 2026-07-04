# Full-Text Search with SQLite FTS5

**Category:** Performance
**Quarter:** Q1
**T-shirt Size:** S

## Why This Matters

Search is fundamental to idea capture. Users will accumulate hundreds or thousands of ideas over time, and finding the right one quickly becomes the difference between Quiver being useful or frustrating. The current client-side string matching approach won't scale.

SQLite's FTS5 (Full-Text Search 5) is a production-ready solution that Turso fully supports. It provides sub-millisecond search across thousands of documents, relevance ranking, phrase matching, and prefix search—all without adding external dependencies or infrastructure.

## Current State

Search is implemented as client-side filtering in `useIdeas.ts`:

```typescript
// Current approach: O(n) string matching on every keystroke
const filteredIdeas = useMemo(() => {
  return ideas.filter((idea) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = idea.title.toLowerCase().includes(query);
      const matchesContent = idea.content.toLowerCase().includes(query);
      const matchesTags = idea.tags?.some((tag) =>
        tag.toLowerCase().includes(query),
      );
      // ...
    }
  });
}, [ideas, searchQuery]);
```

**Limitations:**
- Loads all ideas into memory before filtering
- No relevance ranking (newest vs most relevant)
- No phrase search ("exact phrase matching")
- No prefix search (type "prod" to find "productivity")
- No stemming ("running" won't match "run")
- Performance degrades linearly with idea count

## Proposed Future State

Server-side FTS5 search with:

**Search Features**
- Instant results (<50ms for 10k+ ideas)
- Relevance-ranked results (BM25 algorithm)
- Phrase search with quotes
- Prefix matching with wildcards
- Stemming support (optional)
- Search highlighting in results

**User Experience**
- Type-ahead suggestions
- Search history
- Saved searches
- Filter combinations (tag + search)

**Architecture**
```sql
-- FTS5 virtual table
CREATE VIRTUAL TABLE ideas_fts USING fts5(
  title,
  content,
  tags,
  content='ideas',
  content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER ideas_ai AFTER INSERT ON ideas BEGIN
  INSERT INTO ideas_fts(rowid, title, content, tags)
  VALUES (new.id, new.title, new.content, json_extract(new.tags, '$'));
END;
```

## Key Deliverables

- [ ] Create FTS5 virtual table migration
- [ ] Add sync triggers (insert, update, delete)
- [ ] Build search API endpoint with pagination
- [ ] Implement relevance scoring with BM25
- [ ] Add phrase and prefix search support
- [ ] Create search highlighting utility
- [ ] Update frontend to use server-side search
- [ ] Add search analytics (optional)
- [ ] Backfill existing ideas into FTS index
- [ ] Add search performance monitoring

## Prerequisites

None—FTS5 is built into SQLite/Turso and requires only migration work.

## Risks & Open Questions

- **Offline search**: FTS5 runs server-side. Need to maintain client-side fallback for offline mode or consider SQLite WASM for client.
- **Index size**: FTS5 adds ~10-20% storage overhead. Acceptable for idea text.
- **Sync complexity**: Triggers add complexity. Consider explicit sync instead of triggers.
- **Search UI**: Need to design intuitive search interface. Should advanced search be hidden or prominent?

## Notes

- Turso documentation confirms FTS5 support: `VIRTUAL TABLE ... USING fts5`
- Consider `porter` tokenizer for stemming, but it increases index size
- The `docs/IMPLEMENTATION_GUIDE.md` already mentions FTS5 as a planned feature
- Can reuse the existing `SearchBar` component, just wire it to API instead of local filter
- Search could later power AI features (find related ideas, semantic search)
