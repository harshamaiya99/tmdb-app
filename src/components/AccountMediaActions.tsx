import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, BookmarkPlus, Heart, ListPlus, UserRound, X } from 'lucide-react';
import { AddToListButton } from '@/components/AddToListButton';
import { Button } from '@/components/ui/button';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { clearRequestCache } from '@/lib/requestCache';
import { tmdbService, type TMDBMediaAccountState } from '@/lib/tmdb';

interface AccountMediaActionsProps {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  mediaTitle: string;
  showAddToList?: boolean;
  squareButtons?: boolean;
}

export function AccountMediaActions({
  mediaId,
  mediaType,
  mediaTitle,
  showAddToList = true,
  squareButtons = false,
}: AccountMediaActionsProps) {
  const { account, connectTMDBAccount, isConnected, sessionId } = useTMDBAccount();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<'watchlist' | 'favorite' | null>(null);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const closeLoginPromptButtonRef = useRef<HTMLButtonElement>(null);
  const accountStateKey = `account:${account?.id ?? 'none'}:state:${mediaType}:${mediaId}`;
  const accountStateQuery = useCachedQuery(
    accountStateKey,
    (signal) => tmdbService.getMediaAccountState(mediaType, mediaId, sessionId, signal),
    { enabled: isConnected && Boolean(account) },
  );
  const [stateOverride, setStateOverride] = useState<{
    key: string;
    value: TMDBMediaAccountState;
  } | null>(null);
  const accountState = stateOverride?.key === accountStateKey
    ? stateOverride.value
    : accountStateQuery.data;

  useEffect(() => {
    if (isLoginPromptOpen) closeLoginPromptButtonRef.current?.focus();
  }, [isLoginPromptOpen]);

  if (!isConnected || !account) {
    const handleLoginPromptKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') setIsLoginPromptOpen(false);
    };

    const handleConnectAccount = () => {
      void connectTMDBAccount().catch((error: unknown) => {
        toast({
          title: 'Could not connect your TMDB account',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      });
    };

    return (
      <>
        <section aria-label="TMDB account actions" className={squareButtons ? 'grid w-fit grid-cols-2 gap-2' : 'grid min-w-0 grid-cols-3 gap-1'}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={squareButtons ? 'h-9 w-9 p-0' : 'h-9 w-full min-w-0 justify-center px-1'}
            aria-label="Add to watchlist"
            title="Add to watchlist"
            onClick={() => setIsLoginPromptOpen(true)}
          >
            <BookmarkPlus aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full min-w-0 justify-center px-1"
            aria-label="Add to favorites"
            title="Add to favorites"
            onClick={() => setIsLoginPromptOpen(true)}
          >
            <Heart aria-hidden="true" className="h-4 w-4" />
          </Button>
          {showAddToList && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full min-w-0 justify-center px-1"
              aria-label="Add to list"
              title="Add to list"
              onClick={() => setIsLoginPromptOpen(true)}
            >
              <ListPlus aria-hidden="true" className="h-4 w-4" />
            </Button>
          )}
        </section>
        {isLoginPromptOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) setIsLoginPromptOpen(false);
            }}
            onKeyDown={handleLoginPromptKeyDown}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="tmdb-login-title"
              className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-xl sm:p-6"
            >
              <header className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 id="tmdb-login-title" className="text-lg font-semibold">Connect your TMDB account</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Log in to TMDB to manage your watchlist, favorites, ratings, and lists.
                  </p>
                </div>
                <Button
                  ref={closeLoginPromptButtonRef}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close dialog"
                  onClick={() => setIsLoginPromptOpen(false)}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </Button>
              </header>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setIsLoginPromptOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleConnectAccount}>
                  <UserRound aria-hidden="true" className="mr-2 h-4 w-4" />
                  Log in to TMDB
                </Button>
              </div>
            </section>
          </div>
        )}
      </>
    );
  }

  const handleAction = async (action: 'watchlist' | 'favorite') => {
    if (!accountState) return;
    const enabled = !accountState[action];
    setPendingAction(action);
    try {
      if (action === 'watchlist') {
        await tmdbService.setAccountWatchlist(account.id, mediaType, mediaId, enabled, sessionId);
      } else {
        await tmdbService.setAccountFavorite(account.id, mediaType, mediaId, enabled, sessionId);
      }
      clearRequestCache('account:');
      setStateOverride({
        key: accountStateKey,
        value: { ...accountState, [action]: enabled },
      });
      toast({
        title: action === 'watchlist'
          ? enabled ? 'Added to watchlist' : 'Removed from watchlist'
          : enabled ? 'Added to favorites' : 'Removed from favorites',
        ...(enabled && {
          action: (
            <ToastAction
              altText={`Go to ${action === 'watchlist' ? 'watchlist' : 'favorites'}`}
              asChild
            >
              <Link to={`/account/${action === 'watchlist' ? 'watchlist' : 'favorites'}`}>
                Go to {action === 'watchlist' ? 'watchlist' : 'favorites'}
              </Link>
            </ToastAction>
          ),
        }),
      });
    } catch (error) {
      toast({
        title: 'Could not update your TMDB account',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section aria-label="TMDB account actions" className={squareButtons ? 'grid w-fit grid-cols-2 gap-2' : 'grid min-w-0 grid-cols-3 gap-1'}>
        <Button
          type="button"
          variant={accountState?.watchlist ? 'selected' : 'outline'}
          size="sm"
          className={squareButtons ? 'h-9 w-9 p-0' : 'h-9 w-full min-w-0 justify-center px-1'}
          aria-label={accountState?.watchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          title={accountState?.watchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          aria-pressed={accountState?.watchlist ?? false}
          disabled={pendingAction !== null || !accountState}
          onClick={() => void handleAction('watchlist')}
        >
          {accountState?.watchlist
            ? <BookmarkCheck aria-hidden="true" className="h-4 w-4" />
            : <BookmarkPlus aria-hidden="true" className="h-4 w-4" />}
          <span className="sr-only">{accountState?.watchlist ? 'In watchlist' : 'Watchlist'}</span>
        </Button>
        <Button
          type="button"
          variant={accountState?.favorite ? 'selected' : 'outline'}
          size="sm"
          className={`${squareButtons ? 'h-9 w-9 p-0' : 'h-9 w-full min-w-0 justify-center px-1'}${accountState?.favorite ? ' text-rose-600 dark:text-rose-400' : ''}`}
          aria-label={accountState?.favorite ? 'Remove from favorites' : 'Add to favorites'}
          title={accountState?.favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={accountState?.favorite ?? false}
          disabled={pendingAction !== null || !accountState}
          onClick={() => void handleAction('favorite')}
        >
          <Heart aria-hidden="true" className={`h-4 w-4${accountState?.favorite ? ' fill-current' : ''}`} />
          <span className="sr-only">{accountState?.favorite ? 'Favorited' : 'Favorite'}</span>
        </Button>
        {showAddToList && (
          <AddToListButton
            mediaId={mediaId}
            mediaTitle={mediaTitle}
            mediaType={mediaType}
            iconOnly
            className="h-9 w-full min-w-0 justify-center px-1"
          />
        )}
      {accountStateQuery.error && (
        <span role="alert" className="col-span-full text-xs text-destructive">Account status unavailable.</span>
      )}
    </section>
  );
}
