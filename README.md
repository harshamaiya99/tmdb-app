# TMDB Browser

A clean, minimal web app for browsing movies, TV shows, and people with data from The Movie Database (TMDB). Built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui-style components.

## Features

- 🔐 User-entered TMDB API key authentication
- 🎬 Browse trending, now-playing, top-rated, upcoming, and streaming-focused movies
- 📺 Explore popular and top-rated TV shows
- 🔍 Search movies, TV shows, and people
- 🧭 Deep-dive detail pages for movies, TV shows, and people
- 🌗 Light/dark theme toggle
- ✨ Responsive, content-first UI with reusable cards and skeleton states

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

### Optional environment variable

The app can use a Vite environment variable for watch-link behavior:

```bash
VITE_MOVIE_EMBED_URL=https://example.com/embed/{TMDB_ID}/{IMDB_ID}
```

## Build and Verification

```bash
npm run build
```

There are no dedicated automated tests in the repository at the moment, so the build is the main verification step after changes.

## Project Structure

```text
src/
├── App.tsx
├── components/
│   ├── ui/                  # shared UI primitives
│   ├── Layout.tsx
│   ├── MediaCard.tsx
│   ├── ReviewSection.tsx
│   ├── ThemeToggle.tsx
│   └── ...
├── contexts/
│   └── TitleContext.tsx
├── hooks/
│   └── useTheme.ts
├── lib/
│   ├── tmdb.ts              # centralized TMDB API integration
│   └── utils.ts
├── pages/
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── MovieDetailsPage.tsx
│   ├── TVShowDetailsPage.tsx
│   ├── PersonDetailsPage.tsx
│   ├── MediaListPage.tsx
│   └── PeopleListPage.tsx
└── index.css
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
