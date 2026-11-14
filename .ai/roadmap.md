# Project Roadmap

## Completed Migration: GitHub Pages to Vercel

**Objective:** Host the frontend on Vercel, proxy TMDB operations through serverless functions, and keep each user's account credentials encrypted server-side.

**Reason for Migration:**

* GitHub Pages supports static hosting and doesn't provide backend execution.
* Vercel supports both frontend hosting and serverless backend functions.
* Keep the TMDB application credential used by migrated public reads on the server instead of exposing it in the browser bundle.
* Support optional TMDB account authorization for personal features without requiring a personal API key to browse.
* Simplify deployment by integrating GitHub directly with Vercel.

**Completed: Vercel hosting and public API migration**

The repository is connected to Vercel and the production frontend is hosted at [tmdb-app-rho.vercel.app](https://tmdb-app-rho.vercel.app/). Vercel builds with `npm ci` and `npm run build`, serving `dist` from the domain root. GitHub Pages deployment has been retired.

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