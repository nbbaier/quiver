# Building Quiver: An Offline-First PWA in a Weekend

## Part 3: Building the Core CRUD Interface

*This is Part 3 of a 7-part series on building Quiver, an offline-first Progressive Web App for capturing and developing ideas with AI.*

---

We have a database. We have a schema. Now we need a way for users to actually interact with it.

This post covers the patterns that turn database operations into a responsive user interface: data access layers, custom hooks, and component composition. By the end, you'll have a complete CRUD interface—create, read, update, delete—that feels fast even when talking to a remote database.

## Architectural Layers

Before writing code, let's think about structure. The goal is separation of concerns:

```
User Interface (React components)
        ↓ calls
Custom Hooks (state management)
        ↓ calls
Library Functions (business logic)
        ↓ calls
Database Client (Drizzle queries)
        ↓ talks to
Turso Cloud Database
```

Each layer has one job:

- **Components** render UI and handle events
- **Hooks** manage state and side effects
- **Library functions** contain business logic and data transformations
- **Database client** executes queries

Why not just call the database from components directly? You could. But separating layers makes testing easier (you can test business logic without rendering components), makes changes safer (modifying how ideas are fetched doesn't affect how they're displayed), and keeps components focused on presentation.

## Type Definitions

Start by defining the types our app will use. Create `src/types/idea.ts`:

```typescript
// What an idea looks like after fetching from the database
export interface Idea {
  id: number;
  title: string;
  content: string | null;
  tags: string[];           // Parsed from JSON
  urls: string[];           // Parsed from JSON
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
```

Notice we have three types for the same concept:
- `Idea` is what we get back from the database
- `CreateIdeaInput` is the minimum needed to create a new idea
- `UpdateIdeaInput` is partial—all fields optional, only send what changed

This pattern appears everywhere in CRUD applications. The data shape differs depending on the operation.

## The Data Access Layer

Create `src/lib/ideas.ts`. This file contains all database operations:

```typescript
import { db } from "@/db";
import { ideas } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Idea, CreateIdeaInput, UpdateIdeaInput } from "@/types/idea";

// Transform a database row to our application type
function parseIdea(row: typeof ideas.$inferSelect): Idea {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    // Parse JSON strings back into arrays
    tags: row.tags ? JSON.parse(row.tags) : [],
    urls: row.urls ? JSON.parse(row.urls) : [],
    archived: row.archived ?? false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// GET all active ideas, newest first
export async function getIdeas(): Promise<Idea[]> {
  const rows = await db
    .select()
    .from(ideas)
    .where(eq(ideas.archived, false))
    .orderBy(desc(ideas.createdAt));

  return rows.map(parseIdea);
}

// GET a single idea by ID
export async function getIdea(id: number): Promise<Idea | null> {
  const [row] = await db.select().from(ideas).where(eq(ideas.id, id));
  return row ? parseIdea(row) : null;
}

// CREATE a new idea
export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
  const [row] = await db
    .insert(ideas)
    .values({
      title: input.title,
      content: input.content || null,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      urls: input.urls ? JSON.stringify(input.urls) : null,
    })
    .returning();

  return parseIdea(row);
}

// UPDATE an existing idea
export async function updateIdea(
  id: number,
  input: UpdateIdeaInput
): Promise<Idea | null> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Only include fields that were actually provided
  if (input.title !== undefined) updateData.title = input.title;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.tags !== undefined) updateData.tags = JSON.stringify(input.tags);
  if (input.urls !== undefined) updateData.urls = JSON.stringify(input.urls);
  if (input.archived !== undefined) updateData.archived = input.archived;

  const [row] = await db
    .update(ideas)
    .set(updateData)
    .where(eq(ideas.id, id))
    .returning();

  return row ? parseIdea(row) : null;
}

// ARCHIVE an idea (soft delete)
export async function archiveIdea(id: number): Promise<boolean> {
  const result = await db
    .update(ideas)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(ideas.id, id));

  return result.rowsAffected > 0;
}

// DELETE an idea permanently
export async function deleteIdea(id: number): Promise<boolean> {
  const result = await db.delete(ideas).where(eq(ideas.id, id));
  return result.rowsAffected > 0;
}
```

A few patterns to notice:

**The `parseIdea` function** transforms database rows into application objects. This is where we parse JSON strings back into arrays. Every function that reads data goes through this transform, ensuring consistency.

**Checking `!== undefined`** in updates is important. It distinguishes between "field not provided" (don't change it) and "field set to null/empty" (change it to empty). If you just check for truthiness, you can't set a field to an empty string.

**Soft delete via archiving** keeps data recoverable. Users make mistakes. Having `archiveIdea` instead of only `deleteIdea` means you can add an "archived ideas" view later.

## The Custom Hook

Now we need React to manage this data. Create `src/hooks/useIdeas.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import type { Idea, CreateIdeaInput, UpdateIdeaInput } from "@/types/idea";
import * as ideasLib from "@/lib/ideas";

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ideas from the database
  const fetchIdeas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ideasLib.getIdeas();
      setIdeas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch ideas");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Add a new idea
  const addIdea = useCallback(async (input: CreateIdeaInput) => {
    try {
      const newIdea = await ideasLib.createIdea(input);
      // Optimistic update: add to local state immediately
      setIdeas((prev) => [newIdea, ...prev]);
      return newIdea;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create idea");
      throw err;
    }
  }, []);

  // Edit an existing idea
  const editIdea = useCallback(async (id: number, input: UpdateIdeaInput) => {
    try {
      const updated = await ideasLib.updateIdea(id, input);
      if (updated) {
        // Replace the old idea with the updated one
        setIdeas((prev) =>
          prev.map((idea) => (idea.id === id ? updated : idea))
        );
      }
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update idea");
      throw err;
    }
  }, []);

  // Archive an idea
  const removeIdea = useCallback(async (id: number) => {
    try {
      await ideasLib.archiveIdea(id);
      // Remove from local state
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive idea");
      throw err;
    }
  }, []);

  return {
    ideas,
    loading,
    error,
    addIdea,
    editIdea,
    removeIdea,
    refreshIdeas: fetchIdeas,
  };
}
```

This hook encapsulates all the complexity of data fetching and state management. Components that use it get a simple interface:

```typescript
const { ideas, loading, error, addIdea, editIdea, removeIdea } = useIdeas();
```

**Why `useCallback`?** Without it, these functions would be recreated on every render, which causes unnecessary re-renders in child components and makes `useEffect` dependencies unstable. With `useCallback`, the function reference stays the same unless its dependencies change.

**Optimistic updates** make the app feel fast. Instead of waiting for the database operation to complete before updating the UI, we update immediately. If the operation fails, we handle the error—but in the happy path, the user sees instant feedback.

## The Idea Card Component

Create `src/components/IdeaCard.tsx`:

```typescript
import { useState } from "react";
import type { Idea, UpdateIdeaInput } from "@/types/idea";

interface IdeaCardProps {
  idea: Idea;
  onUpdate: (id: number, input: UpdateIdeaInput) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
}

export function IdeaCard({ idea, onUpdate, onDelete }: IdeaCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(idea.title);
  const [content, setContent] = useState(idea.content || "");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    await onUpdate(idea.id, { title, content });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(idea.title);
    setContent(idea.content || "");
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm("Archive this idea?")) {
      setIsDeleting(true);
      await onDelete(idea.id);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isEditing) {
    return (
      <div className="idea-card editing">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="idea-title-input"
          placeholder="Idea title..."
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="idea-content-input"
          placeholder="Add more details..."
          rows={3}
        />
        <div className="idea-actions">
          <button onClick={handleSave} className="btn-save">
            Save
          </button>
          <button onClick={handleCancel} className="btn-cancel">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="idea-card">
      <div className="idea-header">
        <h3 className="idea-title">{idea.title}</h3>
        <span className="idea-date">{formatDate(idea.createdAt)}</span>
      </div>

      {idea.content && <p className="idea-content">{idea.content}</p>}

      {idea.tags.length > 0 && (
        <div className="idea-tags">
          {idea.tags.map((tag, i) => (
            <span key={i} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="idea-actions">
        <button onClick={() => setIsEditing(true)} className="btn-edit">
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="btn-delete"
          disabled={isDeleting}
        >
          {isDeleting ? "Archiving..." : "Archive"}
        </button>
      </div>
    </div>
  );
}
```

The component manages its own editing state. When you click Edit, that specific card switches to edit mode—other cards stay in display mode. This is inline editing, a pattern that reduces navigation friction.

## The Idea Form Component

Create `src/components/IdeaForm.tsx`:

```typescript
import { useState } from "react";
import type { CreateIdeaInput } from "@/types/idea";

interface IdeaFormProps {
  onSubmit: (input: CreateIdeaInput) => Promise<unknown>;
}

export function IdeaForm({ onSubmit }: IdeaFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = tagInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await onSubmit({
        title: title.trim(),
        content: content.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      // Reset form
      setTitle("");
      setContent("");
      setTagInput("");
      setIsExpanded(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="idea-form">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setIsExpanded(true)}
        onKeyDown={handleKeyDown}
        placeholder="Capture an idea..."
        className="idea-input-main"
        disabled={isSubmitting}
      />

      {isExpanded && (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add more details (optional)..."
            className="idea-input-content"
            rows={3}
            disabled={isSubmitting}
          />

          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tags (comma-separated)..."
            className="idea-input-tags"
            disabled={isSubmitting}
          />

          <div className="form-actions">
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Idea"}
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="btn-collapse"
            >
              Collapse
            </button>
            <span className="form-hint">Ctrl+Enter to save</span>
          </div>
        </>
      )}
    </form>
  );
}
```

This uses **progressive disclosure**—the form starts as a simple text input, then expands to reveal additional fields when focused. It reduces visual clutter while keeping advanced options accessible.

The `Ctrl+Enter` shortcut is a power user feature. Once you've used it, typing a quick idea becomes: click input, type, Ctrl+Enter, done. No reaching for the mouse.

## The Main App Component

Now wire everything together in `src/App.tsx`:

```typescript
import { useIdeas } from "@/hooks/useIdeas";
import { IdeaForm } from "@/components/IdeaForm";
import { IdeaCard } from "@/components/IdeaCard";

function App() {
  const { ideas, loading, error, addIdea, editIdea, removeIdea } = useIdeas();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Quiver</h1>
        <p>Capture and develop your ideas</p>
      </header>

      <main className="app-main">
        <IdeaForm onSubmit={addIdea} />

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Loading ideas...</div>
        ) : ideas.length === 0 ? (
          <div className="empty-state">
            <p>No ideas yet!</p>
            <p>Start capturing your thoughts above.</p>
          </div>
        ) : (
          <div className="ideas-list">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onUpdate={editIdea}
                onDelete={removeIdea}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          {ideas.length} idea{ideas.length !== 1 ? "s" : ""} captured
        </p>
      </footer>
    </div>
  );
}

export default App;
```

The App component is thin—just rendering and layout. All the data logic lives in `useIdeas`, all the card behavior lives in `IdeaCard`. This separation means you can understand each piece in isolation.

## Styling

Replace `src/index.css` with comprehensive styles:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;
}

.app-container {
  max-width: 640px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  text-align: center;
  margin-bottom: 24px;
}

.app-header h1 {
  font-size: 2rem;
  color: #0066cc;
}

.app-header p {
  color: #666;
}

.app-main {
  flex: 1;
}

.app-footer {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 0.875rem;
}

/* Form */
.idea-form {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.idea-input-main,
.idea-input-content,
.idea-input-tags {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  margin-bottom: 12px;
}

.idea-input-main {
  font-weight: 500;
}

.idea-input-content {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.form-actions button[type="submit"] {
  background-color: #0066cc;
  color: white;
}

.form-actions button[type="submit"]:hover:not(:disabled) {
  background-color: #0052a3;
}

.form-actions button[type="submit"]:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-collapse {
  background-color: #f0f0f0;
  color: #666;
}

.form-hint {
  color: #999;
  font-size: 0.75rem;
  margin-left: auto;
}

/* Idea cards */
.ideas-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.idea-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.idea-card.editing {
  border: 2px solid #0066cc;
}

.idea-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.idea-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.idea-date {
  font-size: 0.75rem;
  color: #999;
  white-space: nowrap;
}

.idea-content {
  color: #666;
  margin-bottom: 12px;
}

.idea-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.tag {
  background-color: #e8f4fc;
  color: #0066cc;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.idea-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.idea-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-edit {
  background-color: #f0f0f0;
  color: #333;
}

.btn-delete {
  background-color: #fff0f0;
  color: #cc0000;
}

.btn-save {
  background-color: #0066cc;
  color: white;
}

.btn-cancel {
  background-color: #f0f0f0;
  color: #666;
}

.idea-title-input,
.idea-content-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  margin-bottom: 8px;
}

/* State indicators */
.loading,
.empty-state,
.error-message {
  text-align: center;
  padding: 40px;
}

.loading {
  color: #666;
}

.empty-state {
  color: #999;
}

.error-message {
  background-color: #fff0f0;
  color: #cc0000;
  border-radius: 8px;
  margin-bottom: 16px;
}
```

## Testing

Start the development server:

```bash
bun run dev
```

Walk through each operation:

1. **Create**: Focus the input, type a title, add some content and tags, press Ctrl+Enter. The idea should appear instantly at the top of the list.

2. **Read**: Refresh the page. Your ideas should still be there—they're persisted in Turso.

3. **Update**: Click Edit on an idea, change the title, click Save. The change should appear immediately and persist across refreshes.

4. **Delete**: Click Archive on an idea, confirm. It disappears from the list.

Open your browser's Network tab during these operations. You'll see HTTP requests to Turso. Notice how the UI updates don't wait for network responses—that's the optimistic update pattern in action.

## What We've Built

You now have:

- A type-safe data access layer that transforms database rows
- A custom hook that manages all data state
- Components that handle their own UI state
- A responsive interface with loading states and error handling

The app works. Ideas persist. But it only works online. Disconnect from the internet and you're back to a broken experience.

In Part 4, we'll make this a Progressive Web App—installable, with an app icon, running in its own window. Then in Part 5, we'll tackle the hard problem: making it work offline.

---

*Commit your progress:*

```bash
git add .
git commit -m "Part 3: CRUD interface for ideas"
```

---

*Next in the series: [Part 4: Progressive Web App Fundamentals](/blog/04-pwa-fundamentals.md)*
