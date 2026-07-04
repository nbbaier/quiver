# Local-First Architecture with CRDTs

**Category:** Architecture
**Quarter:** Q2-Q3
**T-shirt Size:** XL

## Why This Matters

Quiver's current offline support is a workaround, not a principle. Changes queue up and sync when online, but there's no true conflict resolution—"server wins" is the strategy. Multi-device editing will cause data loss. Real-time collaboration is impossible.

Local-first architecture with CRDTs (Conflict-free Replicated Data Types) inverts the model: the local database is authoritative, changes merge automatically without conflicts, and collaboration becomes a natural extension of sync. This is the foundation for real-time collaboration, multi-device seamlessness, and true offline-first operation.

## Current State

The sync strategy in `src/lib/sync.ts`:

```typescript
// Current: Optimistic local, eventual remote, server wins
export async function syncToRemote() {
  // Queue changes locally
  // Try to sync when online
  // On conflict: "After syncing, refresh local cache from server"
  // = Server wins, local changes may be lost
}
```

**Limitations:**
- No conflict resolution (last write wins)
- No real-time sync between devices
- No collaboration support
- Full refresh on sync (inefficient)
- Sync state is fragile
- No operation history/undo

## Proposed Future State

**CRDT-Based Sync System**

1. **Local-First Data**
   - SQLite as source of truth
   - Instant local writes
   - No network dependency for reads
   - Full functionality offline

2. **CRDT Operations**
   - Every change is a CRDT operation
   - Operations merge deterministically
   - No conflicts by design
   - Causal ordering preserved

3. **Sync Protocol**
   - Push operations to server
   - Pull operations from peers
   - Delta sync (only changes)
   - Resumable sync state

4. **Real-Time Collaboration**
   - Live presence indicators
   - See others' cursors/selections
   - Instant change propagation
   - Offline-compatible (sync when reconnected)

5. **History & Undo**
   - Operation log preserves history
   - Point-in-time recovery
   - Undo across devices
   - Change attribution

**Technical Approach Options:**

| Approach | Pros | Cons |
|----------|------|------|
| Yjs | Mature, rich text support | Complex integration |
| Automerge | Rust core, good perf | Newer, less ecosystem |
| Electric SQL | SQLite native | Alpha stage |
| PowerSync | SQLite + Postgres | Vendor lock-in |
| Custom | Full control | High effort |

## Key Deliverables

- [ ] Evaluate CRDT libraries (Yjs, Automerge, Electric SQL)
- [ ] Design operation schema for ideas
- [ ] Implement CRDT wrapper for SQLite operations
- [ ] Build sync protocol layer
- [ ] Create delta sync mechanism
- [ ] Add operation history storage
- [ ] Implement multi-device sync
- [ ] Build conflict visualization (when meaningful)
- [ ] Add real-time presence system
- [ ] Create sync debugging tools
- [ ] Migrate existing data to CRDT format
- [ ] Build sync status UI

## Prerequisites

- **04-user-auth-multitenancy.md**: User identity is needed for multi-device and collaboration
- **01-comprehensive-testing.md**: Sync is critical—must have thorough tests

## Risks & Open Questions

- **Library choice**: Each CRDT library has tradeoffs. Need careful evaluation.
- **SQLite integration**: How to bridge CRDT operations with SQLite? Some libraries have native support.
- **Storage overhead**: CRDTs can grow large with history. Need compaction strategy.
- **Text editing**: Rich text CRDTs are complex. May need Yjs specifically for content field.
- **Migration complexity**: Existing ideas need careful migration to CRDT format.
- **Real-time infrastructure**: WebSockets or SSE for live updates? Serverless constraints?

## Notes

- Electric SQL is specifically designed for SQLite sync—worth deep investigation
- PowerSync offers managed service with Turso-like experience
- Yjs is battle-tested in production apps (Notion, Figma use similar approaches)
- Could start with simpler sync and add CRDTs incrementally per field
- The `pending-changes` queue in `local-db.ts` is conceptually similar to an operation log
- Consider this a phased approach: better sync first, then real-time, then collaboration
