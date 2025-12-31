# Comprehensive Testing Infrastructure

**Category:** Testing
**Quarter:** Q1
**T-shirt Size:** M

## Why This Matters

Quiver currently has **zero automated tests**. The only testing mechanism is `src/lib/test-db.ts`—a manual database connection test. As the codebase grows with AI features, offline sync, and eventually multi-user support, the lack of tests becomes a critical liability. Every new feature risks breaking existing functionality silently.

Building comprehensive testing infrastructure now—before adding more complexity—will pay dividends throughout the year. It enables confident refactoring, faster iteration, and provides living documentation of expected behavior. This is the foundation that makes all other initiatives safer to execute.

## Current State

- **Unit tests:** None
- **Integration tests:** None
- **E2E tests:** None
- **Test runner:** Bun has built-in testing, but unused
- **CI/CD:** No automated testing in deployment pipeline
- **Code coverage:** Unknown (effectively 0%)

The manual `test-db.ts` script validates database connectivity but nothing else:
```typescript
// src/lib/test-db.ts - Current state
async function testDatabase() {
  const testIdea = await createIdea({...});
  const allIdeas = await getAllIdeas();
  await deleteIdea(testIdea.id);
}
```

## Proposed Future State

A robust testing pyramid with:

**Unit Tests (70%)**
- Pure functions in `src/lib/` (ideas.ts, local-db.ts, sync.ts)
- React hooks (useIdeas, useBrainstorm) with mock contexts
- Component rendering tests with Testing Library

**Integration Tests (20%)**
- API endpoint testing with supertest/hono testing utilities
- Database operations with in-memory libsql
- Sync logic between local and remote databases
- Inngest function testing with mock events

**E2E Tests (10%)**
- Critical user flows with Playwright
- Offline mode simulation
- PWA installation testing
- Cross-browser compatibility (Chrome, Firefox, Safari)

**CI/CD Integration**
- GitHub Actions running tests on every PR
- Automated coverage reporting
- Visual regression testing for UI components

## Key Deliverables

- [ ] Set up Bun test runner with proper configuration
- [ ] Create test utilities and mocks (db mock, Anthropic mock, Inngest mock)
- [ ] Unit tests for all `src/lib/` modules (target: 90% coverage)
- [ ] React Testing Library setup for component tests
- [ ] Hook testing with @testing-library/react-hooks
- [ ] API integration tests for all endpoints
- [ ] Playwright E2E test suite for critical paths
- [ ] GitHub Actions workflow for CI
- [ ] Coverage reporting and badges
- [ ] Pre-commit hooks for test running

## Prerequisites

None—this is foundational work that should happen first.

## Risks & Open Questions

- **Mocking Anthropic API**: Need to balance realistic responses with test speed. Consider recording/replaying responses.
- **IndexedDB testing**: May require fake-indexeddb or similar library for Node environment.
- **Inngest function testing**: Need to investigate Inngest's testing utilities.
- **Test data management**: Need strategy for seeding consistent test data across test suites.

## Notes

- Bun's built-in test runner is Jest-compatible, so migration from Jest patterns is straightforward
- Consider adding `vitest` as an alternative if Bun testing has limitations with React
- The `vite.config.ts` already has proper TypeScript setup, making test configuration simpler
- Recommend starting with the `src/lib/ideas.ts` module as it has pure database operations
