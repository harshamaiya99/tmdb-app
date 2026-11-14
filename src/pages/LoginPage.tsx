import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tmdbService } from '@/lib/tmdb';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';

export function LoginPage() {
  const [apiKey, setApiKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const { configureV4AccessToken } = useTMDBAccount();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath = (location.state as { from?: unknown } | null)?.from;
  const returnPath = typeof requestedPath === 'string'
    && requestedPath.startsWith('/')
    && !requestedPath.startsWith('//')
    && requestedPath !== '/login'
    ? requestedPath
    : '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('Add a TMDB API key to configure account features, or continue browsing without one.');
      return;
    }

    setLoading(true);

    try {
      const isValid = await tmdbService.validateApiKey(apiKey);
      
      if (isValid) {
        tmdbService.setApiKey(apiKey);
        configureV4AccessToken(accessToken);
        localStorage.setItem('tmdb_api_key', apiKey);
        if (accessToken.trim()) {
          localStorage.setItem('tmdb_v4_access_token', accessToken.trim());
        } else {
          localStorage.removeItem('tmdb_v4_access_token');
        }
        navigate(returnPath, { replace: true });
      } else {
        setError('Invalid API key. Please check and try again.');
      }
    } catch {
      setError('Failed to validate API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>
              Browse without an API key. Add your own key only if you want to connect TMDB account features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  aria-label="TMDB API key (optional)"
                  placeholder="API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  A personal API key is needed to connect watchlists, favorites, ratings, and custom lists.{' '}
                  <a
                    href="https://www.themoviedb.org/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Get one here
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  aria-label="TMDB v4 access token"
                  placeholder="v4 access token (optional)"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Required for custom lists. It is stored in this browser and is visible to anyone who can inspect the app.
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Validating...' : 'Save key and continue'}
              </Button>
            </form>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => navigate('/', { replace: true })}
              disabled={loading}
            >
              Continue browsing without an API key
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
