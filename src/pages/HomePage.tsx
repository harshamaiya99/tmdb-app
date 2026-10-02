import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { MediaSection } from '@/components/MediaSection';
import { tmdbService } from '@/lib/tmdb';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePageTitle } from '@/hooks/usePageTitle';

function SearchMessage({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <div className={`rounded-xl border border-dashed p-6 text-center text-sm ${error ? 'border-destructive/50 text-destructive' : 'text-muted-foreground'}`}>
      {message}
    </div>
  );
}

export function HomePage() {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('query')?.trim() ?? '';
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const hasActiveSearch = Boolean(searchTerm);
  const searchReady = hasActiveSearch && debouncedSearchTerm === searchTerm;
  const [secondaryStage, setSecondaryStage] = useState(0);

  usePageTitle('TMDB Explorer');

  const trendingMovies = useCachedQuery(
    'home:trending-movies',
    (signal) => tmdbService.getTrendingMovies({ signal }),
    { enabled: !hasActiveSearch },
  );
  const trendingTV = useCachedQuery(
    'home:trending-tv',
    (signal) => tmdbService.getTrendingTVShows({ signal }),
    { enabled: !hasActiveSearch },
  );

  const streamingMovies = useCachedQuery(
    'home:streaming-movies',
    (signal) => tmdbService.getTrendingStreamingMovies({ signal }),
    { enabled: !hasActiveSearch && secondaryStage >= 1 },
  );
  const nowPlayingMovies = useCachedQuery(
    'home:now-playing-movies',
    (signal) => tmdbService.getNowPlayingMovies({ signal }),
    { enabled: !hasActiveSearch && secondaryStage >= 1 },
  );
  const popularTV = useCachedQuery(
    'home:popular-tv',
    (signal) => tmdbService.getPopularTVShows({ signal }),
    { enabled: !hasActiveSearch && secondaryStage >= 1 },
  );

  const topRatedMovies = useCachedQuery(
    'home:top-rated-movies',
    (signal) => tmdbService.getTopRatedMovies({ signal }),
    { enabled: !hasActiveSearch && secondaryStage >= 2 },
  );
  const upcomingMovies = useCachedQuery(
    'home:upcoming-movies',
    (signal) => tmdbService.getUpcomingMovies({ signal }),
    { enabled: !hasActiveSearch && secondaryStage >= 2 },
  );
  const imdbTopMovies = useCachedQuery(
    'home:imdb-top-movies',
    (signal) => tmdbService.getIMDbTopRatedMovies({ signal }),
    { enabled: !hasActiveSearch && secondaryStage >= 2 },
  );
  const topRatedTV = useCachedQuery(
    'home:top-rated-tv',
    (signal) => tmdbService.getTopRatedTVShows({ signal }),
    { enabled: !hasActiveSearch && secondaryStage >= 2 },
  );

  const searchMovies = useCachedQuery(
    `search:movies:${debouncedSearchTerm}:1`,
    (signal) => tmdbService.searchMovies(debouncedSearchTerm, 1, { signal }),
    { enabled: searchReady },
  );
  const searchTV = useCachedQuery(
    `search:tv:${debouncedSearchTerm}:1`,
    (signal) => tmdbService.searchTVShows(debouncedSearchTerm, 1, { signal }),
    { enabled: searchReady },
  );
  const searchPeople = useCachedQuery(
    `search:people:${debouncedSearchTerm}:1`,
    (signal) => tmdbService.searchPersons(debouncedSearchTerm, 1, { signal }),
    { enabled: searchReady },
  );

  useEffect(() => {
    setSecondaryStage(0);
  }, [hasActiveSearch]);

  useEffect(() => {
    if (hasActiveSearch || trendingMovies.loading || trendingTV.loading || !trendingMovies.data || !trendingTV.data) return;
    const timeout = window.setTimeout(() => setSecondaryStage(1), 150);
    return () => window.clearTimeout(timeout);
  }, [hasActiveSearch, trendingMovies.data, trendingMovies.loading, trendingTV.data, trendingTV.loading]);

  useEffect(() => {
    if (hasActiveSearch || secondaryStage !== 1) return;
    const timeout = window.setTimeout(() => setSecondaryStage(2), 900);
    return () => window.clearTimeout(timeout);
  }, [hasActiveSearch, secondaryStage]);

  const primaryLoading = !hasActiveSearch && (trendingMovies.loading || trendingTV.loading);
  const searchLoading = hasActiveSearch && (!searchReady || searchMovies.loading || searchTV.loading || searchPeople.loading);
  const primaryError = trendingMovies.error || trendingTV.error;

  return (
    <main className="container py-6">
      {!hasActiveSearch && primaryError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{primaryError.message}</AlertDescription>
        </Alert>
      )}

      {hasActiveSearch && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Showing results for</p>
          <h1 className="text-2xl font-semibold">“{searchTerm}”</h1>
        </div>
      )}

      {primaryLoading || searchLoading ? (
        <div className="space-y-8">
          <MediaGridSkeleton />
          <MediaGridSkeleton />
        </div>
      ) : hasActiveSearch ? (
        <div className="space-y-10 pb-12">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Movies</h2>
            {searchMovies.error ? <SearchMessage error message={searchMovies.error.message} /> : searchMovies.data?.results.length ? (
              <MediaSection title="" items={searchMovies.data.results} type="movie" hideSeeMore horizontalScroll limit={20} className="space-y-0" />
            ) : <SearchMessage message="No movies found." />}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">TV Shows</h2>
            {searchTV.error ? <SearchMessage error message={searchTV.error.message} /> : searchTV.data?.results.length ? (
              <MediaSection title="" items={searchTV.data.results} type="tv" hideSeeMore horizontalScroll limit={20} className="space-y-0" />
            ) : <SearchMessage message="No TV shows found." />}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">People</h2>
            {searchPeople.error ? <SearchMessage error message={searchPeople.error.message} /> : searchPeople.data?.results.length ? (
              <MediaSection title="" items={searchPeople.data.results} type="person" hideSeeMore horizontalScroll limit={20} className="space-y-0" />
            ) : <SearchMessage message="No people found." />}
          </section>

        </div>
      ) : (
        <div className="space-y-12 pb-12">
          <MediaSection title="Trending Movies" items={trendingMovies.data ?? []} type="movie" category="trending-movies" horizontalScroll limit={20} />
          {secondaryStage >= 1 && (
            <>
              <MediaSection title="Trending on Streaming" items={streamingMovies.data ?? []} type="movie" category="trending-streaming-movies" horizontalScroll limit={20} />
              <MediaSection title="Now Playing in Theaters" items={nowPlayingMovies.data ?? []} type="movie" category="now-playing-movies" horizontalScroll limit={20} />
              <MediaSection title="Popular TV Shows" items={popularTV.data ?? []} type="tv" category="popular-tv" horizontalScroll limit={20} />
            </>
          )}
          <MediaSection title="Trending TV Shows" items={trendingTV.data ?? []} type="tv" category="trending-tv" horizontalScroll limit={20} />
          {secondaryStage >= 2 && (
            <>
              <MediaSection title="Top Rated Movies" items={topRatedMovies.data ?? []} type="movie" category="top-rated-movies" horizontalScroll limit={20} />
              <MediaSection title="IMDB Top Rated Movies" items={imdbTopMovies.data ?? []} type="movie" category="imdb-top-rated-movies" horizontalScroll limit={20} />
              <MediaSection title="Upcoming Movies" items={upcomingMovies.data ?? []} type="movie" category="upcoming-movies" horizontalScroll limit={20} />
              <MediaSection title="Top Rated TV Shows" items={topRatedTV.data ?? []} type="tv" category="top-rated-tv" horizontalScroll limit={20} />
            </>
          )}
        </div>
      )}
    </main>
  );
}
