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
import { tmdbService } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';

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
  const { account, isConnected, sessionId } = useTMDBAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { page, setPage } = usePagination();
  const [revision, setRevision] = useState(0);
  const [pendingMediaId, setPendingMediaId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const listsQuery = useCachedQuery(
    `account:${account?.id ?? 'none'}:lists:${page}:${revision}`,
    (signal) => tmdbService.getAccountLists(account?.id ?? 0, page, sessionId, signal),
    { enabled: isConnected && Boolean(account) && !listId },
  );
  const detailQuery = useCachedQuery(
    `account:${account?.id ?? 'none'}:list:${listId ?? 'none'}:${revision}`,
    (signal) => tmdbService.getUserList(listId ?? 0, sessionId, signal),
    { enabled: isConnected && Boolean(account) && Boolean(listId) },
  );
  const list = detailQuery.data;
  usePageTitle(list ? list.name : 'Your Lists');

  const handleRemoveItem = async (mediaId: number) => {
    if (!listId) return;
    setPendingMediaId(mediaId);
    try {
      await tmdbService.removeMediaFromUserList(listId, mediaId, sessionId);
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
      setPendingMediaId(null);
    }
  };

  const handleDeleteList = async () => {
    if (!listId || !window.confirm(`Delete "${list?.name ?? 'this list'}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await tmdbService.deleteUserList(listId, sessionId);
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

  if (!isConnected || !account) {
    return (
      <main className="container py-8">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-xl font-semibold">Connect your TMDB account</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Connect your TMDB account to view and manage your custom lists.
            </p>
            <Button asChild><Link to="/account/watchlist">Account settings</Link></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (listId) {
    const items = list?.items ?? [];
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
            <Button key={to} asChild variant={to === '/account/lists' ? 'secondary' : 'ghost'} size="sm">
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
                  key={item.id}
                  item={item}
                  type="movie"
                  metadataAction={(
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.title} from ${list?.name ?? 'list'}`}
                      title="Remove from list"
                      disabled={pendingMediaId === item.id}
                      onClick={() => void handleRemoveItem(item.id)}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  )}
                />
            ))}
          </div>
        )}

      </main>
    );
  }

  const lists = listsQuery.data?.results ?? [];
  const totalPages = Math.min(listsQuery.data?.total_pages ?? 1, 500);

  return (
    <main className="container space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Lists</h1>
      </div>
      <nav aria-label="Account lists" className="flex flex-wrap gap-2 border-b pb-3">
        {accountNavigation.map(({ to, label }) => (
          <Button key={to} asChild variant={to === '/account/lists' ? 'secondary' : 'ghost'} size="sm">
            <Link to={to}>{label}</Link>
          </Button>
        ))}
      </nav>
      {listsQuery.loading ? (
        <MediaGridSkeleton />
      ) : listsQuery.error ? (
        <Alert variant="destructive"><AlertDescription>{listsQuery.error.message}</AlertDescription></Alert>
      ) : lists.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No custom lists yet. Use <ListPlus aria-hidden="true" className="inline h-4 w-4" /> Add to list on a movie page to create one.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((userList) => (
            <Link key={userList.id} to={`/account/lists/${userList.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardContent className="space-y-2 p-4">
                  <h2 className="line-clamp-2 font-semibold">{userList.name}</h2>
                  {userList.description && <p className="line-clamp-2 text-sm text-muted-foreground">{userList.description}</p>}
                  <p className="text-xs text-muted-foreground">{userList.item_count} {userList.item_count === 1 ? 'title' : 'titles'}</p>
                </CardContent>
              </Card>
            </Link>
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
