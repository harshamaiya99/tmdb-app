# Project Roadmap

## Migration: GitHub Pages to Vercel

**Objective:** Move frontend hosting from GitHub Pages to Vercel first, preserving the existing static app behavior. Backend execution, server-side TMDB credentials, and account-token storage are later work and are explicitly out of scope for this first hosting phase.

**Reason for Migration:**

* GitHub Pages supports static hosting and doesn't provide backend execution.
* Vercel supports both frontend hosting and serverless backend functions.
* Keep shared TMDB application credentials on the server instead of exposing them in the browser bundle.
* Support optional TMDB account authorization for personal features without requiring an API-key login to browse.
* Simplify deployment by integrating GitHub directly with Vercel.

**Phase 1: Static frontend hosting**

1. Connect the existing GitHub repository to Vercel and configure Git-based preview and production deployments.
2. Configure Vercel to install with `npm ci`, build with `npm run build`, and serve `dist` from the domain root; keep tests in the existing GitHub Actions workflow.
3. Keep `HashRouter` and all existing client-side authentication, TMDB requests, and account behavior unchanged.
4. Configure only the existing optional build-time variables needed to preserve current behavior, understanding that `VITE_*` values are public in the client bundle.
5. Verify the Vercel preview, app routes, static assets, existing TMDB flows, and service worker before cutover.
6. Update the live-site link and disable GitHub Pages only after the Vercel production deployment is verified; retain Pages as a fallback until then.

**Later phases (not part of the hosting migration):** design a narrow Vercel API for the TMDB operations used by the app; move shared TMDB application credentials server-side; update the frontend TMDB service; remove the required API-key login gate; and move user account authorization, session handling, and token storage to a suitably persistent server-side system with appropriate authorization, CSRF, caching, and rate-limit protections.

**Phase 1 expected outcome:** The existing React + Vite frontend is hosted on Vercel with GitHub-integrated deployments and behavior equivalent to the current static site. This phase does not provide a backend or improve credential privacy.

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