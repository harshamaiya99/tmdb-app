# Project Roadmap

## Migration: GitHub Pages to Vercel

**Objective:** Move frontend hosting from GitHub Pages to Vercel while preserving the existing static app behavior. Backend execution, server-side TMDB credentials, and account-token storage are later work and are explicitly out of scope for the hosting migration.

**Reason for Migration:**

* GitHub Pages supports static hosting and doesn't provide backend execution.
* Vercel supports both frontend hosting and serverless backend functions.
* Keep shared TMDB application credentials on the server instead of exposing them in the browser bundle.
* Support optional TMDB account authorization for personal features without requiring an API-key login to browse.
* Simplify deployment by integrating GitHub directly with Vercel.

**Completed: Static frontend hosting**

The repository is connected to Vercel and the production frontend is hosted at [tmdb-app-rho.vercel.app](https://tmdb-app-rho.vercel.app/). Vercel builds with `npm ci` and `npm run build`, serving `dist` from the domain root. Hash routing and the existing client-side authentication, TMDB requests, and account behavior are unchanged. GitHub Pages deployment has been retired.

**Later phases (not part of the hosting migration):** design a narrow Vercel API for the TMDB operations used by the app; move shared TMDB application credentials server-side; update the frontend TMDB service; remove the required API-key login gate; and move user account authorization, session handling, and token storage to a suitably persistent server-side system with appropriate authorization, CSRF, caching, and rate-limit protections.

### Next migration stages

1. **API foundation:** deploy and verify the fixed, read-only TMDB configuration function using the existing `TMDB_API_KEY` as a server-only Vercel environment variable; keep the frontend unchanged.
2. **Catalog-data pilot:** deploy `GET /api/tmdb/trending-movies?page=1`, then compare its response with the existing direct-service response on Preview. Do not switch the frontend yet.
3. **Public read operations:** add allowlisted browsing, search, discovery, and detail operations; test response compatibility while the frontend still uses its existing direct requests.
4. **Frontend cutover:** switch the central TMDB service to the Vercel API in small groups of methods and verify each on Preview.
5. **Credential-free browsing:** remove the app API-key login gate after all public reads use the server API.
6. **Account migration:** separately design persistent storage and secure sessions before moving account authorization or mutations server-side.

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