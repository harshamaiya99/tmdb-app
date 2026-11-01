import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, BookmarkPlus, Heart } from 'lucide-react';
import { AddToListButton } from '@/components/AddToListButton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { clearRequestCache } from '@/lib/requestCache';
import { tmdbService, type TMDBMediaAccountState } from '@/lib/tmdb';

const ratingValues = Array.from({ length: 20 }, (_, index) => (index + 1) / 2);

interface AccountMediaActionsProps {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  mediaTitle: string;
}

export function AccountMediaActions({ mediaId, mediaType, mediaTitle }: AccountMediaActionsProps) {
  const { account, isConnected, sessionId } = useTMDBAccount();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<'watchlist' | 'favorite' | 'rating' | null>(null);
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
        <AddToListButton mediaId={mediaId} mediaTitle={mediaTitle} mediaType={mediaType} />
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

  const handleRating = async (rating: number) => {
    if (!accountState) return;
    const currentState = accountState;
    setPendingAction('rating');
    try {
      await tmdbService.rateMedia(mediaType, mediaId, rating, sessionId);
      clearRequestCache('account:');
      setStateOverride({
        key: accountStateKey,
        value: { ...currentState, rated: { value: rating } },
      });
      toast({ title: 'Rating saved' });
    } catch (error) {
      toast({
        title: 'Could not save your rating',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section aria-label="TMDB account actions" className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={accountState?.watchlist ? 'secondary' : 'outline'}
        size="sm"
        className="gap-1.5"
        aria-pressed={accountState?.watchlist ?? false}
        disabled={pendingAction !== null || !accountState}
        onClick={() => void handleAction('watchlist')}
      >
        {accountState?.watchlist
          ? <BookmarkCheck aria-hidden="true" className="h-4 w-4" />
          : <BookmarkPlus aria-hidden="true" className="h-4 w-4" />}
        {accountState?.watchlist ? 'In watchlist' : 'Watchlist'}
      </Button>
      <Button
        type="button"
        variant={accountState?.favorite ? 'secondary' : 'outline'}
        size="sm"
        className={accountState?.favorite ? 'gap-1.5 text-rose-600 dark:text-rose-400' : 'gap-1.5'}
        aria-pressed={accountState?.favorite ?? false}
        disabled={pendingAction !== null || !accountState}
        onClick={() => void handleAction('favorite')}
      >
        <Heart aria-hidden="true" className={`h-4 w-4${accountState?.favorite ? ' fill-current' : ''}`} />
        {accountState?.favorite ? 'Favorited' : 'Favorite'}
      </Button>
      <AddToListButton mediaId={mediaId} mediaTitle={mediaTitle} mediaType={mediaType} />
      {accountStateQuery.error ? (
        <span role="alert" className="text-xs text-destructive">Account status unavailable.</span>
      ) : (
        <label className="sr-only" htmlFor={`account-rate-${mediaType}-${mediaId}`}>Rate this {mediaType === 'tv' ? 'show' : 'movie'}</label>
      )}
      {!accountStateQuery.error && (
        <select
          id={`account-rate-${mediaType}-${mediaId}`}
          value={accountState?.rated ? String(accountState.rated.value) : ''}
          disabled={pendingAction !== null || !accountState}
          onChange={(event) => void handleRating(Number(event.currentTarget.value))}
          className="h-8 w-32 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="" disabled>{accountStateQuery.loading ? 'Loading…' : 'Rate…'}</option>
          {ratingValues.map((rating) => <option key={rating} value={rating}>{rating.toFixed(1)} / 10</option>)}
        </select>
      )}
    </section>
  );
}
