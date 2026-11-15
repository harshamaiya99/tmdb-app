# Project Roadmap

## Vercel hosting and TMDB API migration

**Objective:** Host the frontend on Vercel, proxy TMDB operations through serverless functions, and keep each user's account credentials encrypted server-side.

**Reason for migration:**

* Vercel supports both frontend hosting and serverless backend functions.
* Keep the TMDB application credential used by migrated public reads on the server instead of exposing it in the browser bundle.
* Support optional TMDB account authorization for personal features without requiring a personal API key to browse.
* Simplify deployment by integrating GitHub directly with Vercel.

**Completed: Vercel hosting and public API migration**

The app is hosted on Vercel and builds with `npm ci` and `npm run build`, serving `dist` from the domain root. Public catalog reads and account operations use Vercel functions, and the app no longer depends on GitHub Pages.

**API migration status:** Public catalog reads and account operations use Vercel functions. Public browsing and account authorization do not require visitors to provide an API key or v4 token. Account credentials are encrypted per user in Neon.

### Migration stages

1. **API foundation:** **Complete.** `GET /api/tmdb/configuration` uses server-only `TMDB_API_KEY`.
2. **Catalog-data pilot:** **Complete.** Deployed trending movies use `GET /api/tmdb/trending-movies?page=1`.
3. **Paginated categories:** **Complete.** Deployed category lists use the allowlisted `GET /api/tmdb/category?category=...` endpoint.
4. **Search and media details:** **Complete.** Deployed search and multi-search use `/api/tmdb/search`; details, recommendations, similar titles, reviews, seasons, episodes, collections, person credits, and countries use the allowlisted `/api/tmdb/media` endpoint.
5. **Filtered discovery and remaining public lists:** **Complete.** Deployed genre/language/company/provider lists, composed movie/TV filters, paginated release-date calendar results, trending TV, and popular/trending people lists use the validated discovery or category endpoints. Local development retains direct TMDB calls.
6. **Credential-free public browsing:** **Complete.** Public catalog routes no longer require user-supplied credentials; local Vite development may use a developer key for direct catalog calls.
7. **Account migration:** **Complete.** Server-side v3/v4 authorization, encrypted per-user Neon storage, secure session cookies, and allowlisted account actions are deployed and verified.

**Hosting migration outcome:** The React + Vite frontend and serverless API functions are hosted on Vercel with GitHub-integrated deployments. Public reads use the server-side TMDB API key; account tokens stay encrypted in Neon and are isolated by each user's opaque session cookie.

**Security and architecture notes:**

* GitHub Actions Secrets protect values only while workflows use them. A secret inserted into a Vite build becomes public; Vercel server-only environment variables must be read only by backend functions.
* Vercel functions are stateless. Neon provides persistent per-user credentials; `TMDB_TOKEN_ENCRYPTION_KEY` must remain stable and backed up or stored credentials can no longer be decrypted.
* Browser-held user tokens are accessible to the user and scripts executing in that browser. Keep account tokens in encrypted server-side storage and never return them to the client.
* Review and rotate any TMDB app credential previously embedded in a public client-side build.
* Avoid caching personalized TMDB responses in shared caches. Do not log API keys, session identifiers, access tokens, or authorization codes.

## TV Episode Release Calendar

* Add a calendar view for upcoming TV episode air dates, inspired by TMDB's website calendar. Show a navigable date range in a seven-column week grid on larger screens, with episode title, show name, season/episode number, poster or still, and premiere/finale labels where available. Indicate overflow when a day has more episodes than can be displayed, and allow users to open the episode or TV show details.
* Use TMDB's date-filtered TV discovery to find candidate shows, then retrieve their season episode data and group episodes by air date. Discovery returns shows rather than a complete episode schedule, so fetching must be bounded and account for pagination, API limits, missing dates, and time zones.
* Reuse the existing TMDB service, request cache, image component, and TV episode details experience where practical. On narrow screens, present a compact agenda/list instead of forcing the desktop week grid into the viewport.

## TMDB Service Modularization

* Gradually split `src/lib/tmdb.ts` by responsibility to make the growing service easier to navigate and maintain, without changing its public behavior.
* `src/lib/tmdb/types.ts` — TMDB interfaces and shared types.
* `src/lib/tmdb/client.ts` — shared request handling, authentication, and caching.
* `src/lib/tmdb/media.ts` — movie, TV, people, search, and discovery methods.
* `src/lib/tmdb/account.ts` — account authorization, watchlists, ratings, and custom lists.
* Keep `src/lib/tmdb.ts` as a small entry point that exports the existing `tmdbService` and types, so callers do not need to change.
* Start with the clearest boundaries (types and account operations), and validate each extraction with the existing tests and build before proceeding. Avoid splitting into many overly small files.

## Documentation and API Reference Strategy

* Document the app at the correct layer: inline TSDoc for TypeScript APIs, Storybook for reusable UI components, and project docs for architecture and workflows.
* Prefer selective documentation over broad comment spam; document public contracts, integration boundaries, and non-obvious behavior.
* Keep the existing README and `.ai/` docs aligned with the implementation rather than creating overlapping documentation layers.

### Why this matters

This project has multiple contracts that are easy to misunderstand:

* TMDB integration and normalized response logic in `src/lib/*`
* account/session behavior in `api/*`
* shared hooks and reusable UI behavior in `src/hooks/*` and `src/components/*`
* route-level data fetching and page composition in `src/pages/*`

TSDoc and generated API docs reduce onboarding time, make shared logic easier to maintain, and clarify the real public behavior of functions and components.

### Documentation model

#### 1. TSDoc for TypeScript contracts

Use TSDoc for exported functions, hooks, utilities, and public component props.

Priority files:

* `src/lib/tmdb.ts`
* `src/lib/utils.ts`
* `src/hooks/usePageTitle.ts`
* `src/hooks/usePagination.ts`
* `src/hooks/useRatingDialog.ts`
* `src/components/MediaCard.tsx`
* `src/components/RatingDialog.tsx`
* `src/components/ReviewSection.tsx`
* `api/tmdb/*.ts`
* `api/account/*.ts`

Document:

* purpose and intent
* inputs and outputs
* edge cases and error behavior
* caching, auth, and side effects
* expected return shape or normalized model

#### 2. Storybook for reusable UI

Use Storybook for interactive or visually stateful components whose behavior is easiest to understand by example.

Best candidates:

* `MediaCard`
* `RatingDialog`
* `PaginationControls`
* `WatchLinkButton`
* `ReviewSection`

#### 3. Project docs for architecture and flow

Use the existing README and `.ai/*.md` files for higher-level context:

* app structure and routing
* TMDB/public-vs-account flow
* auth and session boundaries
* deployment and environment assumptions

### Implementation roadmap

#### Phase 1: establish the documentation standard

* Define which files should use TSDoc vs Storybook vs project docs.
* Keep the standard narrow and reusable rather than forcing comments everywhere.
* Align the README and `.ai/` documents with the same terminology and boundaries.

#### Phase 2: document the public API surface

* Add TSDoc to the TMDB service layer, utility helpers, and shared hooks.
* Document request/response contracts and important edge cases.
* Ensure exported public functions are self-describing.

#### Phase 3: document major UI components

* Add prop and behavior docs to key reusable UI components.
* Add Storybook examples for complex or stateful components.
* Document loading, empty, and error states where they affect behavior.

#### Phase 4: document server endpoints and auth flow

* Add endpoint-level notes for account and TMDB routes.
* Explain auth boundaries, expected input, and error handling.
* Keep docs specific to actual runtime behavior rather than generic API summaries.

#### Phase 5: generate docs automatically

* Add TypeDoc to generate API docs from TSDoc comments.
* Keep generated output in a dedicated docs folder or internal site for review.
* Exclude test-only files and internal implementation detail from public docs.

### Quality bar

Document exported functions, hooks, and component props when they are part of the app's public contract. Leave internal one-off logic undocumented unless it is complex or easily misunderstood.

This approach keeps the project maintainable without creating redundant or noisy documentation.

### Practical file-by-file priority

Highest priority:

* `src/lib/tmdb.ts`
* `src/lib/utils.ts`
* `src/hooks/usePageTitle.ts`
* `src/hooks/usePagination.ts`
* `src/hooks/useRatingDialog.ts`
* `src/components/MediaCard.tsx`
* `src/components/RatingDialog.tsx`
* `src/components/ReviewSection.tsx`
* `api/tmdb/*.ts`
* `api/account/*.ts`

Secondary priority:

* `src/components/Layout.tsx`
* `src/components/MediaSection.tsx`
* `src/components/PaginationControls.tsx`
* `src/components/WatchLinkButton.tsx`
* `src/lib/accountCache.ts`
* `src/lib/requestCache.ts`
* `src/lib/embedSettings.ts`

### Recommended end state

The project should have:

* TSDoc comments on public TypeScript functions and components
* TypeDoc-generated project docs for API surfaces
* Storybook coverage for the key UI components
* A concise architecture doc for routing, data flow, and account flows
* Enough inline explanation that a contributor can understand the app without reading every file in sequence

This gives the project a Javadoc-style documentation story without over-documenting small internals, and it fits the current codebase structure and project goals.

## Native Android app in the same monorepo

**Objective:** Add a React Native Android app alongside the existing Vercel-hosted web app, share the API and business logic, and keep the app usable as a local installable APK without Play Store publishing.

**Core assumption:** The web app already uses Vercel-hosted APIs. The Android app will use the same public backend endpoints rather than a local development server. That means the app can work anywhere with internet access as long as the backend is public and the app is configured with the correct API base URL.

### Decision: repo shape

Use a monorepo with a small separation of concerns:

```text
.
├── apps/
│   ├── web/                  # current Vite React app
│   └── mobile/               # React Native / Expo Android app
├── packages/
│   ├── shared-api/           # TMDB and backend client logic
│   ├── shared-types/         # domain types and normalized response models
│   ├── shared-logic/         # business rules, filtering, sorting, cache helpers
│   └── ui/                   # optional shared design tokens or primitive components
├── api/                      # keep existing Vercel functions for server-side TMDB/account flow
├── db/
├── package.json
├── tsconfig.json
└── README.md
```

### Scope and non-goals

**In scope:**

* keep the current web app fully working
* add a local Android APK workflow
* share backend/API contracts and business logic
* rebuild mobile screens natively
* keep the app usable without app-store deployment

**Out of scope for now:**

* Play Store or App Store publishing
* app-store compliance review
* production crash analytics or remote config
* push notifications
* full cross-platform design parity with the browser app

### Architecture rules

1. **Do not share the web UI directly**
   * React web components are not directly portable to React Native.
   * Rebuild screens in native UI patterns instead of porting CSS-heavy components.

2. **Share domain logic and API contracts**
   * TMDB client code
   * normalized media types
   * search/filter logic
   * list/rating logic
   * general utility functions
   * account/session helpers that do not depend on browser storage

3. **Keep browser-only code out of shared packages**
   * no `window`, `document`, `localStorage`, service worker assumptions
   * no Vite-only env usage in shared logic
   * no DOM-specific rendering or CSS behavior

4. **Use mobile-native storage**
   * use secure/local storage on Android for session state or local preferences
   * keep server-side auth/session logic for account features
   * do not store sensitive tokens in plain app preferences

### Phase 1: monorepo bootstrap

**Goal:** Establish the repo structure without changing the current web app’s behavior.

**Tasks:**

1. Create `apps/web` and move the existing web project there.
2. Keep `api/` and `db/` at the repo root or convert them into a backend package if desired.
3. Add `apps/mobile` with Expo or React Native project scaffolding.
4. Add root-level workspace config and package scripts.
5. Ensure the current `npm run build` and tests still pass for the web app.

**Success criteria:**

* the web app still runs exactly as it does today
* the mobile app exists as a separate runnable project
* shared tooling is available from the root workspace

### Phase 2: extract shared contracts

**Goal:** Move all logic that is not browser-specific into shared packages.

**Tasks:**

1. Create `packages/shared-types` for TMDB and app domain models.
2. Create `packages/shared-api` for HTTP requests and response handling.
3. Move common helpers such as date formatting, text normalization, and data mapping into shared packages.
4. Centralize request caching and response metadata in shared logic.
5. Keep the current Vercel API routes as the source of truth for server actions and account operations.

**High-priority extraction candidates:**

* TMDB endpoint wrappers
* media model interfaces
* search/filter helpers
* list and rating logic
* account feature request builders
* generic utility functions

**Success criteria:**

* the web app imports the shared package without behavior changes
* the mobile app can reuse the same contracts and request logic
* no browser-only code is trapped in shared packages

### Phase 3: mobile app shell and runtime setup

**Goal:** Get a working Android app shell that can run on a physical device or emulator.

**Tasks:**

1. Create the Expo or React Native app in `apps/mobile`.
2. Configure Android build environment for local APK generation.
3. Add environment variable support for the API base URL.
4. Add basic app shell, navigation, and theme support.
5. Replace browser-only assumptions with mobile-safe equivalents.

**Required mobile changes:**

* navigation: stack/tab navigation instead of browser routes
* storage: AsyncStorage / secure storage instead of browser storage
* theming: native theme handling instead of DOM-based theme toggles
* images: native image components with remote URL support
* HTTP: API base URL must be configured for mobile runtime

**Success criteria:**

* app launches on Android emulator or device
* app can reach the public backend over the internet
* no browser-only APIs are breaking the runtime

### Phase 4: screen-by-screen rebuild

**Goal:** Recreate the core browsing experience in native UI patterns.

**Target screen list:**

1. Home / browse feed
2. Search results
3. Movie detail page
4. TV show detail page
5. Person detail page
6. Account page
7. Favorites/watchlist/ratings screens
8. Settings screen
9. List management screens

**Implementation priorities:**

1. **MVP screens first**
   * home
   * search
   * movie/TV details
   * account/profile state

2. **Then secondary screens**
   * release dates
   * media lists
   * settings
   * custom list creation/editing

3. **Finally polish**
   * loading states
   * empty states
   * avatar and image layouts
   * theme support
   * touch-friendly controls

**Success criteria:**

* users can browse public TMDB content on Android
* users can open media details and navigate back
* account auth flows integrate with the existing public backend
* the mobile UI feels native without forcing web component reuse

### Phase 5: API and auth compatibility

**Goal:** Ensure the Android app works with the same server-backed auth flow used by the web app.

**Tasks:**

1. Keep the Vercel `/api/*` routes as the source of truth.
2. Reuse the backend auth/callback flow where possible.
3. Ensure deep links and callback URLs work on Android.
4. Store any mobile app session state in local secure storage only when needed.
5. Keep sensitive account data server-side, not embedded in the client.

**Important detail:**

The mobile app should use the same public API and same account service endpoints if they are designed to be cross-client. It should not depend on browser cookies or web-only session flows.

**Success criteria:**

* Android app can hit the public backend endpoints
* auth works through the same backend contract
* no secret TMDB tokens are shipped in the APK

### Phase 6: local Android APK flow

**Goal:** Make the app usable as a local Android install without app-store publishing.

**Tasks:**

1. Configure Android build for debug or release APK generation.
2. Test on emulator and physical Android phone.
3. Verify network access to the public API endpoints.
4. Confirm installation via APK transfer or developer build flow.
5. Validate the app works over mobile internet, not only on localhost.

**Success criteria:**

* APK installs on Android device
* app reaches the public backend
* app is usable outside a development browser runtime
* no localhost-only assumptions remain in the runtime config

### Phase 7: QA and hardening

**Goal:** Make the app stable enough for local usage and demos.

**Checklist:**

* offline/empty-state handling
* retry behavior on failed API calls
* slow network handling
* image fallback handling
* invalid session recovery
* theme toggling and dark mode correctness
* navigation state stability
* deep-link callback handling
* Android back-button behavior
* app lifecycle safety

**Success criteria:**

* app can be installed and used without browser-based assumptions
* major screens work across a typical Android device
* app behavior stays consistent with the web product

### Suggested order of execution

1. create monorepo structure
2. extract shared API and type contracts
3. build mobile app shell and Android runtime
4. port the home/search/detail screens
5. connect account flows to the same backend
6. validate APK installation on device
7. refine the polish layer

### Recommended first milestone

The first milestone should be simple and realistic:

* `apps/mobile` launches
* user can browse public movie/TV content
* search works
* media details open
* app calls the same public Vercel backend as the web app
* APK installs locally on Android device

That gives a clear learning-focused deliverable without overbuilding the project.

### Final recommendation

For this project, keep the Android initiative lean and practical:

* same public API backend
* separate mobile app shell
* shared business logic where possible
* native UI rebuild where needed
* local APK install only

This approach gives the best balance between learning value and engineering discipline without turning the repo into a complicated multi-platform product prematurely.

This roadmap is intentionally focused on the current project reality: a local Android learning app using the same public API layer, not a public Play Store app or a full production cross-platform platform.
