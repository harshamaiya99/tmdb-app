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

There are no dedicated automated tests in the repository right now, so the build is the main regression check.

## Environment Variables

The app uses Vite-style environment variables for optional client-side behavior.

### Current known variable

- `VITE_MOVIE_EMBED_URL` — used to build the watch-link destination on movie detail pages

New variables should be:

- client-safe
- non-secret
- documented when introduced

## Working with the TMDB Flow

### Manual testing checklist

1. Start the app.
2. Open the login page.
3. Enter a valid TMDB API key.
4. Confirm the app loads home content.
5. Open a movie or TV details page and verify the UI renders expected metadata.
6. Try a search and confirm results load correctly.

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

### Before implementing a change

Before writing code, take a short design-review pass:

1. Understand the request.
2. Inspect the relevant files.
3. Review the relevant documentation in [.ai](.ai).
4. Search for existing reusable components, hooks, utilities, types, or service methods.
5. Explain the implementation plan briefly before editing.
6. Implement the solution in the smallest, most maintainable way.

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
- check whether a feature should be implemented in a shared component or a page-local component

## When to Update Documentation

If you make changes that affect:

- routing or app structure
- the TMDB integration layer
- UI conventions or shared components
- environment variables

then update the relevant document in [.ai](.ai) as part of the change.
