import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BookmarkX, Heart, StarOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MediaCard } from '@/components/MediaCard';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { PaginationControls } from '@/components/PaginationControls';
import { MediaCategoryToggle, MEDIA_TYPE_OPTIONS } from '@/components/MediaCategoryToggle';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePagination } from '@/hooks/usePagination';
import { interleaveAccountMedia, tmdbService, type TMDBAccountSection, type TMDBAccountMedia } from '@/lib/tmdb';
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
  const { account, isConnected, sessionId, connectTMDBAccount } = useTMDBAccount();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, setPage } = usePagination();
  const [revision, setRevision] = useState(0);
  const [pendingMediaKey, setPendingMediaKey] = useState<string | null>(null);
  const selectedMediaType = searchParams.get('type');
  const mediaType = selectedMediaType === 'movie' || selectedMediaType === 'tv' ? selectedMediaType : 'all';
  const allItemsOffset = (page - 1) * 10;
  const apiPage = mediaType === 'all' ? Math.floor(allItemsOffset / 20) + 1 : page;
  const pageTitle = section === 'watchlist' ? 'Your Watchlist' : section === 'favorites' ? 'Your Favorites' : 'Your Ratings';
  usePageTitle(pageTitle);

  const movieQuery = useCachedQuery(
    `account:${account?.id ?? 'none'}:${section}:movie:${apiPage}:${revision}`,
    (signal) => tmdbService.getAccountList(account?.id ?? 0, section, 'movie', apiPage, sessionId, signal),
    { enabled: isConnected && Boolean(account) && mediaType !== 'tv' },
  );
  const tvQuery = useCachedQuery(
    `account:${account?.id ?? 'none'}:${section}:tv:${apiPage}:${revision}`,
    (signal) => tmdbService.getAccountList(account?.id ?? 0, section, 'tv', apiPage, sessionId, signal),
    { enabled: isConnected && Boolean(account) && mediaType !== 'movie' },
  );
  const loading = movieQuery.loading || tvQuery.loading;
  const error = movieQuery.error ?? tvQuery.error;
  const movieItems = movieQuery.data?.results ?? [];
  const tvItems = tvQuery.data?.results ?? [];
  const items = mediaType === 'all'
    ? interleaveAccountMedia(
        movieItems.slice(allItemsOffset % 20, (allItemsOffset % 20) + 10),
        tvItems.slice(allItemsOffset % 20, (allItemsOffset % 20) + 10),
      )
    : mediaType === 'movie'
      ? movieItems.map((item) => ({ item, mediaType: 'movie' as const }))
      : tvItems.map((item) => ({ item, mediaType: 'tv' as const }));
  const totalPages = Math.min(mediaType === 'all'
    ? Math.max(1, Math.ceil(((movieQuery.data?.total_results ?? 0) + (tvQuery.data?.total_results ?? 0)) / 20))
    : mediaType === 'movie'
      ? movieQuery.data?.total_pages ?? 1
      : tvQuery.data?.total_pages ?? 1, 500);

  const handleMediaTypeChange = (nextType: 'all' | 'movie' | 'tv') => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextType === 'all') nextParams.delete('type');
    else nextParams.set('type', nextType);
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  const handleRemove = async (item: TMDBAccountMedia, itemMediaType: 'movie' | 'tv') => {
    if (!account) return;
    setPendingMediaKey(`${itemMediaType}:${item.id}`);
    try {
      if (section === 'watchlist') {
        await tmdbService.setAccountWatchlist(account.id, itemMediaType, item.id, false, sessionId);
      } else if (section === 'favorites') {
        await tmdbService.setAccountFavorite(account.id, itemMediaType, item.id, false, sessionId);
      } else {
        await tmdbService.deleteMediaRating(itemMediaType, item.id, sessionId);
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
      setPendingMediaKey(null);
    }
  };

  const handleConnect = () => {
    void connectTMDBAccount().catch((error: unknown) => {
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
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
        </div>
        <MediaCategoryToggle
          label="Media type"
          options={MEDIA_TYPE_OPTIONS}
          value={mediaType}
          onChange={handleMediaTypeChange}
        />
      </div>

      <nav aria-label="Account lists" className="flex flex-wrap gap-2 border-b pb-3">
        {accountSections.map(({ id, label }) => (
          <Button key={id} asChild variant={section === id ? 'selected' : 'ghost'} size="sm">
            <Link to={mediaType === 'all' ? `/account/${id}` : `/account/${id}?type=${mediaType}`}>{label}</Link>
          </Button>
        ))}
        <Button asChild variant="ghost" size="sm">
          <Link to="/account/lists">Custom lists</Link>
        </Button>
      </nav>

      {loading ? (
        <MediaGridSkeleton />
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No {mediaType === 'all' ? 'movies or TV shows' : mediaType === 'tv' ? 'TV shows' : 'movies'} in your {section}.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
          {items.map(({ item, mediaType: itemMediaType }) => (
            <div key={`${itemMediaType}:${item.id}`} className="flex min-w-0 flex-col gap-2">
              <MediaCard
                item={item}
                type={itemMediaType}
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
                      disabled={pendingMediaKey === `${itemMediaType}:${item.id}`}
                      onClick={() => void handleRemove(item, itemMediaType)}
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

      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
    </main>
  );
}
