# Project Roadmap

## Migration: GitHub Pages to Vercel

**Objective:** Migrate the existing React + Vite application from GitHub Pages to Vercel to host both frontend and backend on a single platform.

**Reason for Migration:**

* GitHub Pages supports static hosting and doesn't provide backend execution.
* Vercel supports both frontend hosting and serverless backend functions.
* Keep shared TMDB application credentials on the server instead of exposing them in the browser bundle.
* Support optional TMDB account authorization for personal features without requiring an API-key login to browse.
* Simplify deployment by integrating GitHub directly with Vercel.

**Implementation Roadmap:**

1. Connect the existing GitHub repository to Vercel.
2. Migrate frontend hosting from GitHub Pages to Vercel and remove the GitHub Pages-specific Vite base path.
3. Design a narrow Vercel API for the TMDB operations used by the app. Do not expose an arbitrary URL proxy.
4. Configure TMDB application credentials as server-only Vercel environment variables; never use `VITE_*` variables for secrets.
5. Update the frontend TMDB service to call the Vercel API. Keep public TMDB image URLs direct where appropriate.
6. Remove the required API-key login gate so browsing does not require user credentials.
7. Design optional TMDB user authorization for account features. Perform token exchanges and privileged account requests on the server.
8. Use a secure app session (for example, an HttpOnly, Secure, SameSite cookie) and persistent server-side storage for user-specific TMDB session and v4 access tokens. Do not put user tokens in shared environment variables; encrypt sensitive tokens at rest where supported.
9. Protect account-changing endpoints with appropriate authorization and CSRF protections. Validate inputs, restrict CORS to the deployed app origin, apply reasonable rate limits, and prevent shared caching of personalized responses.
10. Update TMDB authorization callback URLs and verify routing against the Vercel production domain.
11. Test public browsing, details, search, TMDB account connection/callback, watchlists, favourites, ratings, custom lists, logout, and failure/expiry cases on a Vercel preview deployment.
12. Disable the GitHub Pages deployment workflow only after the Vercel deployment and required account flows are verified.

**Expected Outcome:** A unified React + Vite application with a serverless backend, hosted on Vercel, with secure credential management and automated GitHub deployments.

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