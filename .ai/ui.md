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

Successful watchlist, favorite, and custom-list additions can provide an in-app destination using `ToastAction` with a router `Link`. Link to the corresponding account section, or to the specific custom list.

Toasts use a muted surface, a subtle foreground ring, and a stronger shadow so they remain distinct from the page background in both themes.

These components are built as thin abstractions over Tailwind classes and semantic structure, which keeps the codebase consistent and easy to extend.

The authenticated `/settings` page keeps content country, embed links, and appearance in separate sections. Country options are loaded from TMDB configuration; the selected country and embed links are saved in browser storage. Theme selection updates the shared theme state immediately.

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

Use in-app accessible dialogs for confirmations, alerts, and prompts. Do not use native browser dialogs such as `window.confirm`, `window.alert`, or `window.prompt`.

Paginated views use the shared [PaginationControls](../src/components/PaginationControls.tsx) component for consistent previous/next controls and page status. Call sites retain responsibility for page state, routing, and any page-specific scroll behavior through its `onPageChange` callback.

### Cards

Cards are implemented in [src/components/ui/card.tsx](src/components/ui/card.tsx). They provide a standard surface for content blocks, media previews, onboarding content, and detail sections.

### Media cards

The media browsing experience uses [src/components/MediaCard.tsx](src/components/MediaCard.tsx), which provides a consistent card pattern for movies, TV shows, and people. It combines:

- poster or profile image, with a fallback placeholder
- a title clamped to two lines and a consistent metadata area
- year and rating for movies and shows, or department for people
- cast role and/or crew job metadata for person-credit cards
- hover transition effects

Keep people cards aligned with movie and show cards. Whenever the `MediaCard` layout or styling changes, preserve the same image aspect ratio, rounded image corners, title height, metadata spacing, and hover behavior for people cards as well. Keep the people loading skeleton in sync with the card layout.

On screens from 360px wide up to the `sm` breakpoint, media grids and horizontal card rows show three cards across with tighter gaps; narrower screens retain two columns for readability. Existing tablet and desktop column counts remain unchanged. Keep loading skeleton grids aligned with these responsive card layouts.

Media imagery is rendered through the shared TMDB image component, which provides responsive `srcSet` candidates, intrinsic dimensions, layout-aware `sizes`, lazy loading by default, and consistent alt text.

Person details place the person's name above the profile on mobile and at the top of the right-hand details column on desktop, matching movie and TV detail title placement. The poster-sized profile and Personal Info stack in the left column on desktop; on mobile from 360px, Personal Info sits beside the portrait. Biography spans the content width below them on mobile and stays in the right column on desktop. TV credit carousels use full page width and show up to 10 cards across at wide desktop sizes.

Person detail galleries use three image columns on mobile, then expand to four or more columns at larger breakpoints. TV credit carousels use full page width and show up to 10 cards across at wide desktop sizes.

### Shared media sections

A reusable section wrapper in [src/components/MediaSection.tsx](src/components/MediaSection.tsx) handles the repeated layout for movie, TV, and person lists with a heading, optional see-more action, and responsive grid or horizontal carousel. This pattern is used on the home page, search results, and person detail credit sections to keep those experiences visually consistent.
Movie and TV detail pages show up to 20 recommended titles (falling back to similar titles) in a horizontally scrollable media carousel. When additional pages are available, See More opens a paginated list of the same related-title type. Person detail pages preview up to 20 movie and TV credits in their carousels, with See All linking to the full paginated credit list when more are available.

The home page, main Movies and TV Shows navigation pages, and their paginated category views use the same category selectors. Movie categories include trending, popular, streaming, in theaters, and top rated; TV categories include trending, popular, and top rated. Home selectors update their carousels, while selectors on list pages update the paginated results without returning home. All use the shared [MediaCategoryToggle.tsx](../src/components/MediaCategoryToggle.tsx) component and selected button styling.
The home page includes a responsive Release Calendar below the Movies and TV Shows carousels. It opens on the current month and supports month navigation and date selection. Selecting a date fetches and caches that day's first page of releases (up to 20) for the configured content region in a horizontal carousel; wide screens show up to seven cards at a time using standard MediaCard sizing. Its See More action opens a paginated page for all movies released on that date.
The home page has a responsive, fixed-height backdrop carousel of up to 20 trending movies and 20 trending TV shows above Movies and TV Shows. Featured titles without a YouTube trailer are skipped, and the current slide remains visible until the next trailer-ready title has loaded. Remaining titles are shuffled and advance automatically with a backdrop crossfade and content transition; transitions respect reduced-motion settings. On mobile, the title reserves space for a second line directly below it, followed by metadata, genre, action buttons, and a three-line overview. The hero shows title details, trailer link, and square watchlist and favorite actions. It is hidden while home search results are displayed; the movie and TV category selectors continue to control their sections below.
On the home page, small-screen section headers keep the title and See More action on the same row, with the full-width category selector below; wider screens keep the title, selector, and See More action together on one row.
The People page places its Popular/Trending segmented toggle beside the page heading on wider screens and on a full-width row below the heading on narrow screens, matching the Movies and TV Shows list layout. Switching tabs resets pagination, and the control remains horizontally scrollable on narrow screens.

The home page Movies and TV Shows headings match the `text-3xl` size of the corresponding main navigation page headings.

On the main Movies and TV Shows pages, keep the category selector grouped on the left beside its heading and put the Filters button on the same row on wider screens. On narrow screens, keep the heading and Filters button together above a full-width, horizontally scrollable category selector. Language, genre, and sort controls on media list pages are tucked into the compact Filters dropdown.
Person credit list pages keep a Movies/TV Shows toggle on the left and Filters on the right; switching media types resets pagination. Genre and original-language filters apply to the person's credits, and sort choices order credits within the Known For cast/crew priority groups.

### Filter controls

Every page that exposes a Filters button must provide working filters, not presentation-only controls. Before adding one, identify the state or URL parameters for each control and verify that changing it affects the fetched or locally displayed results. Compose compatible filters together rather than letting one silently override another; preserve the page/category's baseline constraints when using a general discovery endpoint. When a filter changes, reset pagination and keep the selected values synchronized with the results. Provide a clearly visible, text-labeled **Clear filters** action that restores all filter values to their defaults; do not make it an icon-only or disabled-looking control. Ensure clearing filters preserves the current page identity/category, including route-based filters that need an explicit “all” override. Add or update tests to cover filter composition, clearing/reset behavior, and pagination where practical.

TV show details distinguish the series overview from the selected season overview and individual episode overviews. The selected season summary is shown with its episode list. Episode detail dialogs include an account rating control using the same 0.5-step, 0.5-to-10 star rating interaction as movie and TV detail pages; ratings can be changed or removed, and users are prompted to connect their TMDB account when needed.
Movie and TV show detail pages include a lazy-loaded Media section with image thumbnails labeled by type (backdrop, poster, or logo) and videos labeled by type and source. Images open in a viewer that supports keyboard navigation.

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
- reviews can be sorted by date or rating; reviews without ratings appear last when sorting by rating
- the canonical date format is `dd MMM yyyy` via the shared `formatDate` helper

This keeps the review section compact while still preserving rich formatting from TMDB review entries.

### Layout and shell

The shared shell in [src/components/Layout.tsx](src/components/Layout.tsx) provides the sticky header, navigation tabs, search bar, TMDB account navigation/connection, a link to Settings, logout, and the shared [Footer](../src/components/Footer.tsx). The responsive footer appears on authenticated pages, including the account-authorization callback, but not on login; it includes app branding, browse and settings links, project and TMDB resources, and TMDB attribution. Its bottom spacing keeps content clear of the mobile navigation. When disconnected, the account menu's profile title is a "Login to TMDB" action; incomplete list connections can be finished beside a connected profile, with a compact disconnect action there as well. App logout remains a separate action. Account menu links open the watchlist, favorites, ratings, or custom lists. The authenticated [src/pages/SettingsPage.tsx](src/pages/SettingsPage.tsx) separates content-country, embed-link, and appearance preferences, including theme selection. The country can be saved independently from embed-link edits. Embed-link settings allow multiple movie and TV URL templates and are saved in the current browser; source names are derived from URL hostnames. Settings can be imported and exported as versioned JSON. A single configured link opens directly; multiple links show a source menu. Reset restores build-time defaults. Search suggestions appear as the user types and link directly to movie, TV show, or person details; submitting the form opens the full results page. The main app chrome is intentionally restrained so the content can take the lead.

Movie and TV details expose icon-only watchlist, favorite, Add to list, and rating actions in a single row directly below the poster. When disconnected, each action opens the same TMDB login prompt; completing the prompt starts account authorization. When connected, watchlist and favorite states are loaded and can be toggled, and Add to list opens a dialog to add a title to one or more existing lists or create a new list. The rating action opens a modal with ten star buttons that allow half-point selection from 0.5 to 10, and the selected value is shown in the button when the title has been rated. Membership is loaded from TMDB so the added state persists across refreshes, and each list can be added to or removed from in the dialog. Loading, success, and added states are visible, and new lists are private by default. Custom lists use a separate TMDB v4 user authorization; without it, the dialog explains the connection requirement and provides a connect action. Account pages show paginated movie and TV lists with an All filter selected by default; All interleaves movie and TV results while preserving the newest-first order of each type, since TMDB does not provide a cross-type added timestamp. Movies and TV shows can also be viewed separately. Custom-list overview cards and detail pages show public/private status. Individual custom lists provide the same media type filter, with pagination applied to the selected type across the entire list. Custom-list detail pages let users edit the name, description, and visibility, as well as remove items or delete the list. Favorites and watchlists use compact removal icons beside the year at the bottom of each card. Ratings can be managed from account pages. The Custom lists page lets users browse mixed movie/TV lists.
Movie, TV show, and episode rating dialogs share [RatingDialog](../src/components/RatingDialog.tsx) and [useRatingDialog](../src/hooks/useRatingDialog.ts). Their callers retain endpoint-specific requests, account cache updates, and success/error notifications.

On narrow screens, keep the brand/title and utility controls in one header row. Search is a button until activated; it then expands into an input in that row, receives focus, and retains the existing suggestions and submit behavior. Pressing Escape closes expanded search. The Movies, TV Shows, People, and Account links are in a fixed bottom navigation bar across pages that use the shared shell; the Account item opens the profile/settings menu and uses the user's avatar when available. The bar respects the device safe area, and the footer's bottom spacing keeps its content clear of the mobile navigation. Keep desktop navigation, search field, and profile button in the header. Header utility controls and mobile navigation links should remain comfortable touch targets. The shared container uses 1rem horizontal padding on small screens and returns to 2rem from the `sm` breakpoint upward.

TV show details place cast and crew beside the season ratings heatmap in a 3:2 desktop layout; the sections stack on narrower screens. The heatmap remains horizontally scrollable within its panel. Episode controls stack on narrow screens, and episodes use a responsive grid with up to five cards per row on wide screens. Episode cards use a compact horizontal still-and-details layout below the `sm` breakpoint, then retain the stacked image-over-details layout on wider screens. The episode details dialog stacks its image above the text until there is enough width for a side-by-side layout.

Movie and TV show details keep the title and tagline together above a side-by-side poster and metadata layout on mobile screens from 360px wide. Original language is shown as a clickable badge beside the regional certification/content-rating badge; selecting it opens a paginated list of movies or TV shows with that original language. Original-language codes are shown as English display names when available. IMDb links (when TMDB provides an IMDb ID) and TMDB links appear below the genre badges and open in a new tab. Status and TV season counts sit below the genre badges in the metadata column. Movie budget and revenue appear in a compact financials block after status, with unavailable values omitted. Icon-only watchlist, favorite, and list actions sit directly below the poster on both mobile and desktop. Movie watch controls stay below the poster. Movie and TV streaming providers and production companies appear together in a separate responsive section below the overview. The streaming block uses its content width and production fills the remaining row space, wrapping below when less than 16rem remains. On wide desktop screens, the movie section fills space below the poster and details columns when it fits alongside the trailer/collection column; otherwise it sits below the full details grid. On mobile the sections follow the overview. The overview uses the full page width on mobile and appears below the metadata in the desktop column. On desktop, trailers appear in a separate right-hand column beside the metadata.

Movie details include a media section below reviews when TMDB provides movie images or videos. Images and videos are switchable with labeled tabs, and image/video rows scroll horizontally on narrow screens. Movie images open in an in-page viewer with previous/next navigation and Escape-to-close support.

Company and streaming-provider category pages include a Movies/TV Shows toggle. Switching media type keeps the selected company or provider and its display name, resets pagination, and loads the matching discover results.

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

The shared theme context is implemented through [src/hooks/useTheme.tsx](src/hooks/useTheme.tsx) and provided at the app root. Theme controls are available on the Settings page.

### How it works

- the current theme is stored in local storage
- the `dark` or `light` class is applied to the root `<html>` element
- the CSS variables in [src/index.css](src/index.css) change depending on the active theme

### Theme behavior

The app supports:

- a light theme by default
- a dark theme selection on the Settings page
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