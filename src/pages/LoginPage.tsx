import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { tmdbService } from '@/lib/tmdb';

export function LoginPage() {
  const { connectAccount, isConnected } = useTMDBAccount();
  const [error, setError] = useState('');
  const [developerApiKey, setDeveloperApiKey] = useState('');
  const [isSavingDeveloperKey, setIsSavingDeveloperKey] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath = (location.state as { from?: unknown } | null)?.from;
  const returnPath = typeof requestedPath === 'string'
    && requestedPath.startsWith('/')
    && !requestedPath.startsWith('//')
    && requestedPath !== '/login'
    ? requestedPath
    : '/';

  const handleConnect = () => {
    setError('');
    if (isConnected) {
      navigate(returnPath, { replace: true });
      return;
    }
    void connectAccount().catch((connectError: unknown) => {
      setError(connectError instanceof Error ? connectError.message : 'Could not start TMDB authorization.');
    });
  };

  const handleSaveDeveloperKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSavingDeveloperKey(true);
    try {
      const isValid = await tmdbService.validateApiKey(developerApiKey.trim());
      if (!isValid) {
        setError('That local development API key could not be validated.');
        return;
      }
      tmdbService.setApiKey(developerApiKey.trim());
      localStorage.setItem('tmdb_api_key', developerApiKey.trim());
      navigate(returnPath, { replace: true });
    } catch (validationError) {
      setError(validationError instanceof Error
        ? validationError.message
        : 'Could not validate the local development API key.');
    } finally {
      setIsSavingDeveloperKey(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>
            You can browse without signing in. Connect your TMDB account only to use personal account features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="button" className="w-full" onClick={handleConnect}>
            {isConnected ? 'Continue to account' : 'Connect TMDB account'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate(returnPath, { replace: true })}
          >
            Continue browsing
          </Button>
          {import.meta.env.DEV && (
            <form onSubmit={handleSaveDeveloperKey} className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Local catalog development only</p>
              <Input
                type="password"
                aria-label="Local developer TMDB API key"
                placeholder="Developer API key"
                value={developerApiKey}
                onChange={(event) => setDeveloperApiKey(event.target.value)}
                disabled={isSavingDeveloperKey}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={isSavingDeveloperKey || !developerApiKey.trim()}
              >
                {isSavingDeveloperKey ? 'Checking key…' : 'Save local developer key'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
