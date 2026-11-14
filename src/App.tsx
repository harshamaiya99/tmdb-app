// src/App.tsx
import { Layout } from '@/components/Layout';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TitleProvider } from '@/contexts/TitleContext';
import { tmdbService } from '@/lib/tmdb';
import { lazy, Suspense } from 'react';
import { EmbedSettingsProvider } from '@/contexts/EmbedSettingsContext';
import { TMDBAccountProvider } from '@/contexts/TMDBAccountContext';
import { ThemeProvider } from '@/hooks/useTheme';

const HomePage = lazy(() => import('@/pages/HomePage').then(({ HomePage }) => ({ default: HomePage })));
const MovieDetailsPage = lazy(() => import('@/pages/MovieDetailsPage').then(({ MovieDetailsPage }) => ({ default: MovieDetailsPage })));
const TVShowDetailsPage = lazy(() => import('@/pages/TVShowDetailsPage').then(({ TVShowDetailsPage }) => ({ default: TVShowDetailsPage })));
const PersonDetailsPage = lazy(() => import('@/pages/PersonDetailsPage').then(({ PersonDetailsPage }) => ({ default: PersonDetailsPage })));
const MediaListPage = lazy(() => import('@/pages/MediaListPage').then(({ MediaListPage }) => ({ default: MediaListPage })));
const PeopleListPage = lazy(() => import('@/pages/PeopleListPage').then(({ PeopleListPage }) => ({ default: PeopleListPage })));
const AccountPage = lazy(() => import('@/pages/AccountPage').then(({ AccountPage }) => ({ default: AccountPage })));
const AccountCallbackPage = lazy(() => import('@/pages/AccountCallbackPage').then(({ AccountCallbackPage }) => ({ default: AccountCallbackPage })));
const AccountListsPage = lazy(() => import('@/pages/AccountListsPage').then(({ AccountListsPage }) => ({ default: AccountListsPage })));
const AboutPage = lazy(() => import('@/pages/AboutPage').then(({ AboutPage }) => ({ default: AboutPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(({ SettingsPage }) => ({ default: SettingsPage })));
const ReleaseDateMoviesPage = lazy(() => import('@/pages/ReleaseDateMoviesPage').then(({ ReleaseDateMoviesPage }) => ({ default: ReleaseDateMoviesPage })));

function AppLoadingSkeleton() {
  return (
    <main aria-busy="true" className="min-h-screen">
      <div className="container mx-auto max-w-screen-2xl px-4 py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <MediaGridSkeleton />
      </div>
    </main>
  );
}

function App() {
  if (import.meta.env.DEV) {
    tmdbService.setApiKey(__TMDB_DEV_API_KEY__);
  }

  return (
    <ThemeProvider>
      <TitleProvider>
        <HashRouter>
          <TMDBAccountProvider>
            <EmbedSettingsProvider>
              <Suspense fallback={
                <AppLoadingSkeleton />
              }>
                <Routes>
                  <Route path="/" element={<Layout><HomePage /></Layout>} />
                  <Route path="/about" element={<Layout><AboutPage /></Layout>} />
                  <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
                  <Route path="/account/callback" element={<AccountCallbackPage />} />
                  <Route path="/account" element={<Navigate to="/account/watchlist" replace />} />
                  <Route path="/account/lists" element={<Layout><AccountListsPage /></Layout>} />
                  <Route path="/account/lists/:listId" element={<Layout><AccountListsPage /></Layout>} />
                  <Route path="/account/:section" element={<Layout><AccountPage /></Layout>} />
                  <Route path="/movie/:id" element={<Layout><MovieDetailsPage /></Layout>} />
                  <Route path="/tv/:id" element={<Layout><TVShowDetailsPage /></Layout>} />
                  <Route path="/person/:id" element={<Layout><PersonDetailsPage /></Layout>} />
                  <Route path="/category/:category" element={<Layout><MediaListPage /></Layout>} />
                  <Route path="/releases/:date" element={<Layout><ReleaseDateMoviesPage /></Layout>} />
                  <Route path="/movie" element={<Layout><MediaListPage /></Layout>} />
                  <Route path="/tv" element={<Layout><MediaListPage /></Layout>} />
                  <Route path="/person" element={<Layout><PeopleListPage /></Layout>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              <Toaster />
            </EmbedSettingsProvider>
          </TMDBAccountProvider>
        </HashRouter>
      </TitleProvider>
    </ThemeProvider>
  );
}

export default App;