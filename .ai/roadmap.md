# Project Roadmap

## Migration: GitHub Pages to Vercel

**Objective:** Host the frontend on Vercel and incrementally proxy public TMDB reads through serverless functions using a server-side API key. Account-token storage and mutations remain separate future work.

**Reason for Migration:**

* GitHub Pages supports static hosting and doesn't provide backend execution.
* Vercel supports both frontend hosting and serverless backend functions.
* Keep the TMDB application credential used by migrated public reads on the server instead of exposing it in the browser bundle.
* Support optional TMDB account authorization for personal features without requiring an API-key login to browse.
* Simplify deployment by integrating GitHub directly with Vercel.

**Completed: Static frontend hosting**

The repository is connected to Vercel and the production frontend is hosted at [tmdb-app-rho.vercel.app](https://tmdb-app-rho.vercel.app/). Vercel builds with `npm ci` and `npm run build`, serving `dist` from the domain root. Hash routing and the existing client-side authentication, TMDB requests, and account behavior are unchanged. GitHub Pages deployment has been retired.

**API migration status:** Hosting and several groups of public reads are complete. The frontend still requires the user's API key for login and for public reads not yet migrated. Account authorization and mutation requests remain browser-based and are not part of this phase.

### Next migration stages

1. **API foundation:** **Complete.** `GET /api/tmdb/configuration` uses server-only `TMDB_API_KEY`.
2. **Catalog-data pilot:** **Complete.** Deployed trending movies use `GET /api/tmdb/trending-movies?page=1`.
3. **Paginated categories:** **Complete.** Deployed category lists use the allowlisted `GET /api/tmdb/category?category=...` endpoint.
4. **Search and media details:** **Implemented locally.** Deployed search and multi-search use `/api/tmdb/search`; details, recommendations, similar titles, reviews, seasons, episodes, collections, person credits, and countries use the allowlisted `/api/tmdb/media` endpoint. Verify the production deployment after pushing to `main`.
5. **Remaining public reads:** Migrate discovery/filter and release-calendar reads through narrowly scoped, validated endpoints, preserving current filtering and pagination behavior.
6. **Credential-free browsing:** Remove the app API-key login gate only after every public read needed for browsing uses the server API; keep local development practical.
7. **Account migration:** Separately design persistent storage and secure sessions before moving account authorization or mutations server-side.

**Hosting migration outcome:** The existing React + Vite frontend is hosted on Vercel with GitHub-integrated deployments and behavior equivalent to the previous static site. This phase does not provide a backend or improve credential privacy.

**Security and architecture notes:**

* GitHub Actions Secrets protect values only while workflows use them. A secret inserted into a Vite build becomes public; Vercel server-only environment variables must be read only by backend functions.
* Vercel functions are stateless. Environment variables are not a per-user token store; user authorization requires an appropriate persistent data store and a secure session design.
* Browser-held user tokens are accessible to the user and scripts executing in that browser. Keep them server-side if the requirement is that account access tokens are not exposed to the client.
* Review and rotate any TMDB app credential previously embedded in a public deployment, including credentials supplied through `VITE_TMDB_ACCESS_TOKEN`.
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