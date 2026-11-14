# Development Workflow

## Overview

This document captures the practical workflow for working on the app day to day. It is meant to complement the architecture, TMDB, and UI guides rather than replace them.

## Local Setup

### Requirements

- Node.js 18 or newer
- npm
- a TMDB API key is optional for local direct catalog requests
- Vercel CLI and the project's server environment variables to test account features locally

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

## Deployment

### Vercel

The repository is connected to Vercel. `vercel.json` sets the Vite framework, install command (`npm ci`), production build command (`npm run build`), and output directory (`dist`). Pushes to `main` trigger production deployments, while tests run separately in GitHub Actions. Vercel builds use the `/` base path, and the app retains hash-based URLs such as `/#/movie/123`; no SPA rewrite is needed.

Configure optional Vite environment variables in the Vercel project settings when the deployment needs them. Every `VITE_*` value is included in the browser bundle and is public, not a server-side secret.

Set `TMDB_API_KEY` as a server-only Vercel environment variable for Production. The deployed public catalog API requires it; never prefix this key with `VITE_`.

To enable account features in Production, connect a Neon Postgres database and expose `DATABASE_URL` to Vercel. Apply `db/schema.sql` to that database. Add server-only `TMDB_V4_ACCESS_TOKEN` and `TMDB_TOKEN_ENCRYPTION_KEY` variables; generate the latter with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Redeploy after setting or rotating environment variables. Do not use a `VITE_` prefix for any TMDB credential or database value.

The app includes a web app manifest and registers its service worker in production, allowing supported browsers to offer installation when served over HTTPS. The worker caches the app shell and same-origin static assets for launch but bypasses `/api/` requests; TMDB API content still requires an internet connection.

## Environment Variables

The app uses Vite-style environment variables for optional client-side behavior.

### Current known variables

- `TMDB_API_KEY` — server-only key for public TMDB requests
- `TMDB_V4_ACCESS_TOKEN` — server-only app token for user custom-list authorization
- `TMDB_TOKEN_ENCRYPTION_KEY` — base64-encoded random 32-byte key used to encrypt user tokens in Neon
- `DATABASE_URL` — Neon Postgres connection string
- `VITE_MOVIE_EMBED_URL` — default watch-link template for movie detail pages
- `VITE_TV_EMBED_URL` — default watch-link template for TV episodes

New variables should be:

- client-safe
- non-secret
- documented when introduced

Movie and TV embed URL templates can be overridden in the authenticated app's **Settings**. The selected content country is also saved in this browser and controls regional movie results, release certifications, and streaming availability. Embed overrides are stored in the current browser; clearing an override falls back to its build-time environment value.

## Working with the TMDB Flow

### Manual testing checklist

1. Start the Vite app, optionally configure a developer API key for direct local catalog requests, and verify public browsing and search.
2. Use `vercel dev` with the server environment variables and Neon schema configured to test account connection, custom-list consent, account operations, and disconnect.
3. Verify that two separate browser profiles connect to different TMDB accounts and see only their own account data.
4. Check the same flows at a narrow smartphone width (around 320–390px): confirm the header, search, navigation, account menus, cards, and dialogs remain usable and there is no unintended horizontal page overflow. Intentional carousels may scroll horizontally.

Personal API keys and TMDB user tokens are not requested for deployed browsing or account features. Local account testing requires the server functions rather than plain Vite.

### Common issue: invalid API key

If the app shows auth errors:

- confirm the API key is correct
- make sure it is entered exactly as provided by TMDB
- verify the local developer key is configured in the app for direct requests

## Editing Guidelines

### Prefer the existing patterns

When making changes:

- keep UI changes aligned with the existing Tailwind + shadcn-style conventions
- keep TMDB requests centralized in the service layer
- reuse existing shared components before introducing new ones
- avoid introducing unnecessary state-management abstractions
- prefer the shared title hook and shared media section component for repeated page-level concerns

### Adding filters to a page

Treat a Filters button as a behavior contract: every control must update the query or local result set, and the active selections must match the results shown. Combine filters so they work together, preserve the page's category constraints, and reset pagination after a filter change. Include a clearly visible text-labeled **Clear filters** action that resets filters to their defaults while retaining the current page/category. Add focused tests for the applied constraints and clearing behavior; for paginated lists, verify the page resets as well.

Use the app's in-page accessible dialog patterns for confirmation, alert, or prompt interactions. Do not call native browser dialog APIs (`window.confirm`, `window.alert`, or `window.prompt`).

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
