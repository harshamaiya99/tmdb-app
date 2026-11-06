import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ListPlus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MediaCard } from '@/components/MediaCard';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePagination } from '@/hooks/usePagination';
import { clearRequestCache } from '@/lib/requestCache';
import { tmdbService, type TMDBUserListItem } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';
import { TMDBImage } from '@/components/TMDBImage';

const accountNavigation = [
  { to: '/account/watchlist', label: 'Watchlist' },
  { to: '/account/favorites', label: 'Favorites' },
  { to: '/account/ratings', label: 'Ratings' },
  { to: '/account/lists', label: 'Custom lists' },
];

export function AccountListsPage() {
  const { listId: listIdParam } = useParams<{ listId?: string }>();
  const parsedListId = Number(listIdParam);
  const listId = Number.isSafeInteger(parsedListId) && parsedListId > 0 ? parsedListId : null;
  const {
    canConnectLists,
    connectTMDBAccount,
    isListAccountConnected,
    listAccessToken,
    listAccountId,
  } = useTMDBAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { page, setPage } = usePagination();
  const [revision, setRevision] = useState(0);
  const [pendingMediaKey, setPendingMediaKey] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const listsQuery = useCachedQuery(
    `account:${listAccountId || 'none'}:lists:${page}:${revision}`,
    (signal) => tmdbService.getAccountLists(listAccountId, page, listAccessToken, signal),
    { enabled: isListAccountConnected && !listId },
  );
  const listSummaries = listsQuery.data?.results ?? [];
  const listPreviewsQuery = useCachedQuery(
    `account:${listAccountId || 'none'}:list-previews:${page}:${revision}`,
    (signal) => tmdbService.getAccountListPreviews(listSummaries, listAccessToken, signal),
    {
      enabled: isListAccountConnected
        && !listId
        && !listsQuery.loading
        && !listsQuery.error
        && listSummaries.length > 0,
    },
  );
  const detailQuery = useCachedQuery(
    `account:${listAccountId || 'none'}:list:${listId ?? 'none'}:${page}:${revision}`,
    (signal) => tmdbService.getUserList(listId ?? 0, listAccessToken, page, signal),
    { enabled: isListAccountConnected && Boolean(listId) },
  );
  const list = detailQuery.data;
  usePageTitle(list ? list.name : 'Your Lists');

  const handleRemoveItem = async (mediaType: 'movie' | 'tv', mediaId: number) => {
    if (!listId) return;
    const mediaKey = `${mediaType}:${mediaId}`;
    setPendingMediaKey(mediaKey);
    try {
      await tmdbService.removeMediaFromUserList(listId, mediaType, mediaId, listAccessToken);
      clearRequestCache('account:');
      setRevision((value) => value + 1);
      toast({ title: 'Title removed from list' });
    } catch (error) {
      toast({
        title: 'Could not remove title from list',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingMediaKey(null);
    }
  };

  const handleDeleteList = async () => {
    if (!listId || !window.confirm(`Delete "${list?.name ?? 'this list'}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await tmdbService.deleteUserList(listId, listAccessToken);
      clearRequestCache('account:');
      toast({ title: 'List deleted' });
      navigate('/account/lists');
    } catch (error) {
      toast({
        title: 'Could not delete list',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConnectLists = () => {
    void connectTMDBAccount().catch((error: unknown) => {
      toast({
        title: 'Could not connect your TMDB account',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    });
  };

  if (!isListAccountConnected) {
    return (
      <main className="container py-8">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-xl font-semibold">Connect your TMDB account</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Connect your TMDB account to view and manage watchlists, favorites, ratings, and custom lists.
            </p>
            {canConnectLists ? (
              <Button type="button" onClick={handleConnectLists}>Connect TMDB account</Button>
            ) : (
              <p role="alert" className="text-sm text-destructive">
                Custom lists need the app-level v4 access token. Enter it on the login screen or configure VITE_TMDB_ACCESS_TOKEN at build time.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  if (listId) {
    const items = list?.results ?? [];
    return (
      <main className="container space-y-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-baseline gap-x-2 break-words text-3xl font-bold tracking-tight">
              <Link to="/account/lists" className="text-muted-foreground hover:text-foreground">Your Lists</Link>
              <span aria-hidden="true" className="text-muted-foreground">&gt;</span>
              <span>{list?.name ?? 'List'}</span>
            </h1>
            {list?.description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{list.description}</p>}
          </div>
          <Button type="button" variant="outline" className="gap-2 text-destructive" disabled={isDeleting} onClick={() => void handleDeleteList()}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Delete list
          </Button>
        </div>

        <nav aria-label="Account lists" className="flex flex-wrap gap-2 border-b pb-3">
          {accountNavigation.map(({ to, label }) => (
            <Button key={to} asChild variant={to === '/account/lists' ? 'selected' : 'ghost'} size="sm">
              <Link to={to}>{label}</Link>
            </Button>
          ))}
        </nav>

        {detailQuery.loading ? (
          <MediaGridSkeleton />
        ) : detailQuery.error ? (
          <Alert variant="destructive"><AlertDescription>{detailQuery.error.message}</AlertDescription></Alert>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">This list is empty.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
            {items.map((item) => (
              <MediaCard
                key={`${item.media_type}:${item.id}`}
                item={item}
                type={item.media_type}
                metadataAction={(
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${item.media_type === 'movie' ? item.title : item.name} from ${list?.name ?? 'list'}`}
                    title="Remove from list"
                    disabled={pendingMediaKey === `${item.media_type}:${item.id}`}
                    onClick={() => void handleRemoveItem(item.media_type, item.id)}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                )}
              />
            ))}
          </div>
        )}
        {list && list.total_pages > 1 && (
          <div className="flex items-center justify-center gap-6 border-t pt-6">
            <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</Button>
            <span className="text-sm font-medium text-muted-foreground">Page {page} of {list.total_pages}</span>
            <Button variant="outline" onClick={() => setPage(Math.min(list.total_pages, page + 1))} disabled={page === list.total_pages}>Next</Button>
          </div>
        )}

      </main>
    );
  }

  const totalPages = Math.min(listsQuery.data?.total_pages ?? 1, 500);

  return (
    <main className="container space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Lists</h1>
      </div>
      <nav aria-label="Account lists" className="flex flex-wrap gap-2 border-b pb-3">
        {accountNavigation.map(({ to, label }) => (
          <Button key={to} asChild variant={to === '/account/lists' ? 'selected' : 'ghost'} size="sm">
            <Link to={to}>{label}</Link>
          </Button>
        ))}
      </nav>
      {listsQuery.loading ? (
        <MediaGridSkeleton />
      ) : listsQuery.error ? (
        <Alert variant="destructive"><AlertDescription>{listsQuery.error.message}</AlertDescription></Alert>
      ) : listSummaries.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No custom lists yet. Use <ListPlus aria-hidden="true" className="inline h-4 w-4" /> Add to list on a movie or TV show page to create one.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listSummaries.map((userList) => {
            const preview = listPreviewsQuery.data?.[userList.id];
            const posterItems = preview?.items.filter((item) => item.poster_path) ?? [];
            return (
              <Link key={userList.id} to={`/account/lists/${userList.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Card className="h-full overflow-hidden transition-colors hover:bg-accent/50">
                  <CardContent className="flex min-h-32 items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <h2 className="line-clamp-2 font-semibold">{userList.name}</h2>
                      {userList.description && <p className="line-clamp-2 text-sm text-muted-foreground">{userList.description}</p>}
                      <p className="text-xs text-muted-foreground">
                        {preview === undefined
                          ? listPreviewsQuery.error ? 'Could not load title count' : 'Loading title count…'
                          : `${preview.count} ${preview.count === 1 ? 'title' : 'titles'}`}
                      </p>
                    </div>
                    {posterItems.length > 0 && (
                      <ListPosterStack items={posterItems} />
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      {listPreviewsQuery.error && (
        <Alert variant="destructive">
          <AlertDescription>Could not load custom-list title counts: {listPreviewsQuery.error.message}</AlertDescription>
        </Alert>
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

function ListPosterStack({ items }: { items: TMDBUserListItem[] }) {
  const stackPositions = [
    'left-0 top-2 rotate-[-12deg]',
    'left-5 top-1 rotate-[-2deg]',
    'left-10 top-2 rotate-[9deg]',
  ];

  return (
    <div aria-hidden="true" className="relative h-24 w-24 shrink-0">
      {items.slice(0, 3).map((item, index) => (
        <div
          key={`${item.media_type}:${item.id}`}
          className={`absolute h-[4.75rem] w-[3.2rem] overflow-hidden rounded-md border border-background bg-muted shadow-md ${stackPositions[index]}`}
        >
          <TMDBImage
            path={item.poster_path}
            alt=""
            width={185}
            height={278}
            sizes="52px"
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
