# Project Roadmap

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

## Multiple web UI experiences

**Objective:** Let a user choose between the existing Cinema interface and a distinctly designed Expressive interface while keeping one web app, one route model, and the existing TMDB and account integrations.

### Fit with the current application

The app already has a small shared foundation that should remain the source of truth:

* `src/App.tsx` owns the `HashRouter`, routes, lazy page boundaries, and root providers.
* `src/lib/tmdb.ts` centralizes public catalog and account requests.
* `TMDBAccountProvider`, `EmbedSettingsProvider`, `TitleProvider`, and `ThemeProvider` hold app-wide state.
* Pages in `src/pages` currently combine data loading/orchestration with presentation to varying degrees; shared UI primitives live in `src/components` and `src/components/ui`.
* The existing shadcn-style UI uses Tailwind and semantic CSS variables in `src/index.css`. Light/dark mode is a separate preference persisted in browser local storage.
* Settings, content-country preferences, embed links, and the current light/dark theme are browser-local. The optional TMDB connection is not an app-owned user profile or a general preference-sync service.

Treat the proposed architecture as a direction, not a mandate to move the app into new `core/`, `features/`, `shared/`, or monorepo packages. Keep the current structure and extract shared presentation-independent behavior only when a real seam is needed. In particular, do not duplicate API requests, account actions, route state, or business rules to achieve visual independence.

### Product and architecture decisions

* **Cinema** remains the default and should preserve its current appearance and behavior. Shared wiring for experience selection, providers, or routing may be needed; that is not a reason to rewrite Cinema's presentation.
* **Expressive** is a second web presentation with its own tokens, components, layouts, navigation choices, and motion. Material 3 Expressive is a design reference, not a requirement to install or claim conformance to a separate component framework.
* This roadmap is a starting point for exploration, not a fixed sequence or acceptance checklist. Change the scope, design direction, or architecture as implementation reveals new possibilities or lessons.
* Keep existing URL paths and the shared router. The selected experience changes presentation, not domain behavior, TMDB endpoints, or account identity.
* Keep experience selection separate from light/dark mode: a user can choose either experience and either supported color mode. Expressive may define its own light and dark palettes.
* Initially persist the selected experience in browser local storage, matching the current theme and settings model. Do not promise login restoration or cross-device synchronization: the app has no app-owned profile/preferences API, and a TMDB connection does not provide one. Revisit server sync only after defining an appropriate identity, API contract, privacy behavior, and disconnected-user fallback.
* Retain global providers and shared services above experience-specific presentation where that fits. Keep navigation, data, loading/error states, and actions behaviorally consistent while allowing each experience to render them differently.
* Scope experience-specific styles and tokens so Expressive cannot unintentionally change Cinema. Preserve semantic color roles, accessible contrast, keyboard behavior, and reduced-motion support.
* Liquid Glass, Cinematic, Retro, and other experiences are optional experiments, not commitments. Explore them whenever it is useful; the roadmap does not require waiting for complete parity first.

### Experience independence

Each experience should be independently understandable and maintainable as a presentation:

* Each owns its design tokens, visual components, layouts, navigation presentation, responsive behavior, and interaction patterns.
* Neither experience should depend on the other experience's components or styles. Shared primitives are appropriate only when they are genuinely presentation-neutral or intentionally part of a shared foundation.
* Both can consume the existing TMDB service, account context, and other shared functionality. Extract hooks, services, or view models when that creates a useful seam, rather than forcing every page into a generic abstraction.
* Adding or changing an experience may require updates to shared routing, selection, registration, or providers. It should not require changing another experience's presentation unless that presentation is intentionally being improved too.
* Independence is a design goal, not a ban on experiments. Temporary duplication, prototypes, and architectural changes are acceptable learning tools; consolidate shared behavior when doing so improves clarity or reliability.

### Feature-parity guide

Use a route/feature inventory to understand the breadth of the app and track which parts of each experience are implemented. It should include the home and search flows; movie, TV, person, and episode details; media and people lists; release dates; settings; TMDB connection and callback; watchlists, favorites, ratings, and custom lists; loading, empty, and failure states.

Feature parity is a useful long-term direction, not a release gate. It is fine to launch or keep Expressive intentionally partial while exploring a particular page, interaction, or design system; make the current coverage clear so the difference is understood. When implementing a feature in both experiences, verify meaningful actions and account/API outcomes, not only that the route renders. Update the inventory as implementation evolves.

### Implementation roadmap

#### Phase 1 — Inventory and boundaries

* Map current routes, shared providers, existing light/dark behavior, and interactive features.
* Mark which behaviors are already centralized (TMDB service, account context, shared hooks/components) and which page-level data/presentation logic is currently coupled.
* Choose a stable experience identifier (`cinema` or `expressive`), Cinema as the fallback/default, and browser-local preference storage.
* Define an initial route/feature inventory and visual/accessibility baseline for representative desktop and narrow-mobile widths.

**Exit criteria:** The plan identifies a small first vertical slice and explicitly preserves existing routes, shared providers, account flows, and light/dark preference behavior.

#### Phase 2 — Experience selection foundation

* Add an experience state/selection boundary and choose an experience composition that is clear for the current app. Keep route definitions and common providers in `src/App.tsx` where appropriate; experience-specific composition may use dedicated page or layout implementations.
* Add a Settings control for the experience, with clear labels, immediate preview/switching, and a visible selected state.
* Persist and validate the preference locally; unknown, unavailable, or missing values should safely select Cinema.
* Preserve the current URL, search query, filters, pagination, and other route state during a switch whenever those states are encoded in the URL or can be preserved without adding fragile synchronization.
* Keep theme selection independent and ensure the existing saved light/dark choice continues to work after switching.

**Exit criteria:** The selector survives reloads in the same browser, an invalid stored value does not break startup, and switching does not log the user out or alter account/API behavior.

#### Phase 3 — Expressive design foundation and vertical slice

* Define Expressive-specific color, typography, shape, spacing, elevation, focus, and motion tokens. Scope them to the selected experience rather than unintentionally replacing Cinema's global tokens.
* Build the components and layout pieces that the design calls for. Avoid speculative framework work, but do not limit the experiment to the existing component library.
* Implement one representative route and shared shell end to end, including loading, empty, error, navigation, and responsive states. Choose routes that exercise real app behavior (for example, home/search and a media detail) rather than a static mock screen.
* Respect reduced-motion settings and verify contrast, focus visibility, semantic controls, and touch target sizing.

**Exit criteria:** The vertical slice uses the existing TMDB service and providers, is visually distinct, works at desktop and narrow mobile widths, and causes no visual or behavioral regression in Cinema.

#### Phase 4 — Expand route coverage incrementally

* Implement Expressive routes in priority order using the parity inventory, sharing data-fetching/business logic and reusing only presentation-neutral components.
* Extract hooks or view models from pages only when needed to prevent meaningful logic duplication; keep one-off logic local rather than creating a speculative feature framework.
* Design each experience's responsive layout independently. Preserve intentional carousel behavior, safe areas, accessible dialogs, and the existing route model.
* As coverage grows, consider account actions, settings, and loading/empty/error states alongside the main browsing routes; choose the next slice based on what is useful to build and learn.

**Progress check:** Record which routes and features are available in each experience, where behavior differs, and what you want to explore next. Complete parity is an option for a mature milestone, not a prerequisite for continuing or shipping the experiment.

#### Phase 5 — Verification and release

* Add focused tests for preference persistence/fallback, switching, and representative experience-specific rendering; test shared actions against the existing service/context contracts where useful.
* Run the existing test suite and production build. Exercise the routes and features touched by the current experiment in both experiences.
* Check the layouts and interactions being changed at desktop and narrow smartphone widths; consider keyboard navigation, focus, contrast, reduced motion, theme combinations, loading/error states, and unintended horizontal overflow.
* Confirm that switching experiences preserves URL-based state, active TMDB connection state, and existing browser settings where those behaviors are in scope.

**Progress check:** The chosen scope works, Cinema remains the default unless intentionally changed, and any known gaps or behavior differences are documented. Validation should fit the experiment; it need not wait for full feature parity.

#### Phase 6 — Evaluate future experiences

Explore another experience whenever curiosity or a design question motivates it. Reuse the selection mechanism and shared functionality when helpful, and let the experiments reveal whether the current architecture needs to evolve; no speculative placeholder directory is needed.

### Non-goals for the initial release

* Requiring a new monorepo or `core/features/shared` folder hierarchy as a prerequisite.
* Synchronizing UI preferences across devices or creating an app-owned profile system.
* Accidentally changing shared API, account, routing, or state behavior when only presentation is intended to change.

### Recommended first milestone

Deliver the experience preference and a working Expressive slice while Cinema remains the default and retains its current user-facing behavior. Use real app functionality to explore how far the presentation can diverge, then decide whether to expand coverage, refine the architecture, or start another design experiment.
