# Project Roadmap

**Plan 1: Media Card Size Optimization**
* Optimize the size of the media cards specifically for smaller screens so they scale better in the smartphone view.

**Plan 2: Header Bar Optimization**
* Clean up the header by replacing the separate dark/light mode selector, config button, and logout button with a single profile/settings button.
* Create a popup window triggered by this button to house all of these customization settings, keeping both the desktop and smartphone header views clean.

**Plan 3: TMDB User Account Integration**
* Implement TMDB user account functions, such as the watchlist and other relevant account features.
* Place the navigation for these new account features directly inside the profile/settings popup window proposed in Plan 2.

**Plan 4: Episode Details Window Optimization**
* Save space on the episode details window by placing Guest Stars and Crew under a single section with a toggle to switch between them.
* Extract the "Directed by" credit and display it at the top of this area, leaving all remaining crew and stars inside the toggle section.
* Apply this exact same toggle mechanism to separate Images and Videos.

**Plan 5: Mobile Bottom Navigation**

* Relocate the primary navigation tabs (Movies, TV Shows, and People) from the top of the header to a bottom navigation bar specifically for mobile views to improve ergonomics and navigation reach.