// src/App.tsx
import { Layout } from '@/components/Layout';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { MovieDetailsPage } from '@/pages/MovieDetailsPage';
import { TVShowDetailsPage } from '@/pages/TVShowDetailsPage';
import { PersonDetailsPage } from '@/pages/PersonDetailsPage';
import { MediaListPage } from '@/pages/MediaListPage';
import { PeopleListPage } from '@/pages/PeopleListPage';
import { Toaster } from '@/components/ui/toaster';
import { TitleProvider } from '@/contexts/TitleContext';
import { tmdbService } from '@/lib/tmdb';
import { useEffect, useState } from 'react';

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
    <TitleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
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
      </BrowserRouter>
    </TitleProvider>
  );
}

export default App;