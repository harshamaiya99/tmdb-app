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
│   ├── api.md                          # TMDB integration, authentication, and API behavior
│   ├── architecture.md                # Application structure, routing, and data flow
│   ├── development.md                 # Local development and deployment workflow
│   ├── roadmap.md                      # Planned project improvements
│   └── ui.md                           # UI conventions, design tokens, and component patterns
├── .github/
│   └── workflows/
│       └── test.yml                    # Runs tests on pushes and pull requests to main
├── api/
│   └── tmdb/
│       ├── configuration.ts            # Server-side TMDB configuration endpoint
│       ├── trending-movies.ts          # Read-only trending movies endpoint
│       ├── category.ts                 # Allowlisted paginated media and people categories
│       ├── search.ts                   # Allowlisted movie, TV, person, and multi-search
│       ├── media.ts                    # Allowlisted media details and supporting reads
│       └── discover.ts                 # Validated movie/TV filters and release-date ranges
├── vercel.json                        # Vercel Vite build and output configuration
├── public/
│   ├── apple-touch-icon.png           # Icon used when adding the app to an Apple device
│   ├── favicon.svg                    # Browser tab and header logo
│   ├── icon-192.png                   # Installable app icon
│   ├── icon-512.png                   # High-resolution installable app icon
│   ├── manifest.webmanifest           # PWA name, display, theme, and icon settings
│   ├── sw.js                          # Service worker for caching the app shell
│   └── tmdb-logo.svg                  # TMDB logo used for attribution
├── src/
│   ├── App.tsx                        # Routes and global providers
│   ├── main.tsx                       # React application entry point
│   ├── index.css                      # Global styles, Tailwind layers, and theme variables
│   ├── vite-env.d.ts                  # TypeScript declarations for Vite environment variables
│   ├── components/
│   │   ├── CreditsCarousel.tsx        # Cast and crew carousel
│   │   ├── EpisodesRatingOverview.tsx # Episode rating visualization
│   │   ├── AccountMediaActions.tsx    # TMDB account actions on media detail pages
│   │   ├── AddToListButton.tsx        # Add movies and TV shows to TMDB custom lists
│   │   ├── Footer.tsx                 # Shared site footer
│   │   ├── Layout.tsx                 # App header, navigation, search, and settings menu
│   │   ├── LazySection.tsx            # Defers section rendering until near the viewport
│   │   ├── MediaCard.tsx              # Reusable movie, TV, and person card
│   │   ├── MediaCategoryToggle.tsx    # Movie/TV category selector
│   │   ├── MediaGridSkeleton.tsx      # Loading placeholders for media grids
│   │   ├── MediaSection.tsx           # Shared heading and grid/carousel composition
│   │   ├── MovieReleaseCalendar.tsx   # Upcoming movie release calendar
│   │   ├── ReviewSection.tsx          # Review cards with Markdown rendering
│   │   ├── ThemeToggle.tsx            # Light/dark theme control
│   │   ├── TMDBImage.tsx              # Responsive TMDB image rendering and fallback
│   │   ├── WatchLinkButton.tsx        # Opens configured media watch links
│   │   └── ui/
│   │       ├── alert.tsx              # Alert primitive
│   │       ├── badge.tsx              # Badge primitive
│   │       ├── button.tsx             # Button primitive and variants
│   │       ├── card.tsx               # Card layout primitives
│   │       ├── input.tsx              # Styled input primitive
│   │       ├── skeleton.tsx           # Loading skeleton primitive
│   │       ├── toast.tsx              # Toast primitives
│   │       ├── toaster.tsx            # Renders queued toast notifications
│   │       └── use-toast.ts           # Toast state and notification helper
│   ├── contexts/
│   │   ├── TMDBAccountContext.tsx     # TMDB consent flow and browser-local account session
│   │   ├── EmbedSettingsContext.tsx   # Browser-local embed URL overrides and env defaults
│   │   └── TitleContext.tsx           # Shares the current page title with the layout
│   ├── hooks/
│   │   ├── useCachedQuery.ts          # Fetches and tracks cached async queries
│   │   ├── useDebouncedValue.ts       # Debounces values such as search text
│   │   ├── useLazyLoad.ts             # Starts work when a target nears the viewport
│   │   ├── usePageTitle.ts            # Synchronizes page title with title context
│   │   ├── usePagination.ts           # Shared pagination state and behavior
│   │   ├── useTheme.ts                # Theme hook
│   │   └── useTheme.tsx               # Shares theme state and applies the selected theme
│   ├── lib/
│   │   ├── embedSettings.ts           # Embed URL settings helpers
│   │   ├── requestCache.ts            # In-memory request cache and deduplication
│   │   ├── tmdb.ts                    # TMDB API client, requests, and domain types
│   │   ├── utils.ts                   # Shared styling, date, and embed URL helpers
│   │   └── wikimedia.ts               # Wikimedia image lookup helpers
│   └── pages/
│       ├── AboutPage.tsx              # App information and TMDB attribution
│       ├── AccountCallbackPage.tsx    # TMDB user authorization callback
│       ├── AccountListsPage.tsx       # Browse, view, and manage custom lists
│       ├── AccountPage.tsx            # Watchlists, favorites, and ratings
│       ├── HomePage.tsx               # Home browsing and search results
│       ├── MediaListPage.tsx          # Filtered and paginated movie/TV lists
│       ├── MovieDetailsPage.tsx       # Movie details, credits, reviews, and watch link
│       ├── PeopleListPage.tsx         # Paginated people listing
│       ├── PersonDetailsPage.tsx      # Person biography and filmography
│       ├── ReleaseDateMoviesPage.tsx  # Movies grouped by release date
│       ├── SettingsPage.tsx           # Content, embed link, and theme settings
│       └── TVShowDetailsPage.tsx      # TV details, seasons, episodes, and watch links
├── tests/
│   ├── components/
│   │   ├── AccountCallbackPage.test.tsx # Account authorization callback behavior
│   │   ├── Footer.test.tsx            # Footer rendering behavior
│   │   ├── MediaCard.test.tsx         # Media card rendering behavior
│   │   ├── ReviewSection.test.tsx     # Review rendering and interaction behavior
│   │   └── WatchLinkButton.test.tsx   # Watch link behavior
│   ├── pages/
│   │   ├── AboutPage.test.tsx         # About page and attribution behavior
│   │   └── SettingsPage.test.tsx      # Settings page behavior
│   ├── unit/
│   │   ├── EmbedSettingsContext.test.tsx # Embed settings context behavior
│   │   ├── embedSettings.test.ts      # Embed settings helper behavior
│   │   ├── requestCache.test.ts       # Request cache behavior
│   │   ├── tmdb.test.ts               # TMDB service behavior
│   │   └── utils.test.ts              # Shared utility behavior
│   └── setup.ts                       # Vitest and Testing Library setup
├── .gitignore                         # Excludes dependencies, builds, local env, and editor files
├── AGENTS.md                          # Repository guidance for contributors and coding agents
├── index.html                         # Vite HTML document and React mount element
├── LICENSE                            # MIT License
├── README.md                          # Project overview, setup, and documentation
├── package.json                       # Project scripts and dependency manifest
├── package-lock.json                  # Locked npm dependency versions
├── postcss.config.js                  # PostCSS plugin configuration
├── tailwind.config.js                 # Tailwind theme and content configuration
├── tsconfig.json                      # TypeScript settings for the application
├── tsconfig.node.json                 # TypeScript settings for Vite configuration
├── tsconfig.test.json                 # TypeScript settings for tests
├── vite.config.ts                     # Vite plugins, source alias, and root base path
└── vitest.config.ts                   # Vitest test environment and setup configuration
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
