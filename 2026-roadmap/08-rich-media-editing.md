# Rich Text & Media Support

**Category:** DX Improvement
**Quarter:** Q2
**T-shirt Size:** M

## Why This Matters

Ideas aren't just plain text. They contain code snippets, diagrams, images, links, and structured lists. The current plain textarea limits expression and forces users to capture ideas in a degraded format, then enhance them elsewhere.

Rich text editing elevates Quiver from a scratchpad to a proper thinking environment. Users can format their ideas naturally, embed visual references, and create structured documents—all within the capture flow rather than as a post-processing step.

## Current State

The idea form uses a basic textarea:

```typescript
// src/components/IdeaForm.tsx
<textarea
  id="content"
  value={content}
  onChange={(e) => setContent(e.target.value)}
  placeholder="Describe your idea in detail..."
  rows={4}
  className="w-full px-4 py-3 ..."
/>
```

The content is stored and displayed as plain text with `whitespace-pre-wrap`:

```typescript
// src/components/IdeaCard.tsx
<p className="text-text-muted mb-4 whitespace-pre-wrap">
  {idea.content}
</p>
```

**Limitations:**
- No formatting (bold, italic, headings)
- No lists (bullets, numbered)
- No code blocks with syntax highlighting
- No images or file attachments
- No links with previews
- No tables
- No checklists/todos within ideas

## Proposed Future State

**Rich Editor Experience**

1. **Markdown/WYSIWYG Editing**
   - Toggle between markdown source and rich preview
   - Familiar formatting toolbar
   - Keyboard shortcuts (Cmd+B, Cmd+I, etc.)
   - Slash commands (/heading, /code, /list)

2. **Content Types**
   - Headings (H1-H3)
   - Bold, italic, strikethrough
   - Bullet and numbered lists
   - Checklists with completion state
   - Code blocks with syntax highlighting
   - Blockquotes
   - Horizontal rules
   - Tables

3. **Media Embedding**
   - Image upload and display
   - Drag-and-drop support
   - Image hosting (Cloudinary, Vercel Blob, or similar)
   - Video embeds (YouTube, Vimeo)
   - File attachments with download

4. **Link Enhancement**
   - Auto-link detection
   - Link previews (OpenGraph)
   - Internal idea links (`[[Idea Title]]`)

**Editor Libraries to Consider:**
- Tiptap (ProseMirror-based, extensible)
- Plate (React-first, customizable)
- Lexical (Meta's editor framework)
- BlockNote (Notion-like blocks)

## Key Deliverables

- [ ] Evaluate and select rich text editor library
- [ ] Integrate editor into IdeaForm component
- [ ] Build custom toolbar with Quiver styling
- [ ] Implement keyboard shortcuts
- [ ] Add slash commands menu
- [ ] Create code block component with syntax highlighting
- [ ] Set up image storage solution
- [ ] Implement drag-and-drop image upload
- [ ] Add checklist support with persistence
- [ ] Build internal idea linking syntax
- [ ] Create link preview fetcher
- [ ] Migrate existing ideas (plain text → markdown)
- [ ] Update IdeaCard to render rich content

## Prerequisites

- None strictly, but should coordinate with:
  - **05-idea-relationships-graph.md**: Internal linking syntax
  - **07-local-first-crdt.md**: Rich text CRDTs are complex

## Risks & Open Questions

- **Editor complexity**: Rich text editors are notoriously complex. Need to set scope limits.
- **Mobile experience**: Touch-based editing is different. Need mobile-optimized UI.
- **CRDT compatibility**: If implementing 07, need an editor that works with Yjs/Automerge.
- **Storage size**: Images will dramatically increase storage needs. Need limits and optimization.
- **Migration**: How to handle existing plain text ideas? Auto-convert to markdown?
- **Performance**: Rich editors can be heavy. Need lazy loading strategy.

## Notes

- Tiptap is popular and has Yjs integration for future collaboration
- BlockNote provides Notion-like experience out of the box
- Consider starting with markdown-only, add WYSIWYG later
- The BrainstormPanel result already expects markdown: `prose prose-sm`
- Could use Shiki for syntax highlighting (same as VS Code)
- Image storage: Vercel Blob, Cloudflare R2, or UploadThing are good options
