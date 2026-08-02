# Application Architecture

## 1. Overview

This project is a client-side React + TypeScript application for browsing TMDB media catalog data. It is intentionally lightweight and centered around a few core ideas:

- A user provides a TMDB API key at login.
- The app stores that key locally and uses it for authenticated requests.
- Routing is handled by React Router.
- UI is composed from reusable page components and shared UI primitives.
- All TMDB requests are centralized in one service module rather than spread across pages.

## 2. Runtime Structure

### Entry point

The app boots from [src/main.tsx](src/main.tsx), which mounts the root React app into the DOM.

The main application shell is defined in [src/App.tsx](src/App.tsx). It wires together:

- a protected-route mechanism for authenticated access
- the browser router
- global providers such as the title context
- the toast container

### Authentication flow

1. The user lands on the login page.
2. The app validates the supplied TMDB API key.
3. On success, the key is stored in local storage and injected into the TMDB service.
4. Protected routes become accessible.

This means the app is fully client-driven and does not rely on a backend server.

### Environment and runtime config

The app uses Vite environment variables for optional client-side integrations. One example is VITE_MOVIE_EMBED_URL, which powers the watch-link behavior on the movie details page. New environment variables should remain client-safe and should not be used for secrets.

## 3. Routing Model

Routing is defined in [src/App.tsx](src/App.tsx) with React Router.

### Main routes

- `/login` — login screen
- `/` — home page
- `/movie/:id` — movie details
- `/tv/:id` — TV show details
- `/person/:id` — person details
- `/category/:category` — category or filtered media list
- `/movie` — movie listing view
- `/tv` — TV listing view
- `/person` — people listing view

### Routing behavior

- Unauthenticated users are redirected to `/login`.
- The app uses a catch-all redirect back to `/` for unknown routes.
- The layout shell remains consistent across most pages through the shared layout wrapper.

## 4. API Layer

The API integration is centralized in [src/lib/tmdb.ts](src/lib/tmdb.ts).

### Responsibilities of the API layer

- manage the TMDB API base URL and image base URL
- hold strongly typed interfaces for movies, TV shows, people, reviews, episodes, and related entities
- expose a single `tmdbService` object with methods for fetching data
- store the current API key and attach it to outgoing requests

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

- [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx) — collects and validates the TMDB API key
- [src/pages/HomePage.tsx](src/pages/HomePage.tsx) — loads and displays the homepage sections and search experience
- [src/pages/MediaListPage.tsx](src/pages/MediaListPage.tsx) — renders paginated lists for categories, genres, companies, providers, and people-related media
- [src/pages/MovieDetailsPage.tsx](src/pages/MovieDetailsPage.tsx) — shows movie metadata, cast, crew, related media, and watch links
- [src/pages/TVShowDetailsPage.tsx](src/pages/TVShowDetailsPage.tsx) — shows show metadata, seasons, episodes, and related content
- [src/pages/PersonDetailsPage.tsx](src/pages/PersonDetailsPage.tsx) — shows a person’s biography, filmography, and images
- [src/pages/PeopleListPage.tsx](src/pages/PeopleListPage.tsx) — shows a list of people results

### Shared feature components

- [src/components/MediaCard.tsx](src/components/MediaCard.tsx) renders a consistent card UI for movies, TV shows, and people.
- [src/components/ReviewSection.tsx](src/components/ReviewSection.tsx) renders review content for details pages.
- [src/components/EpisodesRatingOverview.tsx](src/components/EpisodesRatingOverview.tsx) supports TV-show episode and rating presentation.
- [src/components/MediaGridSkeleton.tsx](src/components/MediaGridSkeleton.tsx) provides loading placeholders.

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

This avoids hardcoding the header title inside each page and centralizes title updates.

## 7. Data Flow

A typical request path looks like this:

1. A page component mounts.
2. It calls a method on `tmdbService` from [src/lib/tmdb.ts](src/lib/tmdb.ts).
3. The service builds the appropriate TMDB request and includes the stored API key.
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
- shared UI primitives keep the experience consistent

That structure is well-suited for a lightweight media browsing app and should be preserved as the project grows.
