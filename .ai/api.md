# TMDB Integration

## Overview

TMDB access is centralized in [src/lib/tmdb.ts](src/lib/tmdb.ts). In deployed builds, public catalog reads and personal account operations use same-origin Vercel Functions and server-only credentials. Local Vite development reads `TMDB_API_KEY` from `.env` for direct public catalog requests; account authorization requires Vercel Functions.

## Vercel API

Public catalog reads use GET-only Vercel functions with fixed or allowlisted TMDB routes. Account authentication and mutations use dedicated Vercel functions, persistent Neon sessions, and same-origin POST requests.

Configure `TMDB_API_KEY`, `TMDB_V4_ACCESS_TOKEN`, `TMDB_TOKEN_ENCRYPTION_KEY`, and `DATABASE_URL` in Vercel for Production. These are server-only variables; do not prefix them with `VITE_`. Apply [`db/schema.sql`](../db/schema.sql) to the connected Neon database. `VITE_MOVIE_EMBED_URL` and `VITE_TV_EMBED_URL` remain client-side settings.

The read-only `GET /api/tmdb/trending-movies?page=1` endpoint maps to the fixed TMDB `/3/trending/movie/day` operation, accepts only pages 1–500, uses the same server-only API key, and returns TMDB's response shape unchanged. In deployed builds, the home-page `tmdbService.getTrendingMovies()` method uses this Vercel endpoint; local Vite development continues calling TMDB directly so `npm run dev` works without a Vercel Functions emulator.

The allowlisted `GET /api/tmdb/category?category=...` endpoint covers paginated movie/TV categories and trending/popular people lists. The category selects a fixed TMDB route; callers cannot supply arbitrary paths. Page, language, region, and sort parameters are validated, and TV Talk-show filtering remains applied by the client service. Deployed category, trending-TV, and people-list methods call this endpoint; local development retains direct TMDB calls.

Public search uses `GET /api/tmdb/search?type=movie|tv|person|multi&query=...&page=...`; optional `region` is supported for movie search only. Search type is allowlisted, query length and page are validated, and the existing compact-query spacing fallback remains in the service. Deployed movie, TV, and person search and header multi-search use this endpoint.

Other migrated public reads use `GET /api/tmdb/media?resource=...`. Resources are allowlisted for movie, TV, person, collection, movie/TV recommendations, similar titles and reviews, TV seasons and episodes, person movie/TV credits, and country configuration. Entity IDs, pagination, season numbers, and episode numbers are validated; append-to-response data is fixed per resource rather than caller-controlled. Deployed detail, related-media, season/episode, person-credit, collection, and country lookups use this endpoint.

Filtered discovery and release-calendar reads use `GET /api/tmdb/discover`. The endpoint accepts a fixed set of discovery parameters for movie/TV filters (genres, original language, companies, providers, regions, dates, release types, vote thresholds, monetization, sort order, and page), validates their formats, and always maps requests to `/3/discover/movie` or `/3/discover/tv`. Release-calendar requests use `mode=release-date-range` with validated ISO dates, a movie-only route, pagination, and optional region. Deployed genre/language/company/provider lists, composed filters, and release-date calendar pages use this endpoint. TV Talk-show exclusions remain applied in the service.

All deployed catalog and account requests use the Vercel API. Local catalog browsing with `npm run dev` uses direct TMDB requests and reads `TMDB_API_KEY` from `.env`. Use `vercel dev` to test account authorization and mutations locally.

## Environment and runtime config

The app API key is configured as a server-only Vercel variable for deployed public reads and account requests. Browsing or connecting an account on the deployed site does not require the user to enter a key. For plain Vite development, `vite.config.ts` reads `TMDB_API_KEY` from `.env` and injects it only when running the development server, where the browser calls TMDB directly. Do not prefix it with `VITE_`; production builds do not inject this value. Optional `VITE_MOVIE_EMBED_URL` and `VITE_TV_EMBED_URL` variables provide build-time defaults for movie and TV watch-link templates.

The app-level `TMDB_V4_ACCESS_TOKEN` is used only by the server to start and complete custom-list authorization. Per-user v3 session IDs and v4 user access tokens are encrypted with `TMDB_TOKEN_ENCRYPTION_KEY` before storage in Neon. The browser receives only an opaque, HTTP-only session cookie.

Each person's approved TMDB authorization identifies their own account. The app's server-side credentials identify the application and do not give other users access to the owner's watchlist.

## Request Flow

A typical request follows this path:

1. A page component requests data from the TMDB service.
2. The service routes deployed public reads through same-origin `/api/tmdb/*` functions and account operations through `/api/account/*`.
3. Vercel functions call fixed TMDB routes using server-only environment variables and credentials loaded for the current opaque browser session.
4. The response is parsed as JSON and returned to the calling page.
5. The page stores the result in React state and renders the UI.

Public direct local requests use `fetchFromTMDB`; deployed public and account requests use same-origin API helpers that handle HTTP errors.

## Authentication Model

### API key storage

The deployed app allows public browsing and account connection without a user API key. There is no credential-based login page. During plain Vite development, `TMDB_API_KEY` from `.env` is assigned to the service instance; it is not stored in browser local storage.

### How authentication is used

For local direct requests using the v3 API key, every TMDB request is authenticated by appending the current API key to the URL as:

- `?api_key=...` when the endpoint has no existing query string
- `&api_key=...` when the endpoint already contains query parameters

This is handled inside the shared request helper, so pages do not need to manage auth details themselves.

Request methods accept an optional `AbortSignal` through `TMDBRequestOptions`. Callers can use an `AbortController` to cancel requests when a page unmounts or a newer request supersedes an older one.

### TMDB user account authorization

The server starts and completes TMDB authorization. Watchlists, favorites, and ratings use TMDB v3's request-token process:

1. Create a temporary request token.
2. Redirect the user to TMDB to approve access, returning to `/api/account/auth/callback` with a one-time state value.
3. The server validates state, exchanges the approved request token for a TMDB session ID, and retrieves the user's account details.
4. Encrypt the session ID and account identity in Neon. A random opaque session cookie ties later requests to that user's stored credentials.

The session ID is a sensitive credential and is treated like a password. The account menu's disconnect action asks TMDB to revoke both user credentials and then clears the server-side session and browser cookie.

Account requests are sent to `/api/account/action`. The server derives the account ID and credentials from the session cookie; the browser never sends a TMDB session ID or user token. The service supports movie and TV watchlists, favorites, and rated lists; per-title account state; adding/removing watchlist and favorite items; half-point ratings from 0.5 to 10; and TV episode ratings.

Custom lists use a separate TMDB v4 user approval, started by the server with `TMDB_V4_ACCESS_TOKEN`. The server includes an `approved=true` callback marker and keeps TMDB's temporary request token in a short-lived, HTTP-only cookie because the v4 redirect may return only the supplied callback URL parameters. The callback validates the one-time state and exchanges that cookie-held request token for the user's v4 access token. The user token and account object ID are encrypted in Neon; server account operations use that per-user token. V4 list operations support mixed movies and TV shows: create, edit, delete, add/remove items, retrieve paginated account lists, and read paginated list details. The custom-list overview reads item counts from list details; media-type filters fetch all pages before filtering; membership checks combine `object_ids` with paginated results.

The v3 watchlist, favorite, and rated endpoints are separate for movies and TV, and return no cross-media added timestamp. The account pages therefore interleave the independently `created_at.desc`-sorted movie and TV results for All view, while preserving newest-first order within each media type; this is balanced interleaving rather than a guaranteed global added-time chronology.

## Endpoint Categories

The API service exposes methods for several categories of requests:

### Home and discovery

The home page provides separate movie and TV category selectors. Movie options include trending, popular, streaming, in theaters, and top rated; TV options include trending, popular, and top rated. Each selector's paginated view uses the same category as its home carousel.
The home page also includes a movie release calendar. It queries `/discover/movie` for the selected primary release date only, applies the saved content region, and sorts by popularity; results are cached and the home view shows up to six movies. The selected day's See More page queries that exact release date and provides standard movie-list pagination.
The People page provides Popular and daily Trending tabs, both with pagination.

- trending movies
- now playing movies
- top rated movies
- upcoming movies
- trending TV shows
- popular TV shows
- top rated TV shows
- popular people
- daily trending people
- streaming-focused movie discovery
- IMDb-style discovery lists

### Details

These fetch richer entity data:

- movie details with credits, videos, backdrops and posters, first-page recommendations and similar titles, reviews, watch providers, release certification for the selected country, budget, and revenue
- TV show details with aggregate series-wide cast credits, crew, videos, images, first-page recommendations and similar titles, reviews, production companies, watch providers, and regional content ratings
- paginated movie and TV recommendation or similar-title endpoints for the detail-page See More lists
- TV season details with episodes and season-specific cast and crew credits
- TV episode details with crew, guest stars, still images, and videos
- person details with cast and crew credits, external IDs, and images. Movie and TV credit lists include both cast and crew roles, prioritizing the person's known-for department.
- Person movie and TV credit endpoints return the full credit collection; the media list paginates those combined results locally in groups of 20.

### Search

The app supports:

- movie search
- TV show search
- person search
- combined movie, TV show, and person search for header autocomplete suggestions

Full movie, TV show, and person searches retry a limited number of likely two-word splits when a compact alphanumeric query returns no matches (for example, `iceage` as `ice age`). Header autocomplete uses a single combined-search request for faster suggestions.

TV search results are not filtered by genre, so Talk shows remain discoverable through search.

### TV list filtering

Non-search TV lists exclude shows tagged with TMDB's Talk genre (`10767`), including trending and category lists, genre browsing, and related shows. Person TV credits also exclude Talk shows unless the credited role is Himself, Herself, Themselves, Themself, Self, or Host. Search results and directly opened TV show details are not excluded.

### Filtered lists

The app's saved content-country setting is used for country-sensitive movie searches, release categories, and streaming-provider discovery. Movie and TV details filter TMDB's regional watch-provider and movie release-certification or TV content-rating data using that country. The country list comes from TMDB configuration.

Media-list filters compose through TMDB Discover so genre, original language, sorting, and company/provider constraints apply together. Unfiltered category pages retain their category endpoints, including Trending. Filtered Trending uses Discover results; filtered Now Playing and Upcoming retain their release-date constraints, and Top Rated retains its voting constraint. Genre and language browse routes allow their embedded filter to be overridden or cleared.

The service also supports category-based browsing for:

- genre-based media lists
- original-language movie and TV lists
- company-based movie and TV lists
- provider-based movie and TV lists
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

The shared image component also builds responsive `srcSet` candidates from the available TMDB sizes so browsers can select an appropriate resource for each rendered layout.

## Caching and Performance

### Current behavior

The app uses an in-memory request cache with TTLs and in-flight request deduplication for home lists, searches, paginated lists, detail pages, collections, and TV seasons.

Account query keys and account-cache invalidation are centralized in [src/lib/accountCache.ts](../src/lib/accountCache.ts). Account mutations and authorization changes invalidate the account-scoped cache without clearing public TMDB responses.

Page queries also use abort signals and viewport-aware loading. TV season requests begin when the episodes region approaches the viewport rather than during the initial detail render.

The cache is intentionally memory-only and is cleared on a full page reload.

### Practical implication

Potential future improvements include bounding memory use during long browsing sessions, strengthening invalidation when data changes, and optionally persisting selected public responses across reloads. Persistent caching would need expiry and versioning, and personalized account responses should remain isolated from public data.

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
- TMDB account credentials and sessions are server-managed; only the opaque session cookie is held by the browser.
- TMDB API credentials stay server-side in deployed builds; the local Vite development server injects its `.env` key only for direct catalog requests.
- Embed URL templates use browser-local overrides first, then Vite build-time defaults.
- The current design favors simplicity over advanced caching or offline support.

## Summary

The TMDB integration is compact and direct:

- one centralized service handles all requests
- Local development reads `TMDB_API_KEY` from `.env`; deployed API credentials remain server-side
- responses are typed and returned to components
- selected request results are cached in memory with TTLs and concurrent identical requests are deduplicated
- the response cache is cleared on full page reload; the service worker explicitly bypasses `/api/` requests so server API responses are never cached by the app shell worker
