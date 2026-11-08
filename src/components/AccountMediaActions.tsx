import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, BookmarkPlus, Heart, ListPlus, Star, UserRound, X } from 'lucide-react';
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
  showRatings?: boolean;
  squareButtons?: boolean;
}

export function AccountMediaActions({
  mediaId,
  mediaType,
  mediaTitle,
  showAddToList = true,
  showRatings = true,
  squareButtons = false,
}: AccountMediaActionsProps) {
  const { account, connectTMDBAccount, isConnected, sessionId } = useTMDBAccount();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<'watchlist' | 'favorite' | null>(null);
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const closeLoginPromptButtonRef = useRef<HTMLButtonElement>(null);
  const closeRatingDialogButtonRef = useRef<HTMLButtonElement>(null);
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
  const currentRating = typeof accountState?.rated === 'object' ? accountState.rated.value : null;

  useEffect(() => {
    if (isLoginPromptOpen) closeLoginPromptButtonRef.current?.focus();
  }, [isLoginPromptOpen]);

  useEffect(() => {
    if (isRatingOpen) closeRatingDialogButtonRef.current?.focus();
  }, [isRatingOpen]);

  const closeRatingDialog = () => {
    setIsRatingOpen(false);
    setHoveredRating(null);
  };

  const handleRatingKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && pendingRating === null) closeRatingDialog();
  };

  const getRatingFromPointer = (event: ReactMouseEvent<HTMLButtonElement>, starValue: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const isLeftHalf = event.clientX - rect.left < rect.width / 2;
    const nextRating = isLeftHalf ? starValue - 0.5 : starValue;
    return Math.min(10, Math.max(0.5, nextRating));
  };

  const handleRateSelection = async (rating: number) => {
    if (!accountState || !account) return;
    setPendingRating(rating);
    try {
      await tmdbService.rateMedia(mediaType, mediaId, rating, sessionId);
      clearRequestCache('account:');
      setStateOverride({
        key: accountStateKey,
        value: { ...accountState, rated: { value: rating } },
      });
      toast({ title: `Rated ${rating.toFixed(1)}` });
      closeRatingDialog();
    } catch (error) {
      toast({
        title: 'Could not save your rating',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingRating(null);
    }
  };

  const handleRemoveRating = async () => {
    if (!account || !accountState || accountState.rated === false) return;
    setPendingRating(-1);
    try {
      await tmdbService.deleteMediaRating(mediaType, mediaId, sessionId);
      clearRequestCache('account:');
      setStateOverride({
        key: accountStateKey,
        value: { ...accountState, rated: false },
      });
      toast({ title: 'Rating removed' });
      closeRatingDialog();
    } catch (error) {
      toast({
        title: 'Could not remove your rating',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingRating(null);
    }
  };

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
        <section aria-label="TMDB account actions" className={squareButtons ? 'grid w-fit grid-cols-2 gap-2' : 'grid min-w-0 grid-cols-4 gap-1'}>
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
            className={squareButtons ? 'h-9 w-9 p-0' : 'h-9 w-full min-w-0 justify-center px-1'}
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
              className={squareButtons ? 'h-9 w-9 p-0' : 'h-9 w-full min-w-0 justify-center px-1'}
              aria-label="Add to list"
              title="Add to list"
              onClick={() => setIsLoginPromptOpen(true)}
            >
              <ListPlus aria-hidden="true" className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={squareButtons ? 'h-9 w-9 p-0' : 'h-9 w-full min-w-0 justify-center px-1'}
            aria-label="Rate this title"
            title="Rate this title"
            onClick={() => setIsLoginPromptOpen(true)}
          >
            <Star aria-hidden="true" className="h-4 w-4" />
          </Button>
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

  const displayRating = currentRating !== null ? currentRating.toFixed(1) : null;

  const ratingDialogTitle = mediaType === 'movie' ? 'Rate this movie' : 'Rate this TV show';
  const ratingButtonLabel = currentRating !== null ? `Your rating is ${displayRating}. Change rating.` : ratingDialogTitle;
  const ratingButtonTitle = currentRating !== null ? `Your rating is ${displayRating}` : ratingDialogTitle;

  return (
    <>
      <section aria-label="TMDB account actions" className={squareButtons ? 'grid w-fit grid-cols-2 gap-2' : 'grid min-w-0 grid-cols-4 gap-1'}>
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
        {showRatings && (
          <Button
            type="button"
            variant={currentRating !== null ? 'selected' : 'outline'}
            size="sm"
            className={squareButtons ? 'h-9 w-9 p-0' : 'h-9 w-full min-w-0 justify-center px-1'}
            aria-label={ratingButtonLabel}
            title={ratingButtonTitle}
            disabled={pendingAction !== null || !accountState || pendingRating !== null}
            onClick={() => setIsRatingOpen(true)}
          >
            {displayRating !== null ? (
              <span className="text-sm font-semibold leading-none">{displayRating}</span>
            ) : (
              <Star aria-hidden="true" className="h-4 w-4" />
            )}
          </Button>
        )}
      </section>

      {accountStateQuery.error && (
        <span role="alert" className="col-span-full text-xs text-destructive">Account status unavailable.</span>
      )}

      {isRatingOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && pendingRating === null) closeRatingDialog();
          }}
          onKeyDown={handleRatingKeyDown}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="rate-title"
            className="w-full max-w-md rounded-xl border bg-background p-5 shadow-xl sm:p-6"
          >
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="rate-title" className="text-lg font-semibold">{ratingDialogTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{mediaTitle}</p>
              </div>
              <Button
                ref={closeRatingDialogButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close rating dialog"
                disabled={pendingRating !== null}
                onClick={closeRatingDialog}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </header>

            <div className="space-y-4">
              <div className="flex items-center justify-center gap-1 rounded-lg border bg-muted/30 px-3 py-3" aria-live="polite">
                {Array.from({ length: 10 }, (_, index) => {
                  const starNumber = index + 1;
                  const activeRating = hoveredRating ?? currentRating ?? 0;
                  const fill = Math.max(0, Math.min(1, activeRating - (starNumber - 1)));

                  return (
                    <button
                      key={starNumber}
                      type="button"
                      className="group relative h-8 w-8 rounded-sm text-amber-400 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={`${starNumber} star${starNumber === 1 ? '' : 's'}`}
                      onMouseEnter={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const shouldHalf = event.clientX - rect.left < rect.width / 2;
                        setHoveredRating(shouldHalf ? starNumber - 0.5 : starNumber);
                      }}
                      onMouseMove={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const shouldHalf = event.clientX - rect.left < rect.width / 2;
                        setHoveredRating(shouldHalf ? starNumber - 0.5 : starNumber);
                      }}
                      onMouseLeave={() => setHoveredRating(null)}
                      onFocus={() => setHoveredRating(starNumber)}
                      onClick={(event) => {
                        const nextRating = getRatingFromPointer(event, starNumber);
                        void handleRateSelection(nextRating);
                      }}
                    >
                      <Star aria-hidden="true" className="absolute inset-0 h-full w-full fill-muted-foreground/20 text-muted-foreground/30" />
                      <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                        <Star aria-hidden="true" className="h-full w-full fill-current text-amber-400" />
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{(hoveredRating ?? currentRating ?? 0).toFixed(1)} / 10</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={currentRating === null || pendingRating !== null}
                  onClick={() => void handleRemoveRating()}
                >
                  Remove rating
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}