import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { MediaSection } from '@/components/MediaSection';
import { tmdbService } from '@/lib/tmdb';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePagination } from '@/hooks/usePagination';
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
  const { page: searchPage, setPage: setSearchPage } = usePagination();
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
    `search:movies:${debouncedSearchTerm}:${searchPage}`,
    (signal) => tmdbService.searchMovies(debouncedSearchTerm, searchPage, { signal }),
    { enabled: searchReady },
  );
  const searchTV = useCachedQuery(
    `search:tv:${debouncedSearchTerm}:${searchPage}`,
    (signal) => tmdbService.searchTVShows(debouncedSearchTerm, searchPage, { signal }),
    { enabled: searchReady },
  );
  const searchPeople = useCachedQuery(
    `search:people:${debouncedSearchTerm}:${searchPage}`,
    (signal) => tmdbService.searchPersons(debouncedSearchTerm, searchPage, { signal }),
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
              <MediaSection title="" items={searchMovies.data.results} type="movie" hideSeeMore limit={20} className="space-y-0" />
            ) : <SearchMessage message="No movies found." />}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">TV Shows</h2>
            {searchTV.error ? <SearchMessage error message={searchTV.error.message} /> : searchTV.data?.results.length ? (
              <MediaSection title="" items={searchTV.data.results} type="tv" hideSeeMore limit={20} className="space-y-0" />
            ) : <SearchMessage message="No TV shows found." />}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">People</h2>
            {searchPeople.error ? <SearchMessage error message={searchPeople.error.message} /> : searchPeople.data?.results.length ? (
              <div className="grid grid-cols-3 gap-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                {searchPeople.data.results.slice(0, 20).map((person) => (
                  <Link key={person.id} to={`/person/${person.id}`} className="group flex flex-col space-y-2">
                    <div className="aspect-[2/3] overflow-hidden rounded-xl border bg-muted shadow-sm">
                      {person.profile_path ? (
                        <img src={tmdbService.getImageUrl(person.profile_path, 'w500')} alt={person.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                      ) : <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No Image</div>}
                    </div>
                    <div className="px-1">
                      <p className="truncate text-xs font-semibold group-hover:text-primary">{person.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{person.known_for_department}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <SearchMessage message="No people found." />}
          </section>

          {Math.max(searchMovies.data?.total_pages ?? 1, searchTV.data?.total_pages ?? 1, searchPeople.data?.total_pages ?? 1) > 1 && (
            <div className="flex items-center justify-center gap-6 border-t pt-8">
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm disabled:pointer-events-none disabled:opacity-50"
                onClick={() => setSearchPage(searchPage - 1)}
                disabled={searchPage === 1}
              >
                Previous
              </button>
              <span className="text-sm font-medium text-muted-foreground">Page {searchPage}</span>
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm disabled:pointer-events-none disabled:opacity-50"
                onClick={() => setSearchPage(searchPage + 1)}
                disabled={searchPage >= Math.max(searchMovies.data?.total_pages ?? 1, searchTV.data?.total_pages ?? 1, searchPeople.data?.total_pages ?? 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-12 pb-12">
          <MediaSection title="Trending Movies" items={trendingMovies.data ?? []} type="movie" category="trending-movies" />
          {secondaryStage >= 1 && (
            <>
              <MediaSection title="Trending on Streaming" items={streamingMovies.data ?? []} type="movie" category="trending-streaming-movies" />
              <MediaSection title="Now Playing in Theaters" items={nowPlayingMovies.data ?? []} type="movie" category="now-playing-movies" />
              <MediaSection title="Popular TV Shows" items={popularTV.data ?? []} type="tv" category="popular-tv" />
            </>
          )}
          <MediaSection title="Trending TV Shows" items={trendingTV.data ?? []} type="tv" category="trending-tv" />
          {secondaryStage >= 2 && (
            <>
              <MediaSection title="Top Rated Movies" items={topRatedMovies.data ?? []} type="movie" category="top-rated-movies" />
              <MediaSection title="IMDB Top Rated Movies" items={imdbTopMovies.data ?? []} type="movie" category="imdb-top-rated-movies" />
              <MediaSection title="Upcoming Movies" items={upcomingMovies.data ?? []} type="movie" category="upcoming-movies" />
              <MediaSection title="Top Rated TV Shows" items={topRatedTV.data ?? []} type="tv" category="top-rated-tv" />
            </>
          )}
        </div>
      )}
    </main>
  );
}
