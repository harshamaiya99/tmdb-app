# TMDB Integration

## Overview

TMDB access is handled through a single service module in [src/lib/tmdb.ts](src/lib/tmdb.ts). The app uses the browser's native fetch API to call The Movie Database endpoints directly from the client.

This means the project is fully client-side and does not rely on a separate backend server for TMDB requests.

## Vercel API migration (in progress)

The migration is being introduced incrementally so the current client behavior remains available while server-side functions are verified. The first Vercel function, [api/tmdb/configuration.ts](../api/tmdb/configuration.ts), handles only `GET /api/tmdb/configuration`. It accepts GET requests only, calls the fixed TMDB `/3/configuration` endpoint using the server-only `TMDB_API_KEY` environment variable, disables caching, and returns a generic error if TMDB fails. The frontend does not call this function yet; existing TMDB service requests continue directly from the browser.

Configure `TMDB_API_KEY` in Vercel's project environment-variable settings for Preview and Production to enable this endpoint; the local `.env` file is not automatically uploaded to Vercel. Do not prefix the server variable with `VITE_`. The existing `VITE_TMDB_ACCESS_TOKEN` is a separate v4 app token and is not used by this function; the embed URL variables remain client-side settings. Later migration steps will add specific allowlisted operations and switch the frontend service only after the new API surface has been verified.

## Environment and runtime config

The default TMDB credential is provided by the user and stored in local storage. The app does not rely on a server-side secret or a separate auth service. Optional `VITE_MOVIE_EMBED_URL` and `VITE_TV_EMBED_URL` variables provide build-time defaults for movie and TV watch-link templates. Browser-local settings can override those defaults and are stored separately in local storage.

The service also supports an optional TMDB v4 app access token for custom-list authorization. Users may enter it on the login screen; it is stored in browser local storage under `tmdb_v4_access_token`. A build-time `VITE_TMDB_ACCESS_TOKEN` remains supported as a fallback. Both approaches expose the app-level token to the browser and are suitable only when that exposure is acceptable; a server-side proxy is required to keep credentials private.

Account features use a separate TMDB user session. The API key or configured bearer token identifies the application; it does not grant access to a user's private account data. Users must approve access on TMDB's website before the app can create a session.

## Request Flow

A typical request follows this path:

1. A page component requests data from the TMDB service.
2. The service builds a full TMDB URL.
3. The request uses the user-entered v4 access token, or the build-time `VITE_TMDB_ACCESS_TOKEN` fallback, as a bearer token when available; otherwise the user-supplied v3 API key is appended as a query parameter.
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

The app validates a key by calling the TMDB v3 configuration endpoint:

- `/3/configuration?api_key=<key>`

If the response is successful, the key is considered valid.

### TMDB user account authorization

The app's unified account connection completes the TMDB v3 and v4 user-authorization flows in sequence. Watchlist, favorites, and ratings use TMDB v3's request-token process:

1. Create a temporary request token.
2. Redirect the user to TMDB to approve access, returning to the app's `/account/callback` hash route.
3. Exchange the approved request token for a TMDB session ID and retrieve the user's account details.
4. Store the session ID and account identity in browser local storage. The temporary request token is held in session storage while the user is redirected.

The session ID is a sensitive credential and is treated like a password. The account menu's combined disconnect action asks TMDB to revoke both the v3 session and any v4 user access token, then clears both from local storage. This browser-only app does not send account credentials to a project backend.

Account requests use the account ID and session ID with TMDB's v3 account endpoints. The service supports movie and TV watchlists, favorites, and rated lists; reading per-title account state to show whether a title is already saved or rated; adding/removing watchlist and favorite items; submitting half-point ratings from 0.5 to 10; and deleting ratings. TV episode details support episode account-state lookup and rating creation/deletion through `/tv/{series_id}/season/{season_number}/episode/{episode_number}/account_states` and `/rating`.

Custom lists use TMDB v4 user authorization, which is started automatically after v3 account authorization when an app-level v4 access token is configured at login or through `VITE_TMDB_ACCESS_TOKEN`. The app requests user approval, exchanges the request token for a user access token, and stores that token and the returned account object ID in browser local storage. The callback also accepts a v4 request token when TMDB omits the approval flag; the token exchange verifies the approval. Private list access and mutation use the v4 user token as a bearer credential. V4 list operations support mixed movies and TV shows: create with `POST /4/list`, edit list details with `PUT /4/list/{list_id}`, delete with `DELETE /4/list/{list_id}`, add with `POST /4/list/{list_id}/items` using `{ items: [{ media_type, media_id }] }`, remove with `DELETE /4/list/{list_id}/items` using the same body, retrieve lists from `/4/account/{account_object_id}/lists`, and read paginated `results` and `total_results` from `/4/list/{list_id}`. The custom-list overview reads item counts from each list's detail response because the account-list summary may not provide an accurate count. Individual-list media type filters fetch all pages before filtering, then paginate the matching items in the app. Membership checks combine `object_ids.movie` and `object_ids.tv` with the list's paginated `results`, so list items are detected even when those ID arrays are incomplete. The combined disconnect action revokes both the v3 session and v4 user access token.

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
- Authentication is simple and user-driven rather than server-backed.
- The app depends on the browser environment and local storage for persistence.
- Embed URL templates use browser-local overrides first, then Vite build-time defaults.
- The current design favors simplicity over advanced caching or offline support.

## Summary

The TMDB integration is compact and direct:

- one centralized service handles all requests
- API keys are stored in local storage and attached to requests
- responses are typed and returned to components
- selected request results are cached in memory with TTLs and concurrent identical requests are deduplicated
- the response cache is cleared on full page reload; TMDB API content is not cached by the service worker
