// src/App.tsx
import { Layout } from '@/components/Layout';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { MovieDetailsPage } from '@/pages/MovieDetailsPage';
import { TVShowDetailsPage } from '@/pages/TVShowDetailsPage';
import { PersonDetailsPage } from '@/pages/PersonDetailsPage';
import { MediaListPage } from '@/pages/MediaListPage'; // <-- Add this import
import { Toaster } from '@/components/ui/toaster';
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Layout title="TMDB Explorer"><HomePage /></Layout></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/movie/:id" element={<ProtectedRoute><Layout title="Movie Details"><MovieDetailsPage /></Layout></ProtectedRoute>} />
        <Route path="/tv/:id" element={<ProtectedRoute><Layout title="TV Show Details"><TVShowDetailsPage /></Layout></ProtectedRoute>} />
        <Route path="/person/:id" element={<ProtectedRoute><Layout title="Person Details"><PersonDetailsPage /></Layout></ProtectedRoute>} />
        <Route path="/category/:category" element={<ProtectedRoute><Layout title="Media List"><MediaListPage /></Layout></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;