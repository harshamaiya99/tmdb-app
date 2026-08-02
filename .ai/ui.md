# UI and Design System

## Overview

The app uses a lightweight, polished interface built with React, Tailwind CSS, and shadcn/ui-style primitives. The visual language is intentionally simple: neutral surfaces, subtle borders, rounded corners, and clear hierarchy that keeps the focus on the media content.

## Design Goals

The UI is designed to feel:

- clean and minimal
- readable and modern
- responsive across mobile and desktop
- consistent across pages and components
- focused on browseability rather than heavy visual ornamentation

## Design System Foundations

### Color system

The app uses a semantic design-token approach through CSS variables defined in [src/index.css](src/index.css).

Core tokens include:

- `background`
- `foreground`
- `card`
- `card-foreground`
- `muted`
- `muted-foreground`
- `primary`
- `secondary`
- `accent`
- `border`
- `destructive`

These tokens support both light and dark themes. The implementation uses a classic shadcn-style palette with neutral surfaces and strong contrast for text.

### Typography

The app uses Inter as its primary typeface, loaded from [src/index.css](src/index.css).

Typography conventions include:

- bold, large headings for page and section titles
- medium-weight labels for metadata and UI controls
- muted text for secondary information such as dates, counts, and descriptions
- compact, readable body copy for overviews and summaries

### Spacing and layout

The layout favors:

- consistent container padding via `container` and `py-*` spacing utilities
- generous vertical spacing between major sections
- responsive grids for media cards and detail content
- subtle borders and soft shadows for cards and panels

The overall layout is deliberately airy, with enough spacing to keep the interface from feeling crowded.

## shadcn/ui-style Usage

The project uses shadcn/ui-inspired primitives rather than a full component library dependency. Shared UI pieces live under [src/components/ui](src/components/ui).

### Common primitives

The UI layer includes reusable wrappers for:

- buttons
- cards
- badges
- inputs
- alerts
- toasts
- skeletons

These components are built as thin abstractions over Tailwind classes and semantic structure, which keeps the codebase consistent and easy to extend.

### Component conventions

The shared UI components follow a few recurring patterns:

- they accept `className` for customization
- they use `cn(...)` to merge utility classes safely
- they expose simple variants for common visual states
- they are designed to be composed rather than heavily customized in-place

## Component-Level UI Patterns

### Buttons

Buttons are implemented through [src/components/ui/button.tsx](src/components/ui/button.tsx). They support variants such as:

- `default`
- `outline`
- `secondary`
- `ghost`
- `destructive`
- `link`

This helps maintain a consistent button language across the app.

### Cards

Cards are implemented in [src/components/ui/card.tsx](src/components/ui/card.tsx). They provide a standard surface for content blocks, media previews, onboarding content, and detail sections.

### Media cards

The media browsing experience uses [src/components/MediaCard.tsx](src/components/MediaCard.tsx), which provides a consistent card pattern for movies, TV shows, and people. It combines:

- poster image or fallback placeholder
- title and year metadata
- rating badge
- hover transition effects

### Layout and shell

The shared shell in [src/components/Layout.tsx](src/components/Layout.tsx) provides the sticky header, navigation tabs, search bar, theme switcher, and logout action. The main app chrome is intentionally restrained so the content can take the lead.

## Spacing and Typography Conventions

### Spacing

The UI uses Tailwind spacing scale consistently:

- section spacing uses `py-6`, `py-8`, and `space-y-*`
- card padding uses the built-in primitive spacing
- container width is managed through the shared layout wrapper

### Typography scale

The app uses a mostly straightforward hierarchy:

- large page headers for titles
- medium headings for section labels
- smaller text for metadata and descriptions
- strong emphasis for key values such as ratings or counts

This keeps the reading experience comfortable while still feeling modern.

## Theme System

The theme system is implemented through [src/hooks/useTheme.ts](src/hooks/useTheme.ts) and surfaced by [src/components/ThemeToggle.tsx](src/components/ThemeToggle.tsx).

### How it works

- the current theme is stored in local storage
- the `dark` or `light` class is applied to the root `<html>` element
- the CSS variables in [src/index.css](src/index.css) change depending on the active theme

### Theme behavior

The app supports:

- a light theme by default
- a dark theme toggle in the header
- automatic adaptation of backgrounds, text, borders, and muted surfaces

## Visual Patterns in Practice

The app repeatedly uses a small set of visual patterns:

- bordered cards with soft shadows
- muted metadata text for secondary information
- rounded corners for controls and media tiles
- subtle hover transitions for interactive elements
- a clear separation between content sections via spacing and borders

## Accessibility and Interaction

The UI follows a few accessibility-friendly conventions:

- interactive controls use visible focus states via Tailwind focus-ring utilities
- icon-only controls include screen-reader text through `sr-only` labels
- semantic structure is preserved with meaningful headings, buttons, and links
- hover states are subtle and should not replace keyboard or assistive interaction

## Extension Guidance

When adding UI, follow these conventions:

- reuse the existing primitives in [src/components/ui](src/components/ui) before creating custom styles
- prefer Tailwind utility classes over ad-hoc CSS where possible
- preserve the current neutral, minimal, and content-first visual tone
- keep interactive states subtle and polished
- maintain consistency between light and dark themes

## Summary

The UI is built around a simple shadcn-inspired system with semantic tokens, reusable primitives, responsive layouts, and a clean dark/light theme implementation. The design language is intentionally restrained so the movie and TV browsing experience remains the priority.
