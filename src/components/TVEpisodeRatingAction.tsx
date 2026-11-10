import { useEffect, useRef, useState } from 'react';
import { Star, UserRound, X } from 'lucide-react';
import { RatingDialog } from '@/components/RatingDialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRatingDialog } from '@/hooks/useRatingDialog';
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
  const ratingDialog = useRatingDialog();
  const [ratingOverride, setRatingOverride] = useState<{ key: string; value: number | null } | null>(null);
  const closeLoginButtonRef = useRef<HTMLButtonElement>(null);
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

  const handleRate = async (rating: number) => {
    try {
      await ratingDialog.runAction(rating, async () => {
        await tmdbService.rateTVEpisode(tvId, seasonNumber, episodeNumber, rating, sessionId);
        clearRequestCache('account:');
        setRatingOverride({ key: accountStateKey, value: rating });
        toast({ title: `Episode rated ${rating.toFixed(1)}` });
      });
    } catch (error) {
      toast({
        title: 'Could not save your episode rating',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveRating = async () => {
    try {
      await ratingDialog.runAction(-1, async () => {
        await tmdbService.deleteTVEpisodeRating(tvId, seasonNumber, episodeNumber, sessionId);
        clearRequestCache('account:');
        setRatingOverride({ key: accountStateKey, value: null });
        toast({ title: 'Episode rating removed' });
      });
    } catch (error) {
      toast({
        title: 'Could not remove your episode rating',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
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
        onClick={() => isConnected ? ratingDialog.openDialog() : setIsLoginPromptOpen(true)}
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

      <RatingDialog
        open={ratingDialog.isOpen}
        title="Rate this episode"
        subtitle={episodeName}
        detail={`Season ${seasonNumber}, Episode ${episodeNumber}`}
        currentRating={currentRating}
        hoveredRating={ratingDialog.hoveredRating}
        pendingRating={ratingDialog.pendingRating}
        setHoveredRating={ratingDialog.setHoveredRating}
        onClose={ratingDialog.closeDialog}
        onRate={(rating) => void handleRate(rating)}
        onRemove={() => void handleRemoveRating()}
        overlayZIndex="110"
      />
    </>
  );
}
