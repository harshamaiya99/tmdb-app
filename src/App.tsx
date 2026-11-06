// src/App.tsx
import { Layout } from '@/components/Layout';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { MovieDetailsPage } from '@/pages/MovieDetailsPage';
import { TVShowDetailsPage } from '@/pages/TVShowDetailsPage';
import { PersonDetailsPage } from '@/pages/PersonDetailsPage';
import { MediaListPage } from '@/pages/MediaListPage';
import { PeopleListPage } from '@/pages/PeopleListPage';
import { AccountPage } from '@/pages/AccountPage';
import { AccountCallbackPage } from '@/pages/AccountCallbackPage';
import { AccountListsPage } from '@/pages/AccountListsPage';
import { AboutPage } from '@/pages/AboutPage';
import { Toaster } from '@/components/ui/toaster';
import { TitleProvider } from '@/contexts/TitleContext';
import { tmdbService } from '@/lib/tmdb';
import { useEffect, useState } from 'react';
import { EmbedSettingsProvider } from '@/contexts/EmbedSettingsContext';
import { TMDBAccountProvider } from '@/contexts/TMDBAccountContext';
import { ThemeProvider } from '@/hooks/useTheme';
import { SettingsPage } from '@/pages/SettingsPage';

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
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
                {/* NEW: Map the tab routes to the MediaListPage */}
                <Route path="/movie" element={<ProtectedRoute><Layout><MediaListPage /></Layout></ProtectedRoute>} />
                <Route path="/tv" element={<ProtectedRoute><Layout><MediaListPage /></Layout></ProtectedRoute>} />
                <Route path="/person" element={<ProtectedRoute><Layout><PeopleListPage /></Layout></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Toaster />
            </EmbedSettingsProvider>
          </TMDBAccountProvider>
        </HashRouter>
      </TitleProvider>
    </ThemeProvider>
  );
}

export default App;