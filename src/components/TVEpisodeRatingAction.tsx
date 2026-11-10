import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Star, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { clearRequestCache } from '@/lib/requestCache';
import { tmdbService } from '@/lib/tmdb';

interface TVEpisodeRatingActionProps {
  tvId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
}

export function TVEpisodeRatingAction({
  tvId,
  seasonNumber,
  episodeNumber,
  episodeName,
}: TVEpisodeRatingActionProps) {
  const { account, connectTMDBAccount, isConnected, sessionId } = useTMDBAccount();
  const { toast } = useToast();
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [ratingOverride, setRatingOverride] = useState<{ key: string; value: number | null } | null>(null);
  const closeLoginButtonRef = useRef<HTMLButtonElement>(null);
  const closeRatingButtonRef = useRef<HTMLButtonElement>(null);
  const accountStateKey = `account:${account?.id ?? 'none'}:episode-state:${tvId}:${seasonNumber}:${episodeNumber}`;
  const accountStateQuery = useCachedQuery(
    accountStateKey,
    (signal) => tmdbService.getTVEpisodeAccountState(tvId, seasonNumber, episodeNumber, sessionId, signal),
    { enabled: isConnected && Boolean(account) },
  );
  const accountState = accountStateQuery.data;
  const currentRating = ratingOverride?.key === accountStateKey
    ? ratingOverride.value
    : typeof accountState?.rated === 'object'
      ? accountState.rated.value
      : null;

  useEffect(() => {
    if (isLoginPromptOpen) closeLoginButtonRef.current?.focus();
  }, [isLoginPromptOpen]);

  useEffect(() => {
    if (isRatingOpen) closeRatingButtonRef.current?.focus();
  }, [isRatingOpen]);

  const closeRatingDialog = () => {
    setIsRatingOpen(false);
    setHoveredRating(null);
  };

  const handleEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && pendingRating === null) closeRatingDialog();
  };

  const getRatingFromPointer = (event: MouseEvent<HTMLButtonElement>, starValue: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX - rect.left < rect.width / 2 ? starValue - 0.5 : starValue;
  };

  const handleRate = async (rating: number) => {
    setPendingRating(rating);
    try {
      await tmdbService.rateTVEpisode(tvId, seasonNumber, episodeNumber, rating, sessionId);
      clearRequestCache('account:');
      setRatingOverride({ key: accountStateKey, value: rating });
      toast({ title: `Episode rated ${rating.toFixed(1)}` });
      closeRatingDialog();
    } catch (error) {
      toast({
        title: 'Could not save your episode rating',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingRating(null);
    }
  };

  const handleRemoveRating = async () => {
    setPendingRating(-1);
    try {
      await tmdbService.deleteTVEpisodeRating(tvId, seasonNumber, episodeNumber, sessionId);
      clearRequestCache('account:');
      setRatingOverride({ key: accountStateKey, value: null });
      toast({ title: 'Episode rating removed' });
      closeRatingDialog();
    } catch (error) {
      toast({
        title: 'Could not remove your episode rating',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingRating(null);
    }
  };

  const handleConnect = () => {
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
      <Button
        type="button"
        variant={currentRating !== null ? 'selected' : 'outline'}
        size="sm"
        className="h-8 gap-1.5 px-2"
        aria-label={currentRating !== null ? `Your episode rating is ${currentRating.toFixed(1)}. Change rating.` : 'Rate this episode'}
        title={currentRating !== null ? `Your rating: ${currentRating.toFixed(1)}` : 'Rate this episode'}
        disabled={isConnected && (!accountState || Boolean(accountStateQuery.error))}
        onClick={() => isConnected ? setIsRatingOpen(true) : setIsLoginPromptOpen(true)}
      >
        {accountStateQuery.loading && isConnected ? (
          <span className="text-xs">Loading…</span>
        ) : currentRating !== null ? (
          <>
            <Star aria-hidden="true" className="h-4 w-4 fill-current text-amber-400" />
            <span>{currentRating.toFixed(1)}</span>
          </>
        ) : (
          <>
            <Star aria-hidden="true" className="h-4 w-4" />
            <span>Rate</span>
          </>
        )}
      </Button>

      {accountStateQuery.error && isConnected && (
        <span role="alert" className="text-xs text-destructive">Your episode rating is unavailable.</span>
      )}

      {isLoginPromptOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsLoginPromptOpen(false);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') setIsLoginPromptOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="episode-rating-login-title"
            className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-xl sm:p-6"
          >
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="episode-rating-login-title" className="text-lg font-semibold">Connect your TMDB account</h2>
                <p className="mt-2 text-sm text-muted-foreground">Log in to rate TV episodes.</p>
              </div>
              <Button
                ref={closeLoginButtonRef}
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
              <Button type="button" variant="outline" onClick={() => setIsLoginPromptOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleConnect}>
                <UserRound aria-hidden="true" className="mr-2 h-4 w-4" />
                Log in to TMDB
              </Button>
            </div>
          </section>
        </div>
      )}

      {isRatingOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && pendingRating === null) closeRatingDialog();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            handleEscape(event);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="episode-rating-title"
            className="w-full max-w-md rounded-xl border bg-background p-5 shadow-xl sm:p-6"
          >
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="episode-rating-title" className="text-lg font-semibold">Rate this episode</h2>
                <p className="mt-1 text-sm text-muted-foreground">{episodeName}</p>
                <p className="text-xs text-muted-foreground">Season {seasonNumber}, Episode {episodeNumber}</p>
              </div>
              <Button
                ref={closeRatingButtonRef}
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
                      disabled={pendingRating !== null}
                      onMouseEnter={(event) => setHoveredRating(getRatingFromPointer(event, starNumber))}
                      onMouseMove={(event) => setHoveredRating(getRatingFromPointer(event, starNumber))}
                      onMouseLeave={() => setHoveredRating(null)}
                      onFocus={() => setHoveredRating(starNumber)}
                      onClick={(event) => void handleRate(
                        event.detail === 0 ? starNumber : getRatingFromPointer(event, starNumber),
                      )}
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
