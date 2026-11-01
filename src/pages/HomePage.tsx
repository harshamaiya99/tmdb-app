import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { MediaSection } from '@/components/MediaSection';
import { MediaCategoryToggle } from '@/components/MediaCategoryToggle';
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

const MOVIE_CATEGORIES = [
  { value: 'trending-movies', label: 'Trending' },
  { value: 'popular-movies', label: 'Popular' },
  { value: 'trending-streaming-movies', label: 'Streaming' },
  { value: 'now-playing-movies', label: 'In Theaters' },
  { value: 'top-rated-movies', label: 'Top Rated' },
] as const;

const TV_CATEGORIES = [
  { value: 'trending-tv', label: 'Trending' },
  { value: 'popular-tv', label: 'Popular' },
  { value: 'top-rated-tv', label: 'Top Rated' },
] as const;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('query')?.trim() ?? '';
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const hasActiveSearch = Boolean(searchTerm);
  const searchReady = hasActiveSearch && debouncedSearchTerm === searchTerm;
  const requestedMovieCategory = searchParams.get('movie_category');
  const movieCategory = MOVIE_CATEGORIES.find(({ value }) => value === requestedMovieCategory)?.value ?? 'trending-movies';
  const requestedTVCategory = searchParams.get('tv_category');
  const tvCategory = TV_CATEGORIES.find(({ value }) => value === requestedTVCategory)?.value ?? 'trending-tv';

  usePageTitle('TMDB Explorer');

  const movieList = useCachedQuery(
    `home:${movieCategory}`,
    (signal) => tmdbService.getCategoryList(movieCategory, 1, { signal }),
    { enabled: !hasActiveSearch },
  );
  const tvList = useCachedQuery(
    `home:${tvCategory}`,
    (signal) => tmdbService.getCategoryList(tvCategory, 1, { signal }),
    { enabled: !hasActiveSearch },
  );

  const updateCategory = (key: 'movie_category' | 'tv_category', value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(key, value);
    setSearchParams(nextParams, { replace: true });
  };

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

  const primaryLoading = !hasActiveSearch && (movieList.loading || tvList.loading);
  const searchLoading = hasActiveSearch && (!searchReady || searchMovies.loading || searchTV.loading || searchPeople.loading);
  const primaryError = movieList.error || tvList.error;

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
          <MediaSection
            title="Movies"
            titleAction={
              <MediaCategoryToggle
                label="Movies"
                options={MOVIE_CATEGORIES}
                value={movieCategory}
                onChange={(value) => updateCategory('movie_category', value)}
              />
            }
            items={movieList.data?.results ?? []}
            type="movie"
            category={movieCategory}
            horizontalScroll
            limit={20}
          />
          <MediaSection
            title="TV Shows"
            titleAction={
              <MediaCategoryToggle
                label="TV shows"
                options={TV_CATEGORIES}
                value={tvCategory}
                onChange={(value) => updateCategory('tv_category', value)}
              />
            }
            items={tvList.data?.results ?? []}
            type="tv"
            category={tvCategory}
            horizontalScroll
            limit={20}
          />
        </div>
      )}
    </main>
  );
}
