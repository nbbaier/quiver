# Building Quiver: An Offline-First PWA in a Weekend

A 7-part blog series on building a production-ready Progressive Web App from scratch.

---

## Series Overview

This series walks through building **Quiver**, an offline-first idea capture app with AI-powered brainstorming. The goal isn't just to build an app—it's to learn patterns that apply to any modern web application: offline-first architecture, edge databases, type-safe queries, and AI integration.

**What we build:**
- A complete CRUD interface for capturing ideas
- Cloud database with global edge replication
- Full offline support with automatic sync
- AI brainstorming with streaming responses
- Installable PWA for all platforms

**Time investment:** 12-16 hours (one weekend)

**Monthly cost:** ~$2.70 (Claude API only; everything else is free tier)

---

## The Posts

### [Part 1: The Weekend Project](./01-the-weekend-project.md)

Introduction to the project and technology choices. Set up the Vite + React + TypeScript project structure with path aliases.

**Key topics:**
- Why this stack (Bun, Vite, React, Turso, Drizzle, Claude)
- Project structure and organization
- Basic app shell with controlled inputs

---

### [Part 2: Database Architecture](./02-database-architecture.md)

Set up Turso (distributed SQLite) and Drizzle ORM. Create the schema, configure migrations, and write type-safe queries.

**Key topics:**
- Why SQLite in the cloud
- Drizzle schema definition with TypeScript types
- Database client configuration
- CRUD operations with type inference

---

### [Part 3: Building the Core CRUD Interface](./03-crud-interface.md)

Build the React interface: data access layer, custom hooks, and components. Implement create, read, update, and delete operations with optimistic updates.

**Key topics:**
- Layered architecture (components → hooks → library → database)
- Custom hooks for state management
- Optimistic updates for responsive UX
- Inline editing pattern

---

### [Part 4: Progressive Web App Fundamentals](./04-pwa-fundamentals.md)

Transform the app into an installable PWA. Configure vite-plugin-pwa, create a web app manifest, and add custom install prompts.

**Key topics:**
- What makes a PWA installable
- Web app manifest configuration
- Service worker basics
- Custom install prompts for Chrome and iOS

---

### [Part 5: Offline-First Architecture](./05-offline-first.md)

Implement true offline support with IndexedDB caching, action queuing, and automatic sync. The app works fully without an internet connection.

**Key topics:**
- IndexedDB for local storage
- Pending action queue for offline changes
- Sync mechanism on reconnection
- Workbox runtime caching strategies

---

### [Part 6: AI Integration with Claude](./06-ai-integration.md)

Add AI-powered brainstorming using Claude 3.5 Haiku. Implement streaming responses for responsive UX and idea expansion for individual thoughts.

**Key topics:**
- Claude API integration from the browser
- Streaming responses with progressive rendering
- Prompt engineering for creative tasks
- Cost analysis and alternatives (OpenAI)

---

### [Part 7: Deployment & Production Polish](./07-deployment-polish.md)

Deploy to Vercel, run Lighthouse audits, and add final polish: error boundaries, accessibility improvements, keyboard shortcuts.

**Key topics:**
- Vercel deployment configuration
- Lighthouse audit fixes
- Accessibility improvements
- Error boundaries and loading states
- Mobile testing checklist

---

## Tech Stack Summary

| Layer | Technology | Why |
|-------|------------|-----|
| Runtime | Bun | Fastest JavaScript runtime, native TypeScript |
| Build | Vite | Near-instant HMR, excellent PWA tooling |
| UI | React + TypeScript | Component model, type safety |
| Database | Turso + Drizzle | Edge SQLite, type-safe queries |
| AI | Claude Haiku | Best quality/cost for creative tasks |
| PWA | vite-plugin-pwa | Zero-config service workers |
| Hosting | Vercel | Free tier, seamless deployment |

---

## Prerequisites

- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- Basic React and TypeScript knowledge
- Accounts: Turso, Vercel, Anthropic (Claude API)

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/quiver.git
cd quiver
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
bunx drizzle-kit push

# Start development
bun run dev
```

---

## Who This Is For

This series is for developers who:
- Have basic React and TypeScript experience
- Want to learn offline-first architecture
- Are interested in AI integration
- Want to build something real in a weekend

It's not a step-by-step beginner tutorial—we move quickly and explain the "why" behind decisions. If you know what a React component is, you're ready.

---

## License

This tutorial series and the accompanying code are available under the MIT License. Build on it, modify it, make it your own.
