import { Link, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/Footer';

export function AccountCallbackPage() {
  const [searchParams] = useSearchParams();
  const wasDenied = searchParams.get('error') === 'denied';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="container flex flex-1 items-center justify-center py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{wasDenied ? 'TMDB access was not approved' : 'TMDB account connection'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={wasDenied ? 'destructive' : 'default'}>
              <AlertDescription>
                {wasDenied
                  ? 'You can try connecting your TMDB account again at any time.'
                  : 'Authorization is handled securely by the app. Return to your account page to check connection status.'}
              </AlertDescription>
            </Alert>
            <Button asChild>
              <Link to="/account/watchlist">Continue to account</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
