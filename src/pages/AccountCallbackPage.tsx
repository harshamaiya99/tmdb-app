import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';

export function AccountCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeAuthorization } = useTMDBAccount();
  const [error, setError] = useState('');
  const requestToken = searchParams.get('request_token') ?? '';
  const approved = searchParams.get('approved') === 'true';

  useEffect(() => {
    if (!approved) {
      sessionStorage.removeItem('tmdb_account_request_token');
      setError('TMDB account authorization was not approved.');
      return;
    }
    if (!requestToken) {
      setError('TMDB did not return an authorization token. Please try connecting again.');
      return;
    }

    let active = true;
    void completeAuthorization(requestToken)
      .then(() => {
        if (active) navigate('/account/watchlist', { replace: true });
      })
      .catch((authorizationError: unknown) => {
        if (active) {
          setError(authorizationError instanceof Error
            ? authorizationError.message
            : 'Could not connect your TMDB account.');
        }
      });

    return () => {
      active = false;
    };
  }, [approved, completeAuthorization, navigate, requestToken]);

  return (
    <main className="container flex min-h-screen items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{error ? 'Could not connect account' : 'Connecting your TMDB account'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <>
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button asChild>
                <Link to="/account/watchlist">Continue to account</Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground" role="status">
              Finishing the secure TMDB authorization...
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
