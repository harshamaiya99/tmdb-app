# AGENTS.md

## Purpose

This repository is a React + TypeScript + Vite app for browsing movies, TV shows, and people using the TMDB API. The project is intentionally lightweight and focused on a clean, minimal browsing experience rather than a large app framework.

Contributors and AI coding agents should keep changes aligned with that goal: preserve the simple UX, avoid adding unnecessary complexity, and follow the existing patterns in the codebase.

## Documentation Map

The repository now includes focused guides in [.ai/architecture.md](.ai/architecture.md), [.ai/api.md](.ai/api.md), [.ai/ui.md](.ai/ui.md), and [.ai/development.md](.ai/development.md). When making changes that affect architecture, TMDB integration, UI patterns, or day-to-day workflow, read the relevant guide first.

## Project Goals

- Provide a modern media browser for TMDB content.
- Keep the UI simple, responsive, and polished.
- Use a user-provided TMDB API key for access.
- Favor clear component composition over heavy state-management abstractions.
- Maintain a TypeScript-first codebase with strong typing.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui-style UI primitives
- Lucide React icons

## High-Level Architecture

The app is organized around a few clear layers:

- App shell and routing live in [src/App.tsx](src/App.tsx).
- Route-level pages live in [src/pages](src/pages).
- Reusable UI and feature components live in [src/components](src/components).
- Shared state and app-wide context live in [src/contexts](src/contexts).
- API integration and domain types live in [src/lib/tmdb.ts](src/lib/tmdb.ts).
- Small shared helpers live in [src/lib/utils.ts](src/lib/utils.ts).

### Runtime flow

1. The user enters a TMDB API key on the login page.
2. The key is validated and saved in local storage.
3. Protected routes render the app shell and fetch TMDB data through the central service layer.
4. Pages render content and use shared UI components for cards, skeletons, badges, and toasts.

## Directory Structure

- [src/App.tsx](src/App.tsx) – top-level router, protected-route logic, and global providers
- [src/pages](src/pages) – route pages such as home, details, lists, and login
- [src/components](src/components) – layout, media cards, review section, and shared UI wrappers
- [src/components/ui](src/components/ui) – reusable base UI primitives
- [src/contexts](src/contexts) – context providers such as title state
- [src/hooks](src/hooks) – custom hooks
- [src/lib](src/lib) – TMDB API integration and helper utilities
- [src/styles](src/styles) – styling assets if introduced later

## Architectural Decision Framework

Before making changes, an AI should first understand the existing implementation rather than jumping straight to a new solution. The default approach should be to:

- understand the current implementation before editing
- search the repository for reusable code before creating anything new
- reuse existing components, hooks, utilities, services, and types whenever possible
- prefer extending existing implementations over creating similar ones
- avoid introducing duplicate business logic
- keep the architecture simple and maintainable
- explain architectural decisions before introducing new abstractions

## Coding Conventions

### TypeScript

- Keep the code strictly typed.
- Prefer explicit interfaces and types for TMDB data models.
- Avoid `any` unless there is no reasonable alternative.
- Preserve existing strict-mode compiler settings.

### React patterns

- Prefer functional components and hooks.
- Keep page components focused on rendering and data fetching; avoid burying too much logic in JSX.
- Reuse existing components before creating new ones.
- Use `useEffect` for side effects such as fetching data and syncing title state.

### Import style

- Use the `@/` alias for imports from the application source tree.
- Example: `@/components/ui/button` or `@/lib/tmdb`.
- Keep imports grouped logically and avoid deep relative imports when the alias works.

### Styling

- Use Tailwind utility classes for layout and styling.
- Prefer the existing shadcn/ui-inspired primitives in [src/components/ui](src/components/ui) rather than building ad-hoc components.
- Keep the UI visually consistent with the current dark/light theme support.

### Data loading and error handling

- Handle loading, empty, and error states consistently.
- Use the existing toast pattern for user-facing failures.
- Respect the current loading skeleton experience on list and detail pages.

## Code Reuse Policy

The AI should always search for existing reusable code before creating new implementations. This applies to:

- React components
- Custom hooks
- Utility functions
- Service methods
- Types
- Context providers

Reusable code should live in the existing project structure:

- Shared UI primitives belong in [src/components/ui](src/components/ui)
- Shared feature components belong in [src/components](src/components)
- Hooks belong in [src/hooks](src/hooks)
- Shared utilities and helper logic belong in [src/lib](src/lib)
- API logic should stay in [src/lib/tmdb.ts](src/lib/tmdb.ts)
- Shared types should live in the existing shared type definitions rather than being duplicated in page-level files

When a new feature seems to require a new file, confirm that the existing repository structure does not already offer a better place for the logic.

## Important Design Decisions

- The app uses a user-supplied TMDB API key rather than a server-side secret flow.
- The API key is stored in local storage after successful validation.
- TMDB integration is centralized in [src/lib/tmdb.ts](src/lib/tmdb.ts) so pages do not directly call the API.
- Routing is handled by React Router, with protected routes preventing access until authentication succeeds.
- The header title is shared through the title context so page-specific titles stay consistent with the current route.
- Images come from TMDB and are resolved through the centralized image URL helper.
- The app uses Vite environment variables such as VITE_MOVIE_EMBED_URL for optional watch-link behavior; keep any new environment usage client-safe and non-secret.

## Development Workflow

### Install dependencies

```bash
npm install
```

### Start the dev server

```bash
npm run dev
```

### Build the app

```bash
npm run build
```

There are no dedicated automated tests in this repo at the moment, so building the app is the main verification step after meaningful changes.

## Decision Checklist

Before writing code, the AI should mentally evaluate the following questions:

- Does similar functionality already exist?
- Can an existing component be extended?
- Can this become a reusable hook?
- Can this logic be shared?
- Does this duplicate API functionality?
- Does this belong in the centralized TMDB service?
- Is a new file actually necessary?

This checklist is meant to encourage architectural thinking rather than immediate code generation.

## Refactoring Guidance

If a requested implementation would introduce duplication, the AI should:

- identify the duplication
- propose a reusable abstraction
- preserve backwards compatibility where possible
- refactor existing code where appropriate
- explain why the refactor is beneficial

## Agent Guidance

When working on this repo:

1. Understand the request.
2. Inspect the relevant files.
3. Review the relevant documentation in [.ai](.ai).
4. Identify reusable code.
5. Explain the implementation plan.
6. Then implement the solution.

The AI should behave like a senior software engineer performing design review before implementation. That means reading the existing code, understanding the surrounding architecture, and making deliberate choices rather than jumping straight into a new abstraction or new file.

- Read the relevant page and shared component before editing.
- Follow the existing structure rather than introducing new patterns unless the change clearly requires them.
- Keep changes scoped and avoid unrelated refactors.
- Preserve authentication and routing behavior.
- Do not hardcode or expose API keys.
- Prefer small, composable updates over large rewrites.
- If the change touches structure, data fetching, or UI patterns, consult the relevant document in [.ai](.ai) first.
- Verify the project still builds after meaningful changes.

## Documentation Maintenance Workflow

Keep project documentation current whenever behavior or structure changes.

### Update these files when relevant

- [README.md](README.md) — user-facing overview, setup steps, and high-level project information
- [AGENTS.md](AGENTS.md) — contributor and agent guidance for the repository
- [.ai/architecture.md](.ai/architecture.md) — architecture and system structure
- [.ai/api.md](.ai/api.md) — TMDB integration, auth flow, requests, and limitations
- [.ai/ui.md](.ai/ui.md) — UI system, component conventions, and theme behavior
- [.ai/development.md](.ai/development.md) — local workflow, build steps, and debugging habits

### When to update documentation

Update documentation when you change any of the following:

- app structure, routing, or major component responsibilities
- TMDB API usage, auth behavior, or request patterns
- shared UI conventions, styling tokens, or theme behavior
- local development workflow, build steps, or environment variables
- user-facing setup or usage instructions

### Maintenance expectations

- Keep docs concise, accurate, and aligned with the current codebase.
- Prefer updating the relevant doc alongside the implementation instead of leaving it for later.
- If a change affects both code and behavior, update the relevant documentation in the same change.
- When introducing a new concept or workflow, add or update the appropriate guide rather than relying on scattered comments.
- After any major change to the codebase, review the change set and update [AGENTS.md](AGENTS.md) plus any affected files under [.ai](.ai) so the documentation stays in sync with the implementation.

## Notes for Contributors

- The app is a browsing experience first; prioritize clarity and usability.
- New features should fit the current visual language and component patterns.
- If you add new routes, ensure they are wired correctly in [src/App.tsx](src/App.tsx) and that any relevant list/detail pages support them.
- If you introduce new shared behavior, prefer placing it in the existing app-level abstractions rather than duplicating logic across pages.
