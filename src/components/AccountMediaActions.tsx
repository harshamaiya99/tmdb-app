import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { clearRequestCache } from '@/lib/requestCache';
import { tmdbService } from '@/lib/tmdb';

const ratingValues = Array.from({ length: 20 }, (_, index) => (index + 1) / 2);

interface AccountMediaActionsProps {
  mediaId: number;
  mediaType: 'movie' | 'tv';
}

export function AccountMediaActions({ mediaId, mediaType }: AccountMediaActionsProps) {
  const { account, isConnected, sessionId } = useTMDBAccount();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<'watchlist' | 'favorite' | 'rating' | null>(null);

  if (!isConnected || !account) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        <Link to="/account/watchlist" className="text-primary underline-offset-4 hover:underline">
          Connect a TMDB account
        </Link>
        {' '}to manage your lists and ratings.
      </p>
    );
  }

  const handleAction = async (action: 'watchlist' | 'favorite', enabled: boolean) => {
    setPendingAction(action);
    try {
      if (action === 'watchlist') {
        await tmdbService.setAccountWatchlist(account.id, mediaType, mediaId, enabled, sessionId);
      } else {
        await tmdbService.setAccountFavorite(account.id, mediaType, mediaId, enabled, sessionId);
      }
      clearRequestCache('account:');
      toast({ title: action === 'watchlist' ? 'Watchlist updated' : 'Favorites updated' });
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

  const handleRating = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rating = Number(formData.get('rating'));
    setPendingAction('rating');
    try {
      await tmdbService.rateMedia(mediaType, mediaId, rating, sessionId);
      clearRequestCache('account:');
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
    <section aria-label="TMDB account actions" className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="w-full" disabled={pendingAction !== null} onClick={() => void handleAction('watchlist', true)}>
          Add to watchlist
        </Button>
        <Button type="button" variant="outline" className="w-full" disabled={pendingAction !== null} onClick={() => void handleAction('favorite', true)}>
          Add to favorites
        </Button>
      </div>
      <form onSubmit={(event) => void handleRating(event)} className="flex gap-2">
        <label className="sr-only" htmlFor={`account-rate-${mediaType}-${mediaId}`}>Your rating</label>
        <select
          id={`account-rate-${mediaType}-${mediaId}`}
          name="rating"
          defaultValue=""
          required
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="" disabled>Rate this {mediaType === 'tv' ? 'show' : 'movie'}</option>
          {ratingValues.map((rating) => <option key={rating} value={rating}>{rating.toFixed(1)} / 10</option>)}
        </select>
        <Button type="submit" variant="outline" disabled={pendingAction !== null}>Rate</Button>
      </form>
    </section>
  );
}
