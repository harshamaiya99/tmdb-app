// src/App.tsx
import { Layout } from '@/components/Layout';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TitleProvider } from '@/contexts/TitleContext';
import { tmdbService } from '@/lib/tmdb';
import { lazy, Suspense, useEffect, useState } from 'react';
import { EmbedSettingsProvider } from '@/contexts/EmbedSettingsContext';
import { TMDBAccountProvider } from '@/contexts/TMDBAccountContext';
import { ThemeProvider } from '@/hooks/useTheme';

const LoginPage = lazy(() => import('@/pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })));
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const apiKey = localStorage.getItem('tmdb_api_key');
    if (apiKey) {
      tmdbService.setApiKey(apiKey);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  if (isAuthenticated === null) {
    return <AppLoadingSkeleton />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
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
                  <Route path="/" element={<ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/about" element={<ProtectedRoute><Layout><AboutPage /></Layout></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
                  <Route path="/account/callback" element={<ProtectedRoute><AccountCallbackPage /></ProtectedRoute>} />
                  <Route path="/account" element={<Navigate to="/account/watchlist" replace />} />
                  <Route path="/account/lists" element={<ProtectedRoute><Layout><AccountListsPage /></Layout></ProtectedRoute>} />
                  <Route path="/account/lists/:listId" element={<ProtectedRoute><Layout><AccountListsPage /></Layout></ProtectedRoute>} />
                  <Route path="/account/:section" element={<ProtectedRoute><Layout><AccountPage /></Layout></ProtectedRoute>} />
                  <Route path="/movie/:id" element={<ProtectedRoute><Layout><MovieDetailsPage /></Layout></ProtectedRoute>} />
                  <Route path="/tv/:id" element={<ProtectedRoute><Layout><TVShowDetailsPage /></Layout></ProtectedRoute>} />
                  <Route path="/person/:id" element={<ProtectedRoute><Layout><PersonDetailsPage /></Layout></ProtectedRoute>} />
                  <Route path="/category/:category" element={<ProtectedRoute><Layout><MediaListPage /></Layout></ProtectedRoute>} />
                  <Route path="/releases/:date" element={<ProtectedRoute><Layout><ReleaseDateMoviesPage /></Layout></ProtectedRoute>} />
                  <Route path="/movie" element={<ProtectedRoute><Layout><MediaListPage /></Layout></ProtectedRoute>} />
                  <Route path="/tv" element={<ProtectedRoute><Layout><MediaListPage /></Layout></ProtectedRoute>} />
                  <Route path="/person" element={<ProtectedRoute><Layout><PeopleListPage /></Layout></ProtectedRoute>} />
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