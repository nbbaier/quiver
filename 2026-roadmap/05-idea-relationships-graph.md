# Idea Relationships & Knowledge Graph

**Category:** New Feature
**Quarter:** Q2
**T-shirt Size:** L

## Why This Matters

Ideas don't exist in isolation. The best insights often come from connecting seemingly unrelated concepts. Yet Quiver currently treats each idea as an island—no way to link ideas, see relationships, or build conceptual hierarchies.

A knowledge graph transforms Quiver from a flat list into a thinking tool. Users can trace how ideas evolved, discover unexpected connections, and build mental models visually. This is what separates note-taking from knowledge management.

## Current State

Ideas are standalone entities with no relationships:

```typescript
// src/lib/schema.ts - Current schema
export const ideas = sqliteTable("ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  urls: text("urls", { mode: "json" }).$type<string[]>(),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  // No relationships, no hierarchy, no links
});
```

**Limitations:**
- No way to link related ideas
- No parent-child hierarchies
- No visual representation of connections
- Tags are flat (no tag hierarchies)
- No "related ideas" discovery
- Can't trace idea evolution

## Proposed Future State

**Relationship System**

1. **Explicit Links**
   - Bi-directional idea links ("A relates to B")
   - Link types: "inspired by", "contradicts", "builds on", "part of"
   - Link descriptions for context
   - Backlinks display (what links to this idea)

2. **Hierarchical Structure**
   - Parent-child relationships
   - Nested ideas (idea trees)
   - Project/folder organization
   - Outline view for hierarchies

3. **Visual Graph**
   - Interactive node-link diagram
   - Zoom and pan navigation
   - Cluster detection
   - Filter by tag, date, or search
   - Force-directed layout

4. **AI-Suggested Connections**
   - Semantic similarity detection
   - "You might want to link this to..."
   - Automatic clustering by topic
   - Gap detection ("these ideas could connect through...")

**Schema Additions:**
```sql
CREATE TABLE idea_links (
  id INTEGER PRIMARY KEY,
  source_id INTEGER REFERENCES ideas(id),
  target_id INTEGER REFERENCES ideas(id),
  link_type TEXT DEFAULT 'related',
  description TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(source_id, target_id)
);

-- For hierarchies
ALTER TABLE ideas ADD COLUMN parent_id INTEGER REFERENCES ideas(id);
```

## Key Deliverables

- [ ] Design idea linking schema and migrations
- [ ] Build link creation UI (inline and modal)
- [ ] Implement backlinks display on idea cards
- [ ] Add link type taxonomy and UI
- [ ] Create graph visualization component (D3.js or similar)
- [ ] Build graph exploration page
- [ ] Implement parent-child relationships
- [ ] Add tree/outline view for hierarchies
- [ ] Create AI link suggestion feature
- [ ] Add semantic similarity detection (embeddings)
- [ ] Build "idea evolution" timeline view
- [ ] Export graph as image/JSON

## Prerequisites

- **03-evolved-ai-assistant.md**: AI features power automatic link suggestions
- **02-full-text-search-fts5.md**: Search helps find ideas to link

## Risks & Open Questions

- **Graph complexity**: How to make the graph usable with 1000+ ideas? Need good UX for filtering.
- **Visualization library**: D3.js is powerful but complex. Consider vis.js, Cytoscape, or react-flow.
- **Performance**: Graph rendering with many nodes can be slow. Need virtualization strategy.
- **Mobile experience**: Graph viz is challenging on small screens. Need alternative views.
- **Semantic similarity**: Requires embeddings and vector storage. Add to scope or defer?

## Notes

- The URL field in schema (`urls: text[]`) suggests external linking was planned—this extends the concept
- Consider Obsidian's approach: `[[wikilinks]]` syntax in content
- Graph view could be a premium feature if monetization is planned
- Force-directed layouts work well for discovery; hierarchical layouts for organization
- Could integrate with Mermaid for diagram export
