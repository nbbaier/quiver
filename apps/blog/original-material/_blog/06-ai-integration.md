# Building Quiver: An Offline-First PWA in a Weekend

## Part 6: AI Integration with Claude

*This is Part 6 of a 7-part series on building Quiver, an offline-first Progressive Web App for capturing and developing ideas with AI.*

---

We have an idea capture app that works offline. But capturing ideas is only half the problem—what do you do with a collection of half-formed thoughts? Some will naturally develop into projects. Most will sit in a list, gathering digital dust.

This is where AI becomes genuinely useful. Not as a gimmick, but as a tool that:
- Finds patterns across your ideas that you might not see
- Suggests connections between seemingly unrelated concepts
- Expands half-baked thoughts into something actionable
- Breaks creative blocks with fresh perspectives

We'll integrate Claude 3.5 Haiku for AI-powered brainstorming. Haiku is Anthropic's fastest model—responses stream in near-instantly—and at ~$0.25 per million input tokens, heavy personal use costs a few dollars per month.

## The Architecture Question

For a client-side app without a backend, we have two options for calling the Claude API:

**Option 1: Direct from browser**
- Simpler implementation
- API key exposed in client JavaScript
- Acceptable for personal apps

**Option 2: Serverless functions**
- More setup required
- API key stays on server
- Required for public/multi-user apps

For this personal app, we'll call Claude directly from the browser. This exposes the API key in your built JavaScript—anyone who views your source can see it. For a personal app where you're the only user, this is fine. For a public app, you'd add serverless API routes.

## Getting an API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account if you don't have one
3. Navigate to API Keys
4. Create a new key
5. Add $5 prepaid credit (Anthropic's minimum)

Add the key to your `.env`:

```bash
# Add to .env
VITE_ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

If you want to avoid the prepaid cost during development, OpenAI's GPT-4o mini is a viable alternative:

```bash
# Alternative: OpenAI
VITE_OPENAI_API_KEY=sk-your-openai-key-here
```

Install the SDK:

```bash
bun add @anthropic-ai/sdk
```

## The AI Service

Create `src/lib/ai.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { Idea } from "@/types/idea";

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

export async function brainstormIdeas(
  ideas: Idea[],
  onStream?: (text: string) => void
): Promise<string> {
  // Build context from recent ideas
  const ideaContext = ideas
    .slice(0, 10) // Use last 10 ideas for context
    .map((idea) => {
      let text = `- ${idea.title}`;
      if (idea.content) text += `: ${idea.content}`;
      if (idea.tags.length > 0) text += ` [Tags: ${idea.tags.join(", ")}]`;
      return text;
    })
    .join("\n");

  const prompt = `You are a creative brainstorming partner. Based on the user's recent ideas below, suggest 5 new directions they could explore. Be creative, make unexpected connections, and offer fresh perspectives.

User's Recent Ideas:
${ideaContext}

Please provide:
1. 5 new idea suggestions that build on or connect their existing ideas
2. Common themes you notice across their ideas
3. Unexpected connections between seemingly unrelated ideas

Format your response in a clear, readable way with headers for each section.`;

  if (onStream) {
    // Streaming response
    let fullText = "";
    const stream = anthropic.messages.stream({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullText += event.delta.text;
        onStream(fullText);
      }
    }

    return fullText;
  } else {
    // Non-streaming response
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock ? textBlock.text : "No response generated";
  }
}

export async function expandIdea(
  idea: Idea,
  onStream?: (text: string) => void
): Promise<string> {
  const prompt = `Help me develop this idea further:

Title: ${idea.title}
${idea.content ? `Description: ${idea.content}` : ""}
${idea.tags.length > 0 ? `Tags: ${idea.tags.join(", ")}` : ""}

Please provide:
1. Three ways to expand or develop this idea
2. Potential challenges and how to address them
3. Related concepts or fields to explore
4. A simple next step to get started`;

  if (onStream) {
    let fullText = "";
    const stream = anthropic.messages.stream({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullText += event.delta.text;
        onStream(fullText);
      }
    }

    return fullText;
  } else {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock ? textBlock.text : "No response generated";
  }
}
```

Let's understand the key parts:

**`dangerouslyAllowBrowser: true`** is required for client-side usage. The SDK warns you about exposing the API key—the "dangerously" prefix makes this explicit.

**Streaming vs non-streaming**: We support both patterns. The `onStream` callback receives the full text accumulated so far on each chunk. This lets us update the UI progressively as text arrives.

**The prompt structure**: We format the user's ideas as context, then ask for specific outputs. The structured prompt format helps get consistent, useful responses.

**Two functions**: `brainstormIdeas` analyzes all recent ideas for patterns and suggestions. `expandIdea` focuses on developing a single idea in depth.

## Why Streaming Matters

Compare two user experiences:

**Without streaming:**
1. Click "Generate Ideas"
2. Loading spinner for 2-3 seconds
3. Full response appears at once

**With streaming:**
1. Click "Generate Ideas"
2. First words appear in ~200ms
3. Text flows in word-by-word over 2-3 seconds

The total time is similar, but streaming feels dramatically faster. Users see progress immediately instead of staring at a spinner. This is especially important for AI features where generation can take several seconds.

## The Brainstorm Panel Component

Create `src/components/BrainstormPanel.tsx`:

```typescript
import { useState } from "react";
import type { Idea } from "@/types/idea";
import { brainstormIdeas, expandIdea } from "@/lib/ai";

interface BrainstormPanelProps {
  ideas: Idea[];
  selectedIdea?: Idea | null;
}

export function BrainstormPanel({ ideas, selectedIdea }: BrainstormPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleBrainstorm = async () => {
    if (ideas.length === 0) {
      setError("Add some ideas first to get AI suggestions!");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult("");

    try {
      await brainstormIdeas(ideas, (text) => {
        setResult(text);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ideas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpandIdea = async () => {
    if (!selectedIdea) {
      setError("Select an idea to expand!");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult("");

    try {
      await expandIdea(selectedIdea, (text) => {
        setResult(text);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to expand idea");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setResult("");
    setError(null);
  };

  return (
    <div className="brainstorm-panel">
      <div className="brainstorm-header">
        <h2>AI Brainstorm</h2>
        <div className="brainstorm-actions">
          <button
            onClick={handleBrainstorm}
            disabled={isLoading || ideas.length === 0}
            className="btn-brainstorm"
          >
            {isLoading ? "Thinking..." : "Generate Ideas"}
          </button>
          {selectedIdea && (
            <button
              onClick={handleExpandIdea}
              disabled={isLoading}
              className="btn-expand"
            >
              Expand Selected
            </button>
          )}
          {result && (
            <button onClick={handleClear} className="btn-clear">
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <div className="brainstorm-error">{error}</div>}

      {result ? (
        <div className="brainstorm-result">
          <pre>{result}</pre>
        </div>
      ) : (
        <div className="brainstorm-empty">
          {ideas.length === 0 ? (
            <p>Add some ideas first, then click "Generate Ideas" to get AI-powered suggestions!</p>
          ) : (
            <p>
              Click "Generate Ideas" to get AI-powered brainstorming based on your {ideas.length} idea{ideas.length !== 1 ? "s" : ""}.
            </p>
          )}
        </div>
      )}

      {isLoading && (
        <div className="brainstorm-loading">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
    </div>
  );
}
```

The component handles three states:
- **Empty**: No AI result yet, show instructions
- **Loading**: Streaming in progress, show loading indicator (though text also appears)
- **Result**: Display the generated text

The streaming callback `setResult(text)` updates React state on each chunk, causing re-renders that show the text growing.

## Adding Idea Selection

To use "Expand Selected", we need a way to select ideas. Update `IdeaCard` to support selection:

```typescript
// In src/components/IdeaCard.tsx

interface IdeaCardProps {
  idea: Idea;
  isSelected?: boolean;
  onSelect?: () => void;
  onUpdate: (id: number, input: UpdateIdeaInput) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
}

export function IdeaCard({
  idea,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: IdeaCardProps) {
  // ... existing code ...

  return (
    <div
      className={`idea-card ${isSelected ? "selected" : ""}`}
      onClick={onSelect}
    >
      {/* ... existing content ... */}
    </div>
  );
}
```

Add the selected style:

```css
/* Add to src/index.css */

.idea-card.selected {
  border: 2px solid #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.idea-card {
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
```

## Brainstorm Panel Styles

Add to `src/index.css`:

```css
/* Brainstorm Panel */
.brainstorm-panel {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-top: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.brainstorm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.brainstorm-header h2 {
  font-size: 1.25rem;
  color: #333;
  margin: 0;
}

.brainstorm-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-brainstorm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-brainstorm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-brainstorm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-expand {
  background-color: #f0f0f0;
  color: #333;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-clear {
  background-color: transparent;
  color: #666;
  border: 1px solid #ddd;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.brainstorm-result {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.brainstorm-result pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
}

.brainstorm-empty {
  color: #666;
  text-align: center;
  padding: 24px;
}

.brainstorm-error {
  background-color: #fff0f0;
  color: #cc0000;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.brainstorm-loading {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.loading-dots {
  display: flex;
  gap: 8px;
}

.loading-dots span {
  width: 10px;
  height: 10px;
  background-color: #667eea;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
```

## Updating the App Component

Finally, integrate everything in `src/App.tsx`:

```typescript
import { useState } from "react";
import { useIdeas } from "@/hooks/useIdeas";
import { IdeaForm } from "@/components/IdeaForm";
import { IdeaCard } from "@/components/IdeaCard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { IOSInstallInstructions } from "@/components/IOSInstallInstructions";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { BrainstormPanel } from "@/components/BrainstormPanel";
import type { Idea } from "@/types/idea";

function App() {
  const {
    ideas,
    loading,
    error,
    syncing,
    isOnline,
    addIdea,
    editIdea,
    removeIdea,
  } = useIdeas();
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const handleSelectIdea = (idea: Idea) => {
    setSelectedIdea(selectedIdea?.id === idea.id ? null : idea);
  };

  return (
    <>
      <OfflineIndicator isOnline={isOnline} syncing={syncing} />

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
                  isSelected={selectedIdea?.id === idea.id}
                  onSelect={() => handleSelectIdea(idea)}
                  onUpdate={editIdea}
                  onDelete={removeIdea}
                />
              ))}
            </div>
          )}

          {/* AI Brainstorming Panel */}
          <BrainstormPanel ideas={ideas} selectedIdea={selectedIdea} />
        </main>

        <footer className="app-footer">
          <p>
            {ideas.length} idea{ideas.length !== 1 ? "s" : ""} captured
            {!isOnline && " (offline)"}
          </p>
        </footer>

        <InstallPrompt />
        <IOSInstallInstructions />
      </div>
    </>
  );
}

export default App;
```

## Testing the AI Features

Start the dev server:

```bash
bun run dev
```

Test the integration:

1. **Create some ideas**: Add 3-5 ideas with titles and optional content/tags
2. **Generate brainstorm**: Click "Generate Ideas" and watch text stream in
3. **Select and expand**: Click an idea to select it (highlighted border), then click "Expand Selected"
4. **Check error handling**: If your API key is invalid, you should see an error message

The streaming should feel responsive—first words appear almost instantly, with text flowing in over a couple seconds.

## Cost Considerations

With Claude 3.5 Haiku:
- Input: ~$0.25 per million tokens
- Output: ~$1.25 per million tokens

A typical brainstorm session:
- Input: ~200-500 tokens (your ideas + prompt)
- Output: ~300-500 tokens (AI response)
- Cost: ~$0.001 per session

At 10 sessions per day, you're looking at ~$0.30 per month. The $5 prepaid minimum will last a very long time.

## Alternative: OpenAI Integration

If you prefer OpenAI, create `src/lib/ai-openai.ts`:

```typescript
import OpenAI from "openai";
import type { Idea } from "@/types/idea";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function brainstormIdeas(
  ideas: Idea[],
  onStream?: (text: string) => void
): Promise<string> {
  const ideaContext = ideas
    .slice(0, 10)
    .map((idea) => {
      let text = `- ${idea.title}`;
      if (idea.content) text += `: ${idea.content}`;
      if (idea.tags.length > 0) text += ` [Tags: ${idea.tags.join(", ")}]`;
      return text;
    })
    .join("\n");

  const prompt = `You are a creative brainstorming partner. Based on the user's recent ideas below, suggest 5 new directions they could explore.

User's Recent Ideas:
${ideaContext}

Please provide:
1. 5 new idea suggestions
2. Common themes you notice
3. Unexpected connections between ideas`;

  if (onStream) {
    let fullText = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      fullText += text;
      onStream(fullText);
    }

    return fullText;
  } else {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0]?.message?.content || "No response generated";
  }
}
```

The interface is identical—just change the import in `BrainstormPanel.tsx`. GPT-4o mini is even cheaper (~$0.15 per million input tokens) and works well for creative tasks.

## What We've Built

The app now has AI-powered brainstorming:
- Analyze patterns across all your ideas
- Expand individual ideas with detailed suggestions
- Streaming responses for responsive UX
- Works with minimal API costs

Combined with our offline-first architecture, you can brainstorm when online and review results offline.

In Part 7, we'll deploy to production and add final polish—error boundaries, accessibility improvements, and Lighthouse optimizations.

---

*Commit your progress:*

```bash
git add .
git commit -m "Part 6: AI brainstorming with Claude"
```

---

*Next in the series: [Part 7: Deployment & Production Polish](/blog/07-deployment-polish.md)*
