# Mobile Native Applications

**Category:** Scalability
**Quarter:** Q4
**T-shirt Size:** XL

## Why This Matters

Ideas strike anywhere—on a morning run, in the shower, during a commute. The PWA works on mobile, but it's a second-class experience. Native apps offer superior performance, deeper OS integration, and the polish that makes daily use delightful.

Mobile native apps would transform Quiver's capture story. Quick-launch widgets, Siri/Google Assistant integration, share sheet support, and offline reliability that "just works" all create a frictionless capture experience that a PWA can't fully match.

## Current State

Quiver is a PWA with mobile support:

```typescript
// vite.config.ts - PWA configuration
VitePWA({
  registerType: "autoUpdate",
  manifest: {
    name: "Quiver - Idea Capture",
    display: "standalone",
    // ...
  },
})
```

**Current Mobile Experience:**
- PWA installable on iOS/Android
- Basic offline support via service worker
- Responsive design (works on small screens)
- Touch-friendly UI

**PWA Limitations on Mobile:**
- No home screen widgets
- Limited background sync
- No voice assistant integration
- iOS restrictions (no push in PWA, limited storage)
- No share sheet source (can receive, not send)
- Inconsistent installation experience
- No Apple Watch/Wear OS support

## Proposed Future State

**Native App Suite**

1. **Core Features (Both Platforms)**
   - Native UI with platform conventions
   - Instant app launch (<300ms)
   - True offline-first with SQLite
   - Background sync
   - Push notifications
   - Share sheet integration (send & receive)
   - Biometric authentication
   - Spotlight/Android search integration

2. **iOS-Specific**
   - Home screen widgets (small, medium, large)
   - Lock screen widgets (iOS 16+)
   - Siri integration ("Hey Siri, capture an idea")
   - Apple Watch companion app
   - iCloud Keychain integration
   - Shortcuts app actions
   - Focus mode integration

3. **Android-Specific**
   - Home screen widgets
   - Quick tiles
   - Google Assistant integration
   - Wear OS companion
   - Material You theming
   - Android Auto (voice capture)

4. **Shared Infrastructure**
   - React Native or Expo codebase
   - Shared business logic with web
   - Synchronized design system
   - Unified API layer

**Technology Approach:**

| Option | Pros | Cons |
|--------|------|------|
| React Native | Reuse React skills, Expo ecosystem | Native modules complexity |
| Expo | Managed workflow, easy updates | Some native feature limits |
| Flutter | Great performance, single codebase | New language (Dart) |
| Native (Swift/Kotlin) | Best performance, full APIs | Double the work |

Recommended: **Expo** (React Native) for maximum code sharing with web.

## Key Deliverables

- [ ] Evaluate React Native vs Expo vs Flutter
- [ ] Set up shared monorepo structure
- [ ] Extract shared business logic from web app
- [ ] Create shared design system/component library
- [ ] Build iOS app with core functionality
- [ ] Build Android app with core functionality
- [ ] Implement native SQLite storage
- [ ] Add biometric authentication
- [ ] Create home screen widgets (both platforms)
- [ ] Integrate Siri/Google Assistant
- [ ] Build Apple Watch companion
- [ ] Implement push notifications
- [ ] Add share sheet integration
- [ ] Submit to App Store
- [ ] Submit to Google Play
- [ ] Set up mobile CI/CD (EAS Build, Fastlane)

## Prerequisites

- **04-user-auth-multitenancy.md**: Auth needed for multi-device sync
- **07-local-first-crdt.md**: Robust sync needed for mobile offline
- Most other initiatives—mobile is a culmination

## Risks & Open Questions

- **Resource investment**: Native apps are expensive to build and maintain. Worth it for user base size?
- **Feature parity**: How to keep web and mobile in sync? Risk of divergence.
- **App Store approval**: Both stores have policies that could affect features.
- **React Native stability**: RN has had breaking changes. New Architecture migration required?
- **Team skills**: Does the team have mobile experience? Learning curve?
- **Revenue model**: App store cuts (30%) impact monetization if premium features exist.

## Notes

- Expo has significantly improved—most limitations are gone
- expo-sqlite provides native SQLite access
- Consider starting with iOS only if resources are limited
- CapacitorJS is another option (web-first approach)
- The PWA should remain the entry point; native apps are for power users
- Could launch as "Quiver Mobile" beta first
- WatermelonDB is a good alternative to raw SQLite for React Native
