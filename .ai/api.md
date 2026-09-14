# TMDB Integration

## Overview

TMDB access is handled through a single service module in [src/lib/tmdb.ts](src/lib/tmdb.ts). The app uses the browser's native fetch API to call The Movie Database endpoints directly from the client.

This means the project is fully client-side and does not rely on a separate backend server for TMDB requests.

## Environment and runtime config

The default TMDB credential is provided by the user and stored in local storage. The app does not rely on a server-side secret or a separate auth service. The current Vite environment variable used in the UI is VITE_MOVIE_EMBED_URL, which builds the watch-link destination for movie detail pages.

The service also supports an optional `VITE_TMDB_ACCESS_TOKEN` bearer token for TMDB v4 authentication. Vite client variables are bundled into the browser application, so this is suitable only for a personal hobby deployment; a server-side proxy is required to keep credentials private.

## Request Flow

A typical request follows this path:

1. A page component requests data from the TMDB service.
2. The service builds a full TMDB URL.
3. The request uses a bearer token when `VITE_TMDB_ACCESS_TOKEN` is configured; otherwise the user-supplied v3 API key is appended as a query parameter.
4. The response is parsed as JSON and returned to the calling page.
5. The page stores the result in React state and renders the UI.

The central method that performs most requests is `fetchFromTMDB`, which assembles the URL and handles HTTP errors.

## Authentication Model

### API key storage

The app expects the user to enter a TMDB API key on the login page in [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx).

Once validated, the key is:

- stored in local storage under `tmdb_api_key`
- assigned to the service instance via `tmdbService.setApiKey(...)`

### How authentication is used

When using the v3 API key, every TMDB request is authenticated by appending the current API key to the URL as:

- `?api_key=...` when the endpoint has no existing query string
- `&api_key=...` when the endpoint already contains query parameters

This is handled inside the shared request helper, so pages do not need to manage auth details themselves.

When using a v4 access token, the service sends `Authorization: Bearer <token>` instead, avoiding the credential in the request URL.

Request methods accept an optional `AbortSignal` through `TMDBRequestOptions`. Callers can use an `AbortController` to cancel requests when a page unmounts or a newer request supersedes an older one.

### API key validation

The app validates a key by calling the TMDB configuration endpoint:

- `/configuration?api_key=<key>`

If the response is successful, the key is considered valid.

## Endpoint Categories

The API service exposes methods for several categories of requests:

### Home and discovery

These fetch lists for the landing experience:

- trending movies
- now playing movies
- top rated movies
- upcoming movies
- trending TV shows
- popular TV shows
- top rated TV shows
- streaming-focused movie discovery
- IMDb-style discovery lists

### Details

These fetch richer entity data:

- movie details with credits, videos, similar titles, reviews, and watch providers
- TV show details with aggregate series-wide cast credits, crew, videos, similar titles, reviews, and related metadata
- TV season details with episodes and season-specific cast and crew credits
- person details with credits and images

### Search

The app supports:

- movie search
- TV show search
- person search

### Filtered lists

The service also supports category-based browsing for:

- genre-based media lists
- company-based movie lists
- provider-based movie lists
- person credits by media type

## Error Handling

The TMDB service exposes normalized `TMDBError` failures with a stable error code:

- `AUTHENTICATION_ERROR` for missing or invalid credentials
- `RATE_LIMIT_ERROR` for HTTP 429 responses, including `Retry-After` when available
- `API_ERROR` for other unsuccessful TMDB responses
- `NETWORK_ERROR` when TMDB cannot be reached

Abort errors are passed through so callers can ignore expected cancellations.

Pages typically convert these into user-visible toasts via the shared toast system.

## Image URLs

TMDB images are not fetched through a separate image API. Instead, the service builds image URLs from the image base path using `getImageUrl(...)`.

This keeps image handling consistent and avoids repeating the TMDB image URL logic across components.

## Caching and Performance

### Current behavior

There is no dedicated caching layer in the current implementation.

That means:

- each page load can trigger fresh fetches
- list and detail views do not memoize results across navigation
- pagination requests fetch fresh data from TMDB each time

### What exists today

The app uses React state and component re-rendering to manage data locally, but it does not implement:

- in-memory caching
- request deduplication
- local storage persistence for fetched data
- stale-while-revalidate behavior

### Practical implication

If the app grows, the main opportunities for performance improvements would be:

- caching repeated list requests by endpoint and page
- storing recently viewed details locally
- preventing duplicate in-flight requests for the same data

## Data Types and Shape

The service uses strongly typed TypeScript interfaces for TMDB entities such as:

- `Movie`
- `TVShow`
- `Person`
- `Episode`
- `Season`
- `Review`
- `Cast`
- `AggregateCast` for cast roles across the full TV series
- `Crew`

The current implementation also includes richer types for creator metadata, production companies, and watch providers where the TMDB responses expose them.

## Important Design Notes

- The API layer is intentionally centralized to avoid spreading fetch logic across pages.
- Authentication is simple and user-driven rather than server-backed.
- The app depends on the browser environment and local storage for persistence.
- The current design favors simplicity over advanced caching or offline support.

## Summary

The TMDB integration is compact and direct:

- one centralized service handles all requests
- API keys are stored in local storage and attached to requests
- responses are typed and returned to components
- there is currently no built-in caching layer, so fresh network requests are made as needed
