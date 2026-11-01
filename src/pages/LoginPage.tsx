import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tmdbService } from '@/lib/tmdb';

export function LoginPage() {
  const [apiKey, setApiKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('Please enter your TMDB API key');
      return;
    }

    setLoading(true);

    try {
      const isValid = await tmdbService.validateApiKey(apiKey);
      
      if (isValid) {
        tmdbService.setApiKey(apiKey);
        tmdbService.setAccessToken(accessToken);
        localStorage.setItem('tmdb_api_key', apiKey);
        if (accessToken.trim()) {
          localStorage.setItem('tmdb_v4_access_token', accessToken.trim());
        } else {
          localStorage.removeItem('tmdb_v4_access_token');
        }
        navigate('/');
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
              Enter your TMDB API key to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  aria-label="TMDB API key"
                  placeholder="API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Don't have an API key?{' '}
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
                {loading ? 'Validating...' : 'Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
