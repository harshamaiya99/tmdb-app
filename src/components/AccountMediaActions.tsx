import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, BookmarkPlus, Heart } from 'lucide-react';
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
}

export function AccountMediaActions({ mediaId, mediaType, mediaTitle }: AccountMediaActionsProps) {
  const { account, isConnected, sessionId } = useTMDBAccount();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<'watchlist' | 'favorite' | null>(null);
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

  if (!isConnected || !account) {
    return (
      <section aria-label="TMDB account actions" className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          <Link to="/account/watchlist" className="text-primary underline-offset-4 hover:underline">
            Connect a TMDB account
          </Link>
          {' '}to manage your watchlist, favorites, and ratings.
        </p>
        <AddToListButton mediaId={mediaId} mediaTitle={mediaTitle} mediaType={mediaType} iconOnly />
      </section>
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
    <section aria-label="TMDB account actions" className="grid min-w-0 grid-cols-3 gap-1">
        <Button
          type="button"
          variant={accountState?.watchlist ? 'selected' : 'outline'}
          size="sm"
          className="h-9 w-full min-w-0 justify-center px-1"
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
          className={`h-9 w-full min-w-0 justify-center px-1${accountState?.favorite ? ' text-rose-600 dark:text-rose-400' : ''}`}
          aria-label={accountState?.favorite ? 'Remove from favorites' : 'Add to favorites'}
          title={accountState?.favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={accountState?.favorite ?? false}
          disabled={pendingAction !== null || !accountState}
          onClick={() => void handleAction('favorite')}
        >
          <Heart aria-hidden="true" className={`h-4 w-4${accountState?.favorite ? ' fill-current' : ''}`} />
          <span className="sr-only">{accountState?.favorite ? 'Favorited' : 'Favorite'}</span>
        </Button>
        <AddToListButton
          mediaId={mediaId}
          mediaTitle={mediaTitle}
          mediaType={mediaType}
          iconOnly
          className="h-9 w-full min-w-0 justify-center px-1"
        />
      {accountStateQuery.error && (
        <span role="alert" className="col-span-3 text-xs text-destructive">Account status unavailable.</span>
      )}
    </section>
  );
}
