# Application Architecture

## 1. Overview

This project is a React + TypeScript application for browsing TMDB media catalog data. Its frontend is client-side, with a small Vercel Functions layer proxying selected public reads. It is intentionally lightweight and centered around a few core ideas:

- Deployed public browsing uses a server-only TMDB API key through fixed Vercel function routes and does not require user credentials.
- An optional developer TMDB API key may be stored locally for direct catalog requests during local development.
- Routing is handled by React Router.
- UI is composed from reusable page components and shared UI primitives.
- TMDB requests remain centralized in one service module rather than spread across pages.

## 2. Runtime Structure

### Entry point

The app boots from [src/main.tsx](src/main.tsx), which mounts the root React app into the DOM.

The main application shell is defined in [src/App.tsx](src/App.tsx). It wires together:

- account connection and status screens
- the browser router
- global providers such as the title context
- the toast container

### Authentication flow

1. Deployed public browsing loads without a user API key.
2. The login page lets users connect their TMDB account without entering credentials.
3. Public and account routes are available without a client-side credential gate.

Vercel Functions provide public TMDB reads and account operations. Per-user account credentials are encrypted in Neon Postgres, and the browser holds only an opaque HTTP-only session cookie.

TMDB account features use an optional user-consent flow. The server creates a request token, redirects the user to TMDB for approval, validates the callback state, and exchanges the approved token for a session ID and account identity. Each user's session and credentials are stored separately and encrypted in Neon; account routes do not require a personal API key.

### Environment and runtime config

The app uses Vite environment variables for optional client-side integrations. `VITE_MOVIE_EMBED_URL` and `VITE_TV_EMBED_URL` provide default watch-link templates. Authenticated users can save multiple movie and TV link templates in the current browser; source names are derived from their URL hostnames. One configured link opens directly, while multiple links present a source menu. Settings can be exported to or imported from a versioned JSON file. Reset restores the build-time defaults. New environment variables should remain client-safe and should not be used for secrets.

## 3. Routing Model

Routing is defined in [src/App.tsx](src/App.tsx) with React Router's `HashRouter`. Page components are lazy-loaded at the route boundary, so each page's code is downloaded when needed rather than included in the initial JavaScript bundle. A shared Suspense fallback is shown while a page chunk loads. Hash-based URLs keep client-side routes working on static hosting, including direct visits and refreshes. Vercel serves the app from the domain root.

### Main routes

- `/login` — login screen
- `/about` — application information and TMDB attribution
- `/settings` — country, embed-link, and theme preferences
- `/` — home page
- `/movie/:id` — movie details
- `/tv/:id` — TV show details
- `/person/:id` — person details
- `/category/:category` — category or filtered media list
- `/releases/:date` — paginated movies released on a selected date
- `/movie` — movie listing view
- `/tv` — TV listing view
- `/person` — people listing view
- `/account/callback` — TMDB v3 account or v4 custom-list authorization return
- `/account/:section` — account watchlist, favorites, and ratings
- `/account/lists` — browse mixed movie/TV custom lists
- `/account/lists/:listId` — view and manage a custom list

### Routing behavior

- Public and account routes are available without a personal API key; disconnected account pages offer TMDB authorization.
- The app uses a catch-all redirect back to `/` for unknown routes.
- The layout shell remains consistent across most pages through the shared layout wrapper.

## 4. API Layer

The frontend API integration is centralized in [src/lib/tmdb.ts](src/lib/tmdb.ts), with server-side proxy routes under [api/tmdb](../api/tmdb).

### Responsibilities of the API layer

- manage the TMDB API base URL and image base URL
- hold strongly typed interfaces for movies, TV shows, people, reviews, episodes, and related entities
- expose a single `tmdbService` object with methods for fetching data
- route migrated deployed public reads through the Vercel API
- use an optional developer key for direct catalog requests during local development
- route deployed account actions through `/api/account/*`, where user credentials are loaded from the server session

The Vercel functions use the server-only `TMDB_API_KEY` and fixed or allowlisted operations for public reads and account actions. Local Vite development continues calling TMDB directly for public catalog data; use `vercel dev` for account flows.

### Core API capabilities

The service includes methods for:

- validating the API key
- fetching trending movies and TV shows
- fetching movies by category such as now playing, top rated, upcoming, and streaming trends
- fetching TV show lists and season details
- fetching movie, TV, and person details
- searching movies, TV shows, and people
- fetching person credits and genre/company/provider-based collections
- resolving image URLs from TMDB assets

### Design choice

Keeping API logic in one place makes it easier to:

- change endpoint behavior in one place
- keep typing consistent
- avoid duplicated fetch logic across pages
- swap to a different API layer later if needed

## 5. React Component Structure

### App shell and layout

- [src/components/Layout.tsx](src/components/Layout.tsx) provides the shared header, search form, navigation tabs, theme toggle, and logout action.
- It is responsible for the persistent chrome that surrounds most page contents.

### Page components

Pages live in [src/pages](src/pages):

- [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx) — account connection entry point without asking users for credentials
- [src/pages/HomePage.tsx](src/pages/HomePage.tsx) — displays independently selectable movie and TV categories, and handles search results
- [src/pages/MediaListPage.tsx](src/pages/MediaListPage.tsx) — renders paginated lists for the main movie and TV category tabs, genres, companies, providers, and people-related media
- [src/pages/ReleaseDateMoviesPage.tsx](src/pages/ReleaseDateMoviesPage.tsx) — renders paginated movie releases for a selected calendar date
- [src/pages/MovieDetailsPage.tsx](src/pages/MovieDetailsPage.tsx) — shows movie metadata, cast, crew, related media, and watch links
- [src/pages/TVShowDetailsPage.tsx](src/pages/TVShowDetailsPage.tsx) — shows show metadata, seasons, episodes, and related content
- [src/pages/PersonDetailsPage.tsx](src/pages/PersonDetailsPage.tsx) — shows a person’s biography, filmography, and images
- [src/pages/PeopleListPage.tsx](src/pages/PeopleListPage.tsx) — shows a list of people results
- [src/pages/AccountPage.tsx](src/pages/AccountPage.tsx) — displays and manages the connected account's movie and TV lists
- [src/pages/AccountListsPage.tsx](src/pages/AccountListsPage.tsx) — browses, displays, and manages mixed-media TMDB custom lists
- [src/pages/AccountCallbackPage.tsx](src/pages/AccountCallbackPage.tsx) — completes TMDB v3 account and v4 custom-list consent flows
- [src/pages/AboutPage.tsx](src/pages/AboutPage.tsx) — displays application information and required TMDB attribution

### Shared feature components

- [src/components/CreditsCarousel.tsx](src/components/CreditsCarousel.tsx) renders reusable horizontally scrollable cast and crew credits.
- [src/components/AccountMediaActions.tsx](src/components/AccountMediaActions.tsx) adds titles to account lists and submits user ratings from details pages.
- [src/components/AddToListButton.tsx](src/components/AddToListButton.tsx) adds movies and TV shows to existing lists or creates a private-by-default list.
- [src/components/MediaGridSkeleton.tsx](src/components/MediaGridSkeleton.tsx) provides loading placeholders.

### Account context

`TMDBAccountProvider` loads non-secret connection status from `/api/account/session` and starts redirects to the server-side authorization endpoints. Account actions are centralized in `src/lib/tmdb.ts` and `/api/account/action`; no TMDB user credential is stored in browser state.

### Shared hooks

- [src/hooks/usePageTitle.ts](src/hooks/usePageTitle.ts) keeps page title synchronization consistent without repeating `useEffect` logic in every page.

### UI primitives

The app uses a shadcn/ui-style component layer in [src/components/ui](src/components/ui), including buttons, cards, inputs, toasts, alerts, badges, and skeleton loaders.

## 6. State and Context

### Local component state

Most page components use React `useState` and `useEffect` to manage:

- loading status
- fetched data
- search state
- pagination state
- error messages

### Shared context

The app uses [src/contexts/TitleContext.tsx](src/contexts/TitleContext.tsx) to keep the page title synchronized across the layout and current route.

That title state is now wrapped by a small hook abstraction in [src/hooks/usePageTitle.ts](src/hooks/usePageTitle.ts), which keeps page-level code simpler and more consistent.

The embed URL templates and content country are shared through [src/contexts/EmbedSettingsContext.tsx](src/contexts/EmbedSettingsContext.tsx). Browser-local links override the optional Vite build-time defaults and are editable from the public [Settings page](../src/pages/SettingsPage.tsx). Link names are derived from URL hostnames, older single-template browser settings are migrated, and country options are loaded from TMDB. Theme state is shared by the root-level `ThemeProvider` in [src/hooks/useTheme.tsx](src/hooks/useTheme.tsx).

## 7. Data Flow

A typical request path looks like this:

1. A page component mounts.
2. It calls a method on `tmdbService` from [src/lib/tmdb.ts](src/lib/tmdb.ts).
3. In production, public catalog reads call allowlisted same-origin Vercel functions, which authenticate to TMDB using the server environment variable. In local development and for account operations, the service calls TMDB directly using browser credentials.
4. Data is returned as typed results.
5. The page stores the result in local state.
6. Shared UI components render the result and any loading or error state.

Example:

- Home page requests trending data
- Media list page requests a filtered category list
- Movie details page requests metadata and related content

## 8. Styling and UI Patterns

The application uses Tailwind CSS for layout and styling, with reusable primitives in [src/components/ui](src/components/ui).

Common patterns include:

- cards with hover states
- responsive grids for media lists
- skeleton loaders while content is fetching
- toast notifications for user-facing failures
- dark/light theme support via the theme toggle component

## 9. Extension Guidance

When extending the app, follow these principles:

- understand the existing implementation before editing
- search for reusable code before introducing anything new
- prefer extending existing components, hooks, utilities, services, and types over creating parallel implementations
- avoid duplicate business logic and duplicate API behavior
- keep new abstractions simple and explain them when they are introduced
- keep new data-fetching logic inside the central TMDB service when possible
- keep page components focused on rendering and orchestration
- reuse shared components instead of creating one-off UI blocks
- preserve the existing protected-route and auth flow
- keep types explicit and avoid introducing unnecessary abstraction

## 10. Summary

The repository is structured around a simple, maintainable pattern:

- routing organizes the app into page-level views
- one API service handles TMDB communication
- React components render data and user interactions
- shared UI primitives and a small set of shared hooks keep the experience consistent

That structure is well-suited for a lightweight media browsing app and should be preserved as the project grows.
