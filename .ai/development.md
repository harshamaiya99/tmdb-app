# Development Workflow

## Overview

This document captures the practical workflow for working on the app day to day. It is meant to complement the architecture, TMDB, and UI guides rather than replace them.

## Local Setup

### Requirements

- Node.js 18 or newer
- npm
- a valid TMDB API key for manual testing

### Install dependencies

```bash
npm install
```

### Start the app locally

```bash
npm run dev
```

The dev server will usually run on http://localhost:5173 unless Vite chooses another port.

## Common Development Tasks

### Run the app

Use the Vite dev server during implementation and UI iteration.

### Build for verification

Before finishing meaningful work, verify the project still builds:

```bash
npm run build
```

### Run automated tests

Unit and component tests live outside `src/` under `tests/` and run with Vitest in a jsdom environment.

```bash
npm test
npm run test:watch
```

React Testing Library is used for component behavior, while pure utilities and shared logic are tested directly. Tests mock TMDB requests and do not require a real API key. Test tooling is installed as development dependencies and is not imported by the application bundle. The deployment workflow runs the test suite before building the app.

## GitHub Pages Deployment

The `.github/workflows/deploy.yml` workflow builds the app and deploys the `dist` directory to GitHub Pages after pushes to `main` (or a manual workflow dispatch). Set the repository's Pages source to **GitHub Actions** under **Settings → Pages**.

Vite is configured with the `/tmdb-app/` base path for this repository's project site. The app uses hash-based routing, so route URLs look like `/#/movie/123`; this avoids GitHub Pages returning 404 for client-side routes on direct visits or refreshes.

## Environment Variables

The app uses Vite-style environment variables for optional client-side behavior.

### Current known variables

- `VITE_MOVIE_EMBED_URL` — default watch-link template for movie detail pages
- `VITE_TV_EMBED_URL` — default watch-link template for TV episodes

New variables should be:

- client-safe
- non-secret
- documented when introduced

Movie and TV embed URL templates can be overridden in the authenticated app's **Embed link settings**. These overrides are stored in the current browser; clearing an override falls back to its build-time environment value.

## Working with the TMDB Flow

### Manual testing checklist

1. Start the app.
2. Open the login page.
3. Enter a valid TMDB API key.
4. Confirm the app loads home content.
5. Open a movie or TV details page and verify the UI renders expected metadata.
6. Try a search and confirm results load correctly.
7. Verify the shared layout navigation tabs still behave correctly for movies, TV shows, and people.
8. Check the same key flows at a narrow smartphone width (around 320–390px): confirm the header, search, navigation, filters, cards, and dialogs remain usable and there is no unintended horizontal page overflow. Intentional carousels may scroll horizontally.

### Common issue: invalid API key

If the app shows auth errors:

- confirm the API key is correct
- make sure it is entered exactly as provided by TMDB
- verify the app stored the key in local storage and that the service is using it

## Editing Guidelines

### Prefer the existing patterns

When making changes:

- keep UI changes aligned with the existing Tailwind + shadcn-style conventions
- keep TMDB requests centralized in the service layer
- reuse existing shared components before introducing new ones
- avoid introducing unnecessary state-management abstractions
- prefer the shared title hook and shared media section component for repeated page-level concerns

### Before implementing a change

Before writing code, take a short design-review pass:

1. Understand the request.
2. Inspect the relevant files.
3. Review the relevant documentation in [.ai](.ai).
4. Search for existing reusable components, hooks, utilities, types, or service methods.
5. Explain the implementation plan briefly before editing.
6. Implement the solution in the smallest, most maintainable way.

### Current project conventions worth preserving

- Review text is markdown-rendered and should preserve links, bullet lists, emphasis, and headings.
- Bare URLs in review content should be converted to clickable links before rendering.
- Long review cards expand when the card itself is clicked; do not add separate “Read more” text unless the UX expressly requires it.
- Use the shared `formatDate` helper for all dates, with the `dd MMM yyyy` pattern.
- Keep review timestamps next to the rating badge in the card header rather than under the author name.

### AI working style

The AI should approach changes like a senior software engineer:

- understand the existing implementation before editing
- search for reusable code before introducing a new abstraction
- prefer extending existing implementations over creating parallel ones
- keep the architecture simple and maintainable
- avoid duplicating business logic, especially around TMDB requests and shared UI behavior
- if a change introduces duplication, refactor the shared logic rather than copying it

### Keep changes scoped

Small, focused changes are preferred over broad rewrites. If a feature touches routing, data fetching, or UI structure, review the relevant guide in [.ai](.ai) first.

## Debugging Tips

- inspect the browser console for runtime errors
- verify the current route and whether the page is inside the protected layout
- confirm the API key is present before making TMDB requests
- check whether a feature should be implemented in a shared component, shared hook, or a page-local component

## When to Update Documentation

If you make changes that affect:

- routing or app structure
- the TMDB integration layer
- UI conventions or shared components
- environment variables

then update the relevant document in [.ai](.ai) as part of the change.
