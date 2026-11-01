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
- `selected` for a high-contrast active state on toggles, segmented controls, and selected navigation
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

- poster or profile image, with a fallback placeholder
- a title clamped to two lines and a consistent metadata area
- year and rating for movies and shows, or department for people
- hover transition effects

Keep people cards aligned with movie and show cards. Whenever the `MediaCard` layout or styling changes, preserve the same image aspect ratio, rounded image corners, title height, metadata spacing, and hover behavior for people cards as well. Keep the people loading skeleton in sync with the card layout.

On screens from 360px wide up to the `sm` breakpoint, media grids and horizontal card rows show three cards across with tighter gaps; narrower screens retain two columns for readability. Existing tablet and desktop column counts remain unchanged. Keep loading skeleton grids aligned with these responsive card layouts.

Media imagery is rendered through the shared TMDB image component, which provides responsive `srcSet` candidates, intrinsic dimensions, layout-aware `sizes`, lazy loading by default, and consistent alt text.

### Shared media sections

A reusable section wrapper in [src/components/MediaSection.tsx](src/components/MediaSection.tsx) handles the repeated layout for movie, TV, and person lists with a heading, optional see-more action, and responsive grid or horizontal carousel. This pattern is used on the home page, search results, and person detail credit sections to keep those experiences visually consistent.

The home page, main Movies and TV Shows navigation pages, and their paginated category views use the same category selectors. Movie categories include trending, popular, streaming, in theaters, and top rated; TV categories include trending, popular, and top rated. Home selectors update their carousels, while selectors on list pages update the paginated results without returning home. All use the shared [MediaCategoryToggle.tsx](../src/components/MediaCategoryToggle.tsx) component and selected button styling.
On the home page, small-screen section headers keep the title and See More action on the same row, with the full-width category selector below; wider screens keep the title, selector, and See More action together on one row.
The People page places its Popular/Trending segmented toggle beside the page heading on wider screens and on a full-width row below the heading on narrow screens, matching the Movies and TV Shows list layout. Switching tabs resets pagination, and the control remains horizontally scrollable on narrow screens.

The home page Movies and TV Shows headings match the `text-3xl` size of the corresponding main navigation page headings.

On the main Movies and TV Shows pages, keep the category selector grouped on the left beside its heading and put the Filters button on the same row on wider screens. On narrow screens, keep the heading and Filters button together above a full-width, horizontally scrollable category selector. Language, genre, and sort controls on media list pages are tucked into the compact Filters dropdown.

TV show details distinguish the series overview from the selected season overview and individual episode overviews. The selected season summary is shown with its episode list.

Episode cards open an in-app details dialog with a compact still, rating and vote count, air date, runtime, production code, director credit above the overview, and overview text. Guest stars and remaining crew share a toggle, and episode images and videos share a separate toggle; show each group only when TMDB returns content. Keep episode cards at a stable size on hover and focus; the watch action stays visible in a pinned dialog footer and uses the configured TV embed URL templates.

### Review cards

Review cards live in [src/components/ReviewSection.tsx](src/components/ReviewSection.tsx) and use a compact, content-first layout.

Current conventions:

- review text is rendered as markdown, not plain text
- `remark-gfm` is enabled so tables, emphasis, lists, and links render naturally
- TMDB `<em>...</em>` tags are converted to markdown emphasis; arbitrary raw HTML is not enabled
- bare URLs are converted into clickable markdown links before rendering
- long reviews expand when the card itself is clicked, instead of showing a separate “Read more” control
- on narrow screens, expanding a review grows its card vertically to show the full content; desktop cards keep their fixed-height, scrollable layout
- mobile expansion preserves the card's top position in the viewport so added content flows downward
- expanded review cards use a subtle primary-tinted background and border, returning to the default surface when collapsed
- short reviews toggle a persistent primary-tinted background and border when tapped; tapping again restores the default surface
- the review date sits beside the rating badge in the header, not beneath the author name
- the canonical date format is `dd MMM yyyy` via the shared `formatDate` helper

This keeps the review section compact while still preserving rich formatting from TMDB review entries.

### Layout and shell

The shared shell in [src/components/Layout.tsx](src/components/Layout.tsx) provides the sticky header, navigation tabs, search bar, and a single settings menu for theme switching, embed-link settings, TMDB account navigation/connection, and logout. Account menu links open the watchlist, favorites, ratings, or custom lists. Embed-link settings allow multiple movie and TV URL templates and are saved in the current browser; source names are derived from URL hostnames. Settings can be imported and exported as versioned JSON. A single configured link opens directly; multiple links show a source menu. Reset restores build-time defaults. Search suggestions appear as the user types and link directly to movie, TV show, or person details; submitting the form opens the full results page. The main app chrome is intentionally restrained so the content can take the lead.

Movie and TV details expose compact, icon-labeled watchlist and favorite toggles that show their active state, plus a rating selector that saves immediately when changed. The controls wrap on narrow screens. Movie and TV details provide an Add to list dialog to add a title to one or more existing lists or create a new list; membership is loaded from TMDB so the added state persists across refreshes, and each list can be added to or removed from in the dialog. Loading, success, and added states are visible, and new lists are private by default. Custom lists use a separate TMDB v4 user authorization; without it, the dialog explains the connection requirement and provides a connect action. Account pages show paginated movie and TV lists with an All filter selected by default; movies and TV shows can also be viewed separately. Favorites and watchlists use compact removal icons beside the year at the bottom of each card. Ratings show the saved score beside the remove-rating icon, and can be changed from the movie or TV detail page. The Custom lists page lets users browse mixed movie/TV lists, remove items, and delete lists.

On narrow screens, the header keeps the brand and utility actions on its top row and places search on a full-width row. The Movies, TV Shows, People, and Account links are in a fixed bottom navigation bar across pages that use the shared shell; the Account item opens the profile/settings menu and uses the user's avatar when available. The bar respects the device safe area and page content has enough bottom padding to remain unobscured. Keep desktop navigation and the profile button in the header. Header utility controls and mobile navigation links should remain comfortable touch targets. The shared container uses 1rem horizontal padding on small screens and returns to 2rem from the `sm` breakpoint upward.

TV show details place cast and crew beside the season ratings heatmap in a 3:2 desktop layout; the sections stack on narrower screens. The heatmap remains horizontally scrollable within its panel. Episode controls stack on narrow screens, and episodes use a responsive grid with up to five cards per row on wide screens. The episode details dialog stacks its image above the text until there is enough width for a side-by-side layout.

Movie and TV show detail posters are centered and capped at 180px wide on mobile so they do not dominate the viewport; at the `md` breakpoint and above, they use the existing 200px desktop column.

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

## Date-format convention

All user-facing dates should follow the shared helper in [src/lib/utils.ts](src/lib/utils.ts):

- format: `dd MMM yyyy`
- example: `27 Sep 2026`

This avoids inconsistent locale formatting across cards, lists, and sections. When a date is displayed in the UI, prefer the shared helper over inline `toLocaleDateString` calls.

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
- below-the-fold detail sections are rendered as they approach the viewport
- dense media grids reserve ten-column layouts for the `2xl` breakpoint to keep cards readable on wide screens

## Extension Guidance

When adding UI, follow these conventions:

- reuse the existing primitives in [src/components/ui](src/components/ui) before creating custom styles
- prefer Tailwind utility classes over ad-hoc CSS where possible
- preserve the current neutral, minimal, and content-first visual tone
- keep interactive states subtle and polished
- maintain consistency between light and dark themes

## Summary

The UI is built around a simple shadcn-inspired system with semantic tokens, reusable primitives, responsive layouts, and a clean dark/light theme implementation. The design language is intentionally restrained so the movie and TV browsing experience remains the priority.
