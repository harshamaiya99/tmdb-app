import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BookmarkX, Heart, StarOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MediaCard } from '@/components/MediaCard';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePagination } from '@/hooks/usePagination';
import { tmdbService, type TMDBAccountSection, type TMDBAccountMedia } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';

const accountSections: { id: TMDBAccountSection; label: string }[] = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'ratings', label: 'Ratings' },
];

function isAccountSection(value: string | undefined): value is TMDBAccountSection {
  return accountSections.some((section) => section.id === value);
}

export function AccountPage() {
  const { section: sectionParam } = useParams<{ section: string }>();
  const section = isAccountSection(sectionParam) ? sectionParam : 'watchlist';
  const { account, isConnected, sessionId, connectAccount } = useTMDBAccount();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, setPage } = usePagination();
  const [revision, setRevision] = useState(0);
  const [pendingMediaId, setPendingMediaId] = useState<number | null>(null);
  const mediaType = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const pageTitle = section === 'watchlist' ? 'Your Watchlist' : section === 'favorites' ? 'Your Favorites' : 'Your Ratings';
  usePageTitle(pageTitle);

  const listQuery = useCachedQuery(
    `account:${account?.id ?? 'none'}:${section}:${mediaType}:${page}:${revision}`,
    (signal) => tmdbService.getAccountList(account?.id ?? 0, section, mediaType, page, sessionId, signal),
    { enabled: isConnected && Boolean(account) },
  );
  const items = listQuery.data?.results ?? [];
  const totalPages = Math.min(listQuery.data?.total_pages ?? 1, 500);

  const handleMediaTypeChange = (nextType: 'movie' | 'tv') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', nextType);
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  const handleRemove = async (item: TMDBAccountMedia) => {
    if (!account) return;
    setPendingMediaId(item.id);
    try {
      if (section === 'watchlist') {
        await tmdbService.setAccountWatchlist(account.id, mediaType, item.id, false, sessionId);
      } else if (section === 'favorites') {
        await tmdbService.setAccountFavorite(account.id, mediaType, item.id, false, sessionId);
      } else {
        await tmdbService.deleteMediaRating(mediaType, item.id, sessionId);
      }
      setRevision((value) => value + 1);
      toast({ title: section === 'ratings' ? 'Rating removed' : 'Title removed' });
    } catch (error) {
      toast({
        title: 'Could not update your TMDB account',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingMediaId(null);
    }
  };

  const handleConnect = () => {
    void connectAccount().catch((error: unknown) => {
      toast({
        title: 'Could not start TMDB account connection',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    });
  };

  if (!isConnected || !account) {
    return (
      <main className="container py-8">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-xl font-semibold">Connect your TMDB account</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Approve access on TMDB to view and manage your watchlists, favorites, and ratings. Your API key alone does not grant access to personal account data.
            </p>
            <Button type="button" onClick={handleConnect}>Connect TMDB account</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container space-y-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">TMDB account · {account.username}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{pageTitle}</h1>
        </div>
        <div className="flex rounded-md border p-1" role="group" aria-label="Media type">
          <Button type="button" size="sm" variant={mediaType === 'movie' ? 'secondary' : 'ghost'} aria-pressed={mediaType === 'movie'} onClick={() => handleMediaTypeChange('movie')}>Movies</Button>
          <Button type="button" size="sm" variant={mediaType === 'tv' ? 'secondary' : 'ghost'} aria-pressed={mediaType === 'tv'} onClick={() => handleMediaTypeChange('tv')}>TV shows</Button>
        </div>
      </div>

      <nav aria-label="Account lists" className="flex flex-wrap gap-2 border-b pb-3">
        {accountSections.map(({ id, label }) => (
          <Button key={id} asChild variant={section === id ? 'secondary' : 'ghost'} size="sm">
            <Link to={`/account/${id}?type=${mediaType}`}>{label}</Link>
          </Button>
        ))}
        <Button asChild variant="ghost" size="sm">
          <Link to="/account/lists">Custom lists</Link>
        </Button>
      </nav>

      {listQuery.loading ? (
        <MediaGridSkeleton />
      ) : listQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>{listQuery.error.message}</AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No {mediaType === 'tv' ? 'TV shows' : 'movies'} in your {section}.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
          {items.map((item) => (
            <div key={item.id} className="flex min-w-0 flex-col gap-2">
              <MediaCard
                item={item}
                type={mediaType}
                metadataAction={(
                  <div className="flex items-center gap-1">
                    {section === 'ratings' && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {item.rating?.toFixed(1) ?? '—'}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${
                        section === 'favorites' ? 'text-rose-500 hover:text-rose-400' : 'text-muted-foreground hover:text-destructive'
                      }`}
                      aria-label={`Remove ${'title' in item ? item.title : item.name} from ${section === 'watchlist' ? 'watchlist' : section === 'favorites' ? 'favorites' : 'ratings'}`}
                      title={`Remove from ${section === 'watchlist' ? 'watchlist' : section === 'favorites' ? 'favorites' : 'ratings'}`}
                      disabled={pendingMediaId === item.id}
                      onClick={() => void handleRemove(item)}
                    >
                      {section === 'favorites' ? (
                        <Heart aria-hidden="true" className="h-4 w-4 fill-current" />
                      ) : section === 'watchlist' ? (
                        <BookmarkX aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <StarOff aria-hidden="true" className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-6 border-t pt-6">
          <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</Button>
          <span className="text-sm font-medium text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}
    </main>
  );
}
