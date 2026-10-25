# TMDB Browser

A clean, minimal web app for browsing movies, TV shows, and people with data from The Movie Database (TMDB). Built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui-style components.

**Live site:** [TMDB Browser](https://harshamaiya99.github.io/tmdb-app/)

## Features

- 🔐 User-entered TMDB API key authentication
- 🎬 Browse trending, now-playing, top-rated, upcoming, and streaming-focused movies
- 📺 Explore popular and top-rated TV shows
- 🔍 Search movies, TV shows, and people
- 🧭 Deep-dive detail pages for movies, TV shows, and people
- 🌗 Light/dark theme toggle
- ✨ Responsive, content-first UI with reusable cards, shared media sections, and skeleton states

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

### Optional embed URL templates

For local development, the app reads optional Vite environment variables as the default movie and TV watch-link templates:

```bash
VITE_MOVIE_EMBED_URL=https://example.com/embed/{TMDB_ID}/{IMDB_ID}
VITE_TV_EMBED_URL=https://example.com/tv/{TMDB_ID}/{SEASON}/{EPISODE}
```

On the deployed app, use **Embed link settings** in the header to save templates in that browser. A saved browser value overrides the build-time default; leaving a field blank or choosing **Reset to defaults** uses the build-time value when present. Browser settings are not shared across browsers or devices.

## Build and Verification

```bash
npm run build
```

There are no dedicated automated tests in the repository at the moment, so the build is the main verification step after changes.

## Deploy to GitHub Pages

The repository includes a GitHub Actions workflow that builds and deploys the app to GitHub Pages when changes are pushed to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

The project is configured for the repository site at `https://harshamaiya99.github.io/tmdb-app/`. Client-side routes use hash URLs (for example, `/#/movie/123`) so that direct visits and browser refreshes work with GitHub Pages static hosting.

## Project Structure

```text
.
├── .ai/
│   ├── api.md                          # TMDB integration, authentication, and API behavior
│   ├── architecture.md                # Application structure, routing, and data flow
│   ├── development.md                 # Local development and GitHub Pages workflow
│   └── ui.md                           # UI conventions, design tokens, and component patterns
├── .github/
│   └── workflows/
│       └── deploy.yml                 # Builds and deploys the site to GitHub Pages
├── src/
│   ├── App.tsx                        # Routes, providers, and protected-page access
│   ├── main.tsx                       # React application entry point
│   ├── index.css                      # Global styles, Tailwind layers, and theme variables
│   ├── vite-env.d.ts                  # TypeScript declarations for Vite environment variables
│   ├── components/
│   │   ├── CreditsCarousel.tsx        # Cast and crew carousel
│   │   ├── EpisodesRatingOverview.tsx # Episode rating visualization
│   │   ├── Layout.tsx                 # App header, navigation, search, and embed settings
│   │   ├── LazySection.tsx            # Defers section rendering until near the viewport
│   │   ├── MediaCard.tsx              # Reusable movie, TV, and person card
│   │   ├── MediaGridSkeleton.tsx      # Loading placeholders for media grids
│   │   ├── MediaSection.tsx           # Shared heading and grid/carousel composition
│   │   ├── ReviewSection.tsx          # Review cards with Markdown rendering
│   │   ├── ThemeToggle.tsx            # Light/dark theme control
│   │   ├── TMDBImage.tsx              # Responsive TMDB image rendering and fallback
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
│   │   ├── EmbedSettingsContext.tsx   # Browser-local embed URL overrides and env defaults
│   │   └── TitleContext.tsx           # Shares the current page title with the layout
│   ├── hooks/
│   │   ├── useCachedQuery.ts          # Fetches and tracks cached async queries
│   │   ├── useDebouncedValue.ts       # Debounces values such as search text
│   │   ├── useLazyLoad.ts             # Starts work when a target nears the viewport
│   │   ├── usePageTitle.ts            # Synchronizes page title with title context
│   │   ├── usePagination.ts           # Shared pagination state and behavior
│   │   └── useTheme.ts                # Reads and updates the selected theme
│   ├── lib/
│   │   ├── requestCache.ts            # In-memory request cache and deduplication
│   │   ├── tmdb.ts                    # TMDB API client, requests, and domain types
│   │   ├── utils.ts                   # Shared styling, date, and embed URL helpers
│   │   └── wikimedia.ts               # Wikimedia image lookup helpers
│   └── pages/
│       ├── HomePage.tsx               # Home browsing and search results
│       ├── LoginPage.tsx              # TMDB API key entry and validation
│       ├── MediaListPage.tsx          # Filtered and paginated movie/TV lists
│       ├── MovieDetailsPage.tsx       # Movie details, credits, reviews, and watch link
│       ├── PeopleListPage.tsx         # Paginated people listing
│       ├── PersonDetailsPage.tsx      # Person biography and filmography
│       └── TVShowDetailsPage.tsx      # TV details, seasons, episodes, and watch links
├── .gitignore                         # Excludes dependencies, builds, local env, and editor files
├── .env                                # Local-only Vite settings; ignored by Git and should not be committed
├── AGENTS.md                          # Repository guidance for contributors and coding agents
├── index.html                         # Vite HTML document and React mount element
├── package.json                       # Project scripts and dependency manifest
├── package-lock.json                  # Locked npm dependency versions
├── postcss.config.js                  # PostCSS plugin configuration
├── tailwind.config.js                 # Tailwind theme and content configuration
├── tsconfig.json                      # TypeScript settings for the application
├── tsconfig.node.json                 # TypeScript settings for Vite configuration
└── vite.config.ts                     # Vite plugins, source alias, and GitHub Pages base path
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
