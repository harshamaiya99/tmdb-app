import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMBINED_AUTH_STORAGE_KEY, useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { useToast } from '@/components/ui/use-toast';
import { Footer } from '@/components/Footer';

export function AccountCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    canConnectLists,
    completeAuthorization,
    completeListsAuthorization,
    connectListsAccount,
    isListAccountConnected,
  } = useTMDBAccount();
  const { toast } = useToast();
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
      if (!isListsFlow) sessionStorage.removeItem(COMBINED_AUTH_STORAGE_KEY);
      setError('TMDB account authorization was not approved.');
      return;
    }
    if (!requestToken) {
      if (!isListsFlow) sessionStorage.removeItem(COMBINED_AUTH_STORAGE_KEY);
      setError('TMDB did not return an authorization token. Please try connecting again.');
      return;
    }
    if (!approved) {
      sessionStorage.removeItem(isListsFlow ? 'tmdb_list_request_token' : 'tmdb_account_request_token');
      if (!isListsFlow) sessionStorage.removeItem(COMBINED_AUTH_STORAGE_KEY);
      setError('TMDB account authorization was not approved.');
      return;
    }

    let active = true;
    const complete = isListsFlow ? completeListsAuthorization : completeAuthorization;
    void complete(requestToken)
      .then(async () => {
        if (!active) return;
        if (isListsFlow) {
          navigate('/account/lists', { replace: true });
          return;
        }

        const continueCombinedAuthorization = sessionStorage.getItem(COMBINED_AUTH_STORAGE_KEY) === 'true';
        if (continueCombinedAuthorization) {
          sessionStorage.removeItem(COMBINED_AUTH_STORAGE_KEY);
          if (canConnectLists && !isListAccountConnected) {
            await connectListsAccount();
            return;
          }
          if (!canConnectLists && !isListAccountConnected) {
            toast({
              title: 'TMDB account connected',
              description: 'Custom lists also require a v4 access token. Add it on the login screen to enable them.',
            });
          }
        }
        navigate('/account/watchlist', { replace: true });
      })
      .catch((authorizationError: unknown) => {
        if (active) {
          if (!isListsFlow) sessionStorage.removeItem(COMBINED_AUTH_STORAGE_KEY);
          setError(authorizationError instanceof Error
            ? authorizationError.message
            : 'Could not connect your TMDB account.');
        }
      });

    return () => {
      active = false;
    };
  }, [
    approvalStatus,
    approved,
    canConnectLists,
    completeAuthorization,
    completeListsAuthorization,
    connectListsAccount,
    isListAccountConnected,
    isListsFlow,
    navigate,
    requestToken,
    toast,
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="container flex flex-1 items-center justify-center py-8">
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
      <Footer />
    </div>
  );
}
