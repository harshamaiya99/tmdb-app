import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';

export function AccountCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeAuthorization, completeListsAuthorization } = useTMDBAccount();
  const [error, setError] = useState('');
  const redirectParams = new URLSearchParams(window.location.search);
  const isListsFlow = (searchParams.get('flow') ?? redirectParams.get('flow')) === 'lists';
  const requestToken = searchParams.get('request_token')
    ?? redirectParams.get('request_token')
    ?? sessionStorage.getItem(isListsFlow ? 'tmdb_list_request_token' : 'tmdb_account_request_token')
    ?? '';
  const approvalStatus = searchParams.get('approved') ?? redirectParams.get('approved');
  const approved = approvalStatus === 'true'
    || (isListsFlow && approvalStatus === null && Boolean(requestToken));

  useEffect(() => {
    if (approvalStatus === 'false') {
      sessionStorage.removeItem(isListsFlow ? 'tmdb_list_request_token' : 'tmdb_account_request_token');
      setError('TMDB account authorization was not approved.');
      return;
    }
    if (!requestToken) {
      setError('TMDB did not return an authorization token. Please try connecting again.');
      return;
    }
    if (!approved) {
      sessionStorage.removeItem(isListsFlow ? 'tmdb_list_request_token' : 'tmdb_account_request_token');
      setError('TMDB account authorization was not approved.');
      return;
    }

    let active = true;
    const complete = isListsFlow ? completeListsAuthorization : completeAuthorization;
    void complete(requestToken)
      .then(() => {
        if (active) navigate(isListsFlow ? '/account/lists' : '/account/watchlist', { replace: true });
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
  }, [approvalStatus, approved, completeAuthorization, completeListsAuthorization, isListsFlow, navigate, requestToken]);

  return (
    <main className="container flex min-h-screen items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{error ? 'Could not connect account' : isListsFlow ? 'Connecting your TMDB lists' : 'Connecting your TMDB account'}</CardTitle>
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
