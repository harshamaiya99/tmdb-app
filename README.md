# TMDB Browser

A clean, minimal web application for browsing movies and TV shows using The Movie Database (TMDB) API. Built with React, TypeScript, and shadcn/ui.

## Features

- 🔐 Secure API key authentication
- 🎬 Browse trending movies and TV shows
- 🔍 Search functionality
- 📱 Fully responsive design
- 🌗 Dark/Light theme toggle
- ✨ Clean, minimal UI with shadcn/ui

## Tech Stack

- **React** + **TypeScript**
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library (Radix UI)
- **React Router** - Client-side routing

## Getting Started

### Prerequisites

- Node.js 18+
- TMDB API key ([Get one here](https://www.themoviedb.org/settings/api))

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser

4. Enter your TMDB API key to start browsing

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── MediaCard.tsx
│   ├── MediaGridSkeleton.tsx
│   └── ThemeToggle.tsx
├── hooks/
│   └── useTheme.ts
├── lib/
│   ├── tmdb.ts          # TMDB API service
│   └── utils.ts
├── pages/
│   ├── LoginPage.tsx
│   ├── HomePage.tsx
│   ├── MovieDetailsPage.tsx
│   └── TVShowDetailsPage.tsx
├── App.tsx
├── main.tsx
└── index.css
```

## Design

This project follows the shadcn/ui design system:
- **Inter** font for clean, modern typography
- Neutral color palette (zinc/slate)
- Subtle borders and shadows
- Minimal, functional layouts
- Consistent spacing and sizing

## License

MIT
