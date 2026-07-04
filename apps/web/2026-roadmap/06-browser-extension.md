# Browser Extension for Idea Capture

**Category:** Integration
**Quarter:** Q2
**T-shirt Size:** M

## Why This Matters

The best ideas happen while browsing. Reading an article, watching a video, researching a problem—these are prime moments for insight. But switching to Quiver, creating an idea, copying the URL, and adding context creates friction that kills the flow.

A browser extension enables capture at the moment of inspiration. One click to save a URL with context, highlight text to add as content, auto-extract page metadata, and sync seamlessly with the main app. This dramatically lowers the barrier to capturing ideas.

## Current State

No browser extension exists. The documentation (`docs/APP_RESEARCH.md`) explicitly notes:

> "Browser tab capture requires a separate Chrome extension (adding 2-3 days), but the core web app can launch immediately with manual URL input and expand tab-capture later."

The schema already has a `urls` field that's unused in the current UI:
```typescript
urls: text("urls", { mode: "json" }).$type<string[]>().default([]),
```

## Proposed Future State

**Chrome/Firefox Extension**

1. **Quick Capture**
   - One-click save of current page
   - Keyboard shortcut (Ctrl/Cmd + Shift + Q)
   - Right-click context menu
   - Auto-extract: title, URL, meta description, favicon

2. **Rich Capture**
   - Highlight text → add to idea content
   - Screenshot selection
   - Full page archive option
   - Multiple URL collection mode

3. **Smart Features**
   - Duplicate URL detection
   - Suggested tags based on page content
   - AI-generated summary of page
   - Related existing ideas display

4. **Sync & Offline**
   - Immediate sync when online
   - Offline queue with retry
   - Sync status indicator
   - Conflict resolution

5. **Extension UI**
   - Popup for quick capture
   - Options page for settings
   - Badge showing capture count
   - History of recent captures

**Cross-Browser Support**
- Chrome (primary)
- Firefox
- Edge (Chrome-compatible)
- Safari (WebExtension with adaptations)

## Key Deliverables

- [ ] Set up extension project structure (manifest v3)
- [ ] Build popup UI for quick capture
- [ ] Implement content script for page data extraction
- [ ] Add highlight-to-capture feature
- [ ] Create authentication flow from extension
- [ ] Implement sync queue with offline support
- [ ] Add keyboard shortcut support
- [ ] Build right-click context menu
- [ ] Create Firefox-compatible version
- [ ] Implement duplicate URL detection
- [ ] Add AI page summarization
- [ ] Submit to Chrome Web Store
- [ ] Submit to Firefox Add-ons
- [ ] Create extension onboarding flow

## Prerequisites

- **04-user-auth-multitenancy.md**: Extension needs authentication to know which user's account to sync with

## Risks & Open Questions

- **Manifest V3 limitations**: Service workers have shorter lifetimes. Need robust persistence strategy.
- **Authentication from extension**: OAuth flows from extensions are tricky. Consider token exchange approach.
- **Firefox compatibility**: Some APIs differ. Need to abstract browser-specific code.
- **Safari support**: Requires Apple Developer Program and different build process.
- **Enterprise policies**: Some organizations block extensions. Need alternative solutions.

## Notes

- Consider Web Share Target API as a lightweight alternative (works on mobile PWA)
- The `urls` field in schema is currently unused—this feature would finally utilize it
- Could use Readability.js for article content extraction
- Extension could also enable "save for later" reading list functionality
- Manifest V3 is required for Chrome—don't start with V2
- Consider using Plasmo or WXT for cross-browser extension development
