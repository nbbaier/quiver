# Evolved AI Assistant with Structured Outputs

**Category:** New Feature
**Quarter:** Q1-Q2
**T-shirt Size:** L

## Why This Matters

Quiver's current AI brainstorming is a good start, but it's essentially a one-shot prompt with no memory, structure, or depth. Users get a wall of text that they must manually parse and integrate. This misses the transformative potential of AI-assisted thinking.

An evolved AI assistant would turn Quiver from "idea storage with AI sprinkles" into "AI-powered ideation partner." It would understand context across ideas, provide structured actionable outputs, maintain conversation history, and help users develop ideas through iterative refinement rather than single-shot responses.

## Current State

The brainstorming flow in `src/lib/inngest-functions.ts`:

```typescript
// Current: Simple prompt → unstructured text response
const result = await generateText({
  model: anthropic("claude-haiku-4-5-20251001"),
  system: systemPrompt,
  prompt: userPrompt(title, content, context),
});
return response.text; // Raw markdown text
```

**Limitations:**
- Single-shot responses (no follow-up)
- Unstructured text output (no parsing)
- No conversation memory
- No tool use (can't fetch URLs, search ideas, etc.)
- No streaming to client (polling-based)
- No structured outputs (action items, questions, directions)
- Same approach for all idea types

## Proposed Future State

**Multi-Modal AI Assistance**

1. **Structured Brainstorming**
   ```typescript
   interface BrainstormOutput {
     coreInsight: string;
     directions: Array<{
       title: string;
       description: string;
       effort: 'low' | 'medium' | 'high';
     }>;
     questions: string[];
     relatedIdeas: number[]; // Links to existing ideas
     nextSteps: string[];
   }
   ```

2. **Conversation Memory**
   - Maintain brainstorm session history
   - Reference previous discussions
   - Build on prior insights
   - "Remember when we discussed X..."

3. **Tool Use**
   - Search existing ideas for connections
   - Fetch and summarize linked URLs
   - Create new linked ideas
   - Set reminders or todos

4. **Streaming Interface**
   - Real-time response streaming (replace polling)
   - Show thinking process
   - Interruptible generation

5. **Specialized Modes**
   - **Expand**: Develop an idea further
   - **Challenge**: Devil's advocate mode
   - **Connect**: Find relationships to other ideas
   - **Execute**: Turn idea into action plan
   - **Simplify**: Distill to essence

## Key Deliverables

- [ ] Migrate from polling to SSE/WebSocket streaming
- [ ] Implement Zod schemas for structured outputs
- [ ] Add conversation history to database schema
- [ ] Build tool-use infrastructure (search, URL fetch)
- [ ] Create specialized AI modes (expand, challenge, connect, execute)
- [ ] Design and build new AI chat interface
- [ ] Add idea-to-idea linking from AI suggestions
- [ ] Implement response caching for repeated queries
- [ ] Add AI usage analytics and cost tracking
- [ ] Create AI settings (model selection, temperature, etc.)

## Prerequisites

- **02-full-text-search-fts5.md**: Enables AI to search existing ideas
- Clean API layer for tool integration

## Risks & Open Questions

- **Cost management**: More sophisticated AI = more tokens. Need usage limits and cost visibility.
- **Streaming in serverless**: Vercel has 30s function timeout. Long conversations may hit limits.
- **Context window**: Need strategy for long conversation histories (summarization?)
- **Model selection**: Claude Haiku for speed, Sonnet for depth? User choice or automatic?
- **Privacy**: Conversation history is sensitive. Need clear data policies.

## Notes

- Vercel AI SDK already supports streaming (`streamText`), structured outputs (`generateObject`), and tool use
- The `src/api/server.ts` has a `/api/brainstorm/stream` endpoint that's partially implemented but unused
- Consider using Anthropic's new Claude 3.5 Haiku for cost-effective structured outputs
- Inngest supports long-running functions—could use for complex multi-step AI workflows
- Related ideas feature could use vector embeddings (future enhancement)
