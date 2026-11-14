# TMDB Browser

A clean, minimal web app for browsing movies, TV shows, and people with data from The Movie Database (TMDB). Built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui-style components.

**Live site:** [TMDB Browser](https://tmdb-app-rho.vercel.app/)

## Features

- Public browsing without a personal API key on the deployed site
- Browse trending, now-playing, top-rated, upcoming, and streaming-focused movies
- Explore popular and top-rated TV shows
- Search movies, TV shows, and people
- Deep-dive detail pages for movies, TV shows, and people
- Connect a TMDB account to manage movie/TV watchlists, favorites, ratings, and mixed movie/TV custom lists
- Dedicated Settings page for content country, embed links, and light/dark theme
- About page with TMDB attribution
- Installable as a web app from supported browsers
- Responsive, content-first UI with reusable cards, shared media sections, and skeleton states

## TMDB Attribution

This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.

The app displays the TMDB logo and attribution on its **About** page, available from the profile menu. See the [TMDB API Terms of Use](https://www.themoviedb.org/api-terms-of-use) and [logo and attribution guidelines](https://www.themoviedb.org/about/logos-attribution).

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui-style UI primitives
- Lucide React icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A TMDB API key is not needed for deployed browsing. Plain local Vite catalog requests read `TMDB_API_KEY` from `.env` ([Get one here](https://www.themoviedb.org/settings/api))

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

4. The deployed site browses without asking visitors for an API key. Plain `npm run dev` reads `TMDB_API_KEY` from your local `.env` file for direct catalog requests. This key is only used by local development, not account authorization. There is no API-key login page.
5. To use watchlists, favorites, ratings, or custom lists on the deployed site, choose **Connect TMDB account** and approve access on TMDB. The app handles credentials on its server; users do not enter an API key or access token, and the app never asks for a TMDB password. Custom lists may require a separate TMDB approval the first time. Movies and TV shows can be saved to mixed custom lists from their detail pages; new lists are private by default.

### Vercel account features setup

The account functions use Neon to store each user's TMDB credentials encrypted, and a secure HTTP-only cookie to identify that user's app session. Set up the deployed project as follows:

1. Connect a Neon Postgres database to the Vercel project (for example, through Vercel Marketplace) and make sure `DATABASE_URL` is available to the Production deployment.
2. In the Neon SQL editor, run [`db/schema.sql`](db/schema.sql) to create the account-session and authorization-state tables.
3. In Vercel **Settings → Environment Variables**, add `TMDB_V4_ACCESS_TOKEN` and `TMDB_TOKEN_ENCRYPTION_KEY` for Production. Keep both server-only (do not use a `VITE_` prefix). Generate a fresh 32-byte encryption key with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
4. Keep the existing `TMDB_API_KEY` configured as a server-only Vercel variable. Rotate any app token that was previously exposed in a client build before adding its replacement.
5. Redeploy after setting the variables. Each user then connects their own TMDB account; their account data is tied to their own authorization, not the app owner's account.

Account authorization and account actions need Vercel Functions, so use `vercel dev` rather than plain `npm run dev` to test those flows locally.

### Optional embed URL templates

For local development, the app reads optional Vite environment variables as the default movie and TV watch-link templates:

```bash
VITE_MOVIE_EMBED_URL=https://example.com/embed/{TMDB_ID}/{IMDB_ID}
VITE_TV_EMBED_URL=https://example.com/tv/{TMDB_ID}/{SEASON}/{EPISODE}
```

On the deployed app, open **Settings** from the profile menu to choose the content country, select a theme, and add movie and TV URL templates. The country is used for regional results, certifications, and streaming availability. Embed-link source names are automatically taken from each URL's domain. A single link opens directly from the watch button; multiple links let you choose a source. Use **Import JSON** and **Export JSON** to move these templates between browsers or back them up; imported settings are applied after you choose **Save content settings**. The build-time template is available as the default until browser links are saved, and **Reset content defaults** restores them. Removing all links disables that media type's watch button. Browser settings are not shared across browsers or devices.

TMDB account credentials are stored encrypted in Neon and are never placed in browser storage. The browser receives only an opaque HTTP-only session cookie; temporary v4 authorization request tokens are also held only in short-lived HTTP-only cookies during approval. Disconnecting from the profile menu asks TMDB to revoke the user's credentials and clears the server-side session.

## Build and Verification

```bash
npm run build
```

Run the automated test suite and production build with:

```bash
npm test
npm run build
```

## Deploy to Vercel

The repository is connected to Vercel. The included `vercel.json` configures the Vite framework, `npm ci`, the production build command (`npm run build`), and the `dist` output directory. Pushes to `main` deploy to production. Tests run separately in GitHub Actions.

The app retains hash-based routes (for example, `/#/movie/123`) and is built for the domain root. No SPA rewrite is required. Configure `TMDB_API_KEY` as a server-only Vercel environment variable for Production; public catalog requests use it through Vercel Functions. Do not prefix it with `VITE_`. For local `npm run dev`, the Vite config reads the same variable from `.env` and injects it only into the development server. Optional client environment values prefixed with `VITE_` are embedded in browser builds and are public.

The site can be installed as an app from supported browsers when served over HTTPS. The service worker caches the app shell and same-origin static assets but bypasses `/api/` requests; TMDB content still requires an internet connection.

## Project Structure

```text
.
├── .ai/
│   ├── api.md                               # TMDB integration, account auth flows, and API behavior
│   ├── architecture.md                      # Application architecture, routing, and data flow
│   ├── development.md                       # Local development, Vercel, and deployment workflow
│   ├── roadmap.md                           # Planned improvements and future work
│   └── ui.md                                # UI conventions, design tokens, and component patterns
├── .github/
│   └── workflows/
│       └── test.yml                        # Runs the Vitest suite on pushes and pull requests
├── api/
│   ├── _lib/
│   │   └── account.ts                      # Shared TMDB account helpers and config utilities
│   ├── account/
│   │   ├── action.ts                       # Logged-in TMDB account actions (favorites, ratings, lists)
│   │   ├── logout.ts                       # Revoke account access and clear the app session
│   │   ├── session.ts                      # Reads and manages the current app session
│   │   └── auth/
│   │       ├── callback.ts                 # Handles TMDB OAuth callback and token exchange
│   │       └── start.ts                    # Starts the TMDB account authorization flow
│   └── tmdb/
│       ├── category.ts                     # Allowlisted paginated media and people categories
│       ├── configuration.ts                # Read-only TMDB configuration endpoint
│       ├── discover.ts                    # Validated movie/TV discovery filters and release-date ranges
│       ├── media.ts                        # Media detail and supporting TMDB reads
│       ├── search.ts                      # Search for movies, TV shows, people, and multi-results
│       └── trending-movies.ts              # Trending movies endpoint
├── db/
│   └── schema.sql                          # Neon database schema for account sessions and auth state
├── public/
│   ├── apple-touch-icon.png                # Apple home-screen icon
│   ├── favicon.svg                         # Browser tab icon
│   ├── icon-192.png                        # Installable app icon (192x192)
│   ├── icon-512.png                        # Installable app icon (512x512)
│   ├── manifest.webmanifest                # PWA metadata and install settings
│   ├── sw.js                               # Service worker for app-shell caching
│   └── tmdb-logo.svg                       # TMDB logo for attribution and branding
├── src/
│   ├── App.tsx                             # App routes and global providers
│   ├── index.css                           # Tailwind layers, shared styles, and theme variables
│   ├── main.tsx                            # React application entry point
│   ├── vite-env.d.ts                       # Vite environment declarations
│   ├── components/
│   │   ├── AccountMediaActions.tsx         # Shared account actions for media pages
│   │   ├── AddToListButton.tsx              # Add media to a user-managed TMDB list
│   │   ├── CreditsCarousel.tsx             # Cast and crew carousel UI
│   │   ├── EpisodesRatingOverview.tsx      # Episode rating overview and summary
│   │   ├── Footer.tsx                      # Shared site footer
│   │   ├── Layout.tsx                      # Header, navigation, search, and profile controls
│   │   ├── LazySection.tsx                 # Defer rendering until a section is near the viewport
│   │   ├── MediaCard.tsx                   # Reusable movie, TV, and person card
│   │   ├── MediaCategoryToggle.tsx         # Movie/TV content toggle control
│   │   ├── MediaGridSkeleton.tsx           # Loading placeholders for media grids
│   │   ├── MediaSection.tsx                # Shared section heading and grid composition
│   │   ├── MovieReleaseCalendar.tsx        # Upcoming releases UI
│   │   ├── PaginationControls.tsx          # Page navigation controls
│   │   ├── RatingDialog.tsx                # Rating modal and controls
│   │   ├── ReviewSection.tsx               # Review cards with Markdown rendering
│   │   ├── TMDBImage.tsx                   # Responsive TMDB image loader and fallback
│   │   ├── TVEpisodeRatingAction.tsx       # Per-episode rating action UI
│   │   ├── ThemeToggle.tsx                 # Light/dark theme toggle
│   │   ├── WatchLinkButton.tsx             # Opens configured watch links or handles empty state
│   │   └── ui/
│   │       ├── alert.tsx                  # Alert primitive
│   │       ├── badge.tsx                  # Badge primitive
│   │       ├── button.tsx                 # Button primitive and variants
│   │       ├── card.tsx                   # Card layout primitive
│   │       ├── input.tsx                  # Input primitive
│   │       ├── skeleton.tsx               # Loading skeleton primitive
│   │       ├── toaster.tsx                # Renders queued toast notifications
│   │       ├── toast.tsx                  # Toast primitives
│   │       └── use-toast.ts               # Notification helper and state hook
│   ├── contexts/
│   │   ├── EmbedSettingsContext.tsx       # Browser-local watch-link and embed settings
│   │   ├── TMDBAccountContext.tsx         # TMDB OAuth/account session context
│   │   └── TitleContext.tsx               # Shared page-title state
│   ├── hooks/
│   │   ├── useCachedQuery.ts              # Cached async fetch helper
│   │   ├── useDebouncedValue.ts           # Debounced form/search state
│   │   ├── useLazyLoad.ts                 # Lazy loading near-viewport behavior
│   │   ├── usePageTitle.ts                # Synchronizes document title
│   │   ├── usePagination.ts               # Shared pagination behavior
│   │   ├── useRatingDialog.ts             # Rating-dialog state hook
│   │   ├── useTheme.ts                    # Theme reader and selector hook
│   │   └── useTheme.tsx                   # Theme provider wrapper and state
│   ├── lib/
│   │   ├── accountCache.ts                # Cache layer for account data and derived results
│   │   ├── embedSettings.ts               # Helpers for embed URL templates and settings
│   │   ├── requestCache.ts                # In-memory request deduplication cache
│   │   ├── tmdb.ts                        # Base TMDB request client and shared types
│   │   ├── utils.ts                      # Shared utilities and formatting helpers
│   │   └── wikimedia.ts                   # Wikimedia image lookup utilities
│   └── pages/
│       ├── AboutPage.tsx                  # App info and TMDB attribution
│       ├── AccountCallbackPage.tsx        # OAuth callback page
│       ├── AccountListsPage.tsx           # User-created custom-list management
│       ├── AccountPage.tsx                # Saved favorites, ratings, and watchlists
│       ├── HomePage.tsx                   # Home and search results UI
│       ├── MediaListPage.tsx              # Filtered paginated media list pages
│       ├── MovieDetailsPage.tsx           # Movie details, credits, reviews, and links
│       ├── PeopleListPage.tsx            # Paginated people listing
│       ├── PersonDetailsPage.tsx         # Person biography and filmography
│       ├── ReleaseDateMoviesPage.tsx     # Movies grouped by release date
│       ├── SettingsPage.tsx              # Content country, embed URLs, and theme settings
│       └── TVShowDetailsPage.tsx         # TV details, seasons, episodes, and links
├── tests/
│   ├── components/
│   │   ├── AccountCallbackPage.test.tsx     # OAuth callback page behavior
│   │   ├── AccountMediaActions.test.tsx     # Account media action behavior
│   │   ├── Footer.test.tsx                  # Footer rendering behavior
│   │   ├── MediaCard.test.tsx               # Media card rendering behavior
│   │   ├── PaginationControls.test.tsx      # Pagination logic and keyboard behavior
│   │   ├── RatingDialog.test.tsx            # Rating dialog behavior
│   │   ├── ReviewSection.test.tsx           # Review rendering and interaction behavior
│   │   ├── WatchLinkButton.test.tsx         # Watch-link action behavior
│   │   └── ...
│   ├── pages/
│   │   ├── AboutPage.test.tsx               # About page behavior
│   │   ├── SettingsPage.test.tsx            # Settings page behavior
│   │   └── ...
│   ├── unit/
│   │   ├── accountCache.test.ts             # Account cache tests
│   │   ├── EmbedSettingsContext.test.tsx    # Embed settings context tests
│   │   ├── embedSettings.test.ts            # Embed settings helper tests
│   │   ├── requestCache.test.ts             # Request cache tests
│   │   ├── tmdb.test.ts                     # TMDB client/service tests
│   │   ├── tmdbAccountActionFunction.test.ts        # Vercel account action tests
│   │   ├── tmdbAccountAuthCallbackFunction.test.ts  # Auth callback tests
│   │   ├── tmdbAccountAuthStartFunction.test.ts     # Auth start tests
│   │   ├── tmdbCategoryFunction.test.ts      # Category endpoint tests
│   │   ├── tmdbConfigurationFunction.test.ts  # Config endpoint tests
│   │   ├── tmdbDiscover.test.ts             # Discovery logic tests
│   │   ├── tmdbDiscoverFunction.test.ts     # Discovery API tests
│   │   ├── tmdbMediaFunction.test.ts        # Media endpoint tests
│   │   ├── tmdbPublicLists.test.ts          # Public-list API tests
│   │   ├── tmdbSearchFunction.test.ts       # Search endpoint tests
│   │   ├── tmdbTrendingMoviesFunction.test.ts # Trending endpoint tests
│   │   ├── useCachedQuery.test.tsx          # Cache hook tests
│   │   ├── utils.test.ts                   # Utility tests
│   │   └── ...
│   └── setup.ts                            # Vitest + Testing Library setup
├── .gitignore                             # Git ignore rules
├── .idea/                                 # Local JetBrains project metadata (ignored)
├── .vercel/                               # Local Vercel metadata (ignored)
├── AGENTS.md                              # Contributor and agent guidance
├── LICENSE                                # MIT license
├── README.md                              # Project overview and setup guide
├── index.html                             # Vite HTML shell
├── package.json                           # Scripts and dependency manifest
├── package-lock.json                      # Locked dependency tree
├── postcss.config.js                      # PostCSS config
├── tailwind.config.js                     # Tailwind theme and content config
├── tsconfig.json                          # App TypeScript configuration
├── tsconfig.node.json                     # Vite/Node TypeScript config
├── tsconfig.test.json                     # Test TypeScript config
├── vercel.json                            # Vercel build and output config
├── vite.config.ts                         # Vite config and aliases
├── vitest.config.ts                       # Vitest config and setup
└── .env                                   # Local environment file (not committed)
```

## Documentation

Contributor and agent guidance lives in:

- [AGENTS.md](AGENTS.md)
- [.ai/architecture.md](.ai/architecture.md)
- [.ai/api.md](.ai/api.md)
- [.ai/ui.md](.ai/ui.md)
- [.ai/development.md](.ai/development.md)

## Contributing

If you want to work on the project:

1. Read the relevant guide in [.ai](.ai) before making structural, API, or UI changes.
2. Keep changes scoped and aligned with the existing minimalist app patterns.
3. Verify the app still builds with `npm run build` after meaningful updates.
4. Update the relevant documentation when behavior or structure changes.

## Design Notes

The UI follows a simple, modern pattern:

- Inter font for clean typography
- Neutral surfaces with strong contrast
- Subtle borders, shadows, and rounded corners
- Responsive grids for lists and detail pages
- Consistent spacing and component reuse

## License

This project is licensed under the [MIT License](LICENSE).
