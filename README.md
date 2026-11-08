# TMDB Browser

A clean, minimal web app for browsing movies, TV shows, and people with data from The Movie Database (TMDB). Built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui-style components.

**Live site:** [TMDB Browser](https://harshamaiya99.github.io/tmdb-app/)

## Features

- User-entered TMDB API key authentication
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

## License

This project is licensed under the [MIT License](LICENSE).

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
- A TMDB API key ([Get one here](https://www.themoviedb.org/settings/api))

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

4. Enter your TMDB API key to start browsing
5. To use watchlists, favorites, and ratings, connect your TMDB account from the header's **Settings** menu and approve access on TMDB. Custom lists use TMDB's v4 user authorization and require the app-level `VITE_TMDB_ACCESS_TOKEN`; connect them separately from **Settings → Connect custom lists**. This is separate from the API key login; the app never asks for your TMDB password. Mixed movie/TV lists can be created from a movie or TV detail page, and a title can be saved to multiple lists; membership is shown and can be changed in the **Add to list** dialog. Lists can be managed from **Settings → Custom lists**; new lists are private by default.

### Optional embed URL templates

For local development, the app reads optional Vite environment variables as the default movie and TV watch-link templates:

```bash
VITE_MOVIE_EMBED_URL=https://example.com/embed/{TMDB_ID}/{IMDB_ID}
VITE_TV_EMBED_URL=https://example.com/tv/{TMDB_ID}/{SEASON}/{EPISODE}
```

On the deployed app, open **Settings** from the profile menu to choose the content country, select a theme, and add movie and TV URL templates. The country is used for regional results, certifications, and streaming availability. Embed-link source names are automatically taken from each URL's domain. A single link opens directly from the watch button; multiple links let you choose a source. Use **Import JSON** and **Export JSON** to move these templates between browsers or back them up; imported settings are applied after you choose **Save content settings**. The build-time template is available as the default until browser links are saved, and **Reset content defaults** restores them. Removing all links disables that media type's watch button. Browser settings are not shared across browsers or devices.

The optional TMDB v3 account session and v4 custom-list user access token are stored separately in the browser's local storage. Disconnect each from the **Settings** menu to revoke that credential and remove its local copy. The app-level `VITE_TMDB_ACCESS_TOKEN` is included in the client build and must not be treated as a server-side secret.

## Build and Verification

```bash
npm run build
```

Run the automated test suite and production build with:

```bash
npm test
npm run build
```

## Deploy to GitHub Pages

The repository includes a GitHub Actions workflow that builds and deploys the app to GitHub Pages when changes are pushed to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

The project is configured for the repository site at `https://harshamaiya99.github.io/tmdb-app/`. Client-side routes use hash URLs (for example, `/#/movie/123`) so that direct visits and browser refreshes work with GitHub Pages static hosting.

The site can be installed as an app from supported browsers when served over HTTPS. The service worker caches the app shell and same-origin assets; TMDB content still requires an internet connection.

## Project Structure

```text
.
├── .ai/
│   ├── api.md                          # TMDB integration, authentication, and API behavior
│   ├── architecture.md                # Application structure, routing, and data flow
│   ├── development.md                 # Local development and GitHub Pages workflow
│   ├── roadmap.md                      # Planned project improvements
│   └── ui.md                           # UI conventions, design tokens, and component patterns
├── .github/
│   └── workflows/
│       └── deploy.yml                 # Builds and deploys the site to GitHub Pages
├── public/
│   ├── apple-touch-icon.png           # Icon used when adding the app to an Apple device
│   ├── favicon.svg                    # Browser tab and header logo
│   ├── icon-192.png                   # Installable app icon
│   ├── icon-512.png                   # High-resolution installable app icon
│   ├── manifest.webmanifest           # PWA name, display, theme, and icon settings
│   ├── sw.js                          # Service worker for caching the app shell
│   └── tmdb-logo.svg                  # TMDB logo used for attribution
├── src/
│   ├── App.tsx                        # Routes, providers, and protected-page access
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
│       ├── LoginPage.tsx              # TMDB API key entry and validation
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
│   │   ├── LoginPage.test.tsx         # Login and API key validation behavior
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
├── vite.config.ts                     # Vite plugins, source alias, and GitHub Pages base path
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

MIT
