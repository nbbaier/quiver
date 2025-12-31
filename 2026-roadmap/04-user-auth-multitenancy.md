# User Authentication & Multi-Tenancy

**Category:** Architecture
**Quarter:** Q1
**T-shirt Size:** L

## Why This Matters

Quiver is currently a single-user application with no authentication. While this works for personal use, it fundamentally limits the product's potential. Users can't access their ideas from multiple devices (without sharing database credentials), there's no data isolation, and collaboration is impossible.

Adding authentication transforms Quiver from a personal tool into a platform. It enables device sync, team workspaces, sharing, and eventually premium features. This is the architectural foundation for growth.

## Current State

No authentication exists. The database is accessed directly via environment credentials:

```typescript
// src/lib/db.ts - Current state
const dbUrl = process.env?.VITE_TURSO_DATABASE_URL;
const dbToken = process.env?.VITE_TURSO_AUTH_TOKEN;
// No user context, all ideas in one pool
```

**Limitations:**
- Single-user only
- No cross-device access (ideas stuck on one device's IndexedDB)
- Database credentials exposed to client (via VITE_ prefix)
- No idea ownership or isolation
- No sharing or collaboration possible
- No audit trail of who did what

## Proposed Future State

**Authentication System**

1. **Multiple Auth Providers**
   - Email/password (primary)
   - OAuth: Google, GitHub, Apple
   - Magic link (passwordless)
   - SSO for enterprise (future)

2. **Session Management**
   - JWT tokens with refresh mechanism
   - Secure session storage
   - Cross-device sessions
   - Session revocation

3. **Database Multi-Tenancy**
   - User ID on all tables
   - Row-level security policies
   - Per-user database branches (Turso feature)
   - Team/organization abstraction

4. **API Security**
   - Authenticated endpoints
   - Rate limiting per user
   - API keys for integrations
   - CORS hardening

**Schema Changes:**
```sql
-- Add user context to ideas
ALTER TABLE ideas ADD COLUMN user_id TEXT NOT NULL;
ALTER TABLE ideas ADD COLUMN visibility TEXT DEFAULT 'private';
CREATE INDEX idx_ideas_user ON ideas(user_id);

-- New users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  -- ...
);
```

## Key Deliverables

- [ ] Select and integrate auth provider (Clerk, Auth.js, Lucia)
- [ ] Create users table and migration
- [ ] Add user_id to ideas schema
- [ ] Build authenticated API middleware
- [ ] Implement login/signup UI flows
- [ ] Add session management with JWT
- [ ] Migrate to server-side DB access (remove client credentials)
- [ ] Create user profile page
- [ ] Add email verification flow
- [ ] Implement password reset
- [ ] Add rate limiting per user
- [ ] Build data migration for existing users

## Prerequisites

None—but should be coordinated with other initiatives that depend on user context.

## Risks & Open Questions

- **Auth provider choice**: Clerk (managed, easy) vs Auth.js (flexible, self-hosted) vs Lucia (lightweight)?
- **Existing data migration**: How to handle ideas created before auth? Assign to first user?
- **Offline auth**: How does auth work when offline? Token caching with expiry?
- **Per-user databases**: Turso database branching could provide true isolation. Worth the complexity?
- **Anonymous usage**: Allow some features without login? Guest mode?

## Notes

- Clerk has excellent Vercel integration and would be fastest to implement
- Auth.js (NextAuth) is more flexible but requires more setup
- Consider Turso's "database per user" pattern for ultimate isolation
- The current `sync.ts` needs rework—user context must flow through all operations
- PWA offline mode will need careful handling of auth state
- Should plan for GDPR compliance: data export, deletion, consent
