# Project Roadmap

## Migration: GitHub Pages to Vercel

**Objective:** Migrate the existing React + Vite application from GitHub Pages to Vercel to host both frontend and backend on a single platform.

**Reason for Migration:**

* GitHub Pages supports static hosting and doesn't provide backend execution.
* Vercel supports both frontend hosting and serverless backend functions.
* Securely store TMDB API keys and access tokens using environment variables.
* Simplify deployment by integrating GitHub directly with Vercel.
* Avoid maintaining separate frontend and backend hosting platforms.

**Implementation Roadmap:**

1. Connect the existing GitHub repository to Vercel.
2. Migrate frontend hosting from GitHub Pages to Vercel.
3. Introduce Vercel Serverless Functions for backend API operations.
4. Configure TMDB credentials as server-side environment variables.
5. Update frontend API integrations to communicate with the backend.
6. Test existing functionality, including TMDB login, favourites, watchlists, ratings and custom lists.
7. Disable the GitHub Pages deployment workflow after successful migration.

**Expected Outcome:** A unified React + Vite application with a serverless backend, hosted on Vercel, with secure credential management and automated GitHub deployments.

## Mobile Bottom Navigation

* Relocate the primary navigation tabs (Movies, TV Shows, and People) from the top of the header to a bottom navigation bar specifically for mobile views to improve ergonomics and navigation reach.