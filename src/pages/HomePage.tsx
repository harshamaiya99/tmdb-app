import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Play, Star } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AccountMediaActions } from '@/components/AccountMediaActions';
import { Button } from '@/components/ui/button';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { MediaSection } from '@/components/MediaSection';
import { MediaCategoryToggle, MOVIE_CATEGORIES, TV_CATEGORIES } from '@/components/MediaCategoryToggle';
import { tmdbService, type Movie, type TVShow } from '@/lib/tmdb';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useEmbedSettings } from '@/contexts/EmbedSettingsContext';

function SearchMessage({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <div className={`rounded-xl border border-dashed p-6 text-center text-sm ${error ? 'border-destructive/50 text-destructive' : 'text-muted-foreground'}`}>
      {message}
    </div>
  );
}

type FeaturedMedia = { mediaType: 'movie'; item: Movie } | { mediaType: 'tv'; item: TVShow };
type DisplayedFeatured = FeaturedMedia & { index: number };

function shuffleFeaturedItems(items: FeaturedMedia[]): FeaturedMedia[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [displayedFeatured, setDisplayedFeatured] = useState<DisplayedFeatured | null>(null);
  const [titlesWithoutTrailers, setTitlesWithoutTrailers] = useState<Set<string>>(() => new Set());
  const [previousBackdropPath, setPreviousBackdropPath] = useState<string | null>(null);
  const currentBackdropPathRef = useRef<string | null>(null);
  const { region } = useEmbedSettings();
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
    `home:${movieCategory}:${region}`,
    (signal) => tmdbService.getCategoryList(movieCategory, 1, { signal }, undefined, undefined, region),
    { enabled: !hasActiveSearch },
  );
  const tvList = useCachedQuery(
    `home:${tvCategory}:${region}`,
    (signal) => tmdbService.getCategoryList(tvCategory, 1, { signal }, undefined, undefined, region),
    { enabled: !hasActiveSearch },
  );
  const trendingMovies = useCachedQuery(
    'home:featured-trending-movies',
    (signal) => tmdbService.getTrendingMovies({ signal }),
    { enabled: !hasActiveSearch },
  );
  const trendingTV = useCachedQuery(
    'home:featured-trending-tv',
    (signal) => tmdbService.getTrendingTVShows({ signal }),
    { enabled: !hasActiveSearch },
  );
  const featuredItems = useMemo(() => shuffleFeaturedItems([
    ...(trendingMovies.data?.map((item) => ({ mediaType: 'movie' as const, item })) ?? []),
    ...(trendingTV.data?.map((item) => ({ mediaType: 'tv' as const, item })) ?? []),
  ]), [trendingMovies.data, trendingTV.data]);
  const trailerCandidates = featuredItems.filter(
    ({ mediaType, item }) => !titlesWithoutTrailers.has(`${mediaType}:${item.id}`),
  );
  const activeFeatured = trailerCandidates.length > 0
    ? trailerCandidates[featuredIndex % trailerCandidates.length]
    : undefined;
  const featuredDetails = useCachedQuery<Movie | TVShow>(
    `home:featured:${activeFeatured?.mediaType ?? 'none'}:${activeFeatured?.item.id ?? 'none'}`,
    (signal) => {
      if (!activeFeatured) throw new Error('No featured title is available.');
      return activeFeatured.mediaType === 'movie'
        ? tmdbService.getMovieDetails(activeFeatured.item.id, { signal })
        : tmdbService.getTVShowDetails(activeFeatured.item.id, { signal });
    },
    { enabled: !hasActiveSearch && Boolean(activeFeatured) },
  );
  const selectedItem = activeFeatured
    && featuredDetails.data?.id === activeFeatured.item.id
    && (activeFeatured.mediaType === 'movie'
      ? 'title' in featuredDetails.data
      : 'name' in featuredDetails.data)
    ? featuredDetails.data
    : activeFeatured?.item;
  const selectedTrailer = selectedItem?.videos?.results.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer',
  );
  const featuredItem = displayedFeatured?.item;
  const featuredMediaType = displayedFeatured?.mediaType;
  const featuredTrailer = featuredItem?.videos?.results.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer',
  );
  const featuredTitle = featuredItem && ('title' in featuredItem ? featuredItem.title : featuredItem.name);
  const featuredYear = featuredItem && ('release_date' in featuredItem
    ? featuredItem.release_date?.slice(0, 4)
    : featuredItem.first_air_date?.slice(0, 4));
  const featuredSeasons = featuredItem && 'number_of_seasons' in featuredItem
    ? featuredItem.number_of_seasons
    : undefined;

  useLayoutEffect(() => {
    const nextBackdropPath = displayedFeatured?.item.backdrop_path ?? null;
    const previousBackdropPath = currentBackdropPathRef.current;
    currentBackdropPathRef.current = nextBackdropPath;

    if (!previousBackdropPath || previousBackdropPath === nextBackdropPath) {
      setPreviousBackdropPath(null);
      return;
    }

    setPreviousBackdropPath(previousBackdropPath);
    const timer = window.setTimeout(() => setPreviousBackdropPath(null), 1400);
    return () => window.clearTimeout(timer);
  }, [displayedFeatured?.mediaType, displayedFeatured?.item.id]);

  useLayoutEffect(() => {
    if (
      !activeFeatured
      || !selectedItem
      || !selectedTrailer
      || featuredDetails.data?.id !== activeFeatured.item.id
    ) return;

    if (activeFeatured.mediaType === 'movie' && 'title' in selectedItem) {
      setDisplayedFeatured({ mediaType: 'movie', item: selectedItem, index: featuredIndex });
    } else if (activeFeatured.mediaType === 'tv' && 'name' in selectedItem) {
      setDisplayedFeatured({ mediaType: 'tv', item: selectedItem, index: featuredIndex });
    }
  }, [activeFeatured?.mediaType, activeFeatured?.item.id, featuredIndex, selectedItem, selectedTrailer]);

  useEffect(() => {
    if (trailerCandidates.length < 2) return;
    const nextItem = trailerCandidates[(featuredIndex + 1) % trailerCandidates.length].item;
    if (!nextItem.backdrop_path) return;

    const image = new Image();
    image.src = tmdbService.getImageUrl(nextItem.backdrop_path, 'w780');
  }, [featuredIndex, trailerCandidates]);

  useEffect(() => {
    if (
      !activeFeatured
      || featuredDetails.loading
      || featuredDetails.data?.id !== activeFeatured.item.id
      || selectedTrailer
    ) return;

    const currentKey = `${activeFeatured.mediaType}:${activeFeatured.item.id}`;
    setTitlesWithoutTrailers((current) => new Set(current).add(currentKey));
    setFeaturedIndex(0);
  }, [
    activeFeatured?.mediaType,
    activeFeatured?.item.id,
    featuredDetails.data,
    featuredDetails.loading,
    selectedTrailer,
  ]);

  useEffect(() => {
    if (trailerCandidates.length < 2 || hasActiveSearch) return;
    const timer = window.setInterval(() => {
      setFeaturedIndex((index) => (index + 1) % trailerCandidates.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [trailerCandidates.length, hasActiveSearch]);

  const updateCategory = (key: 'movie_category' | 'tv_category', value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(key, value);
    setSearchParams(nextParams, { replace: true });
  };

  const searchMovies = useCachedQuery(
    `search:movies:${debouncedSearchTerm}:1:${region}`,
    (signal) => tmdbService.searchMovies(debouncedSearchTerm, 1, { signal }, region),
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

  const primaryLoading = !hasActiveSearch && (
    movieList.loading
    || tvList.loading
    || trendingMovies.loading
    || trendingTV.loading
    || (!displayedFeatured && Boolean(activeFeatured) && featuredDetails.loading)
  );
  const searchLoading = hasActiveSearch && (!searchReady || searchMovies.loading || searchTV.loading || searchPeople.loading);
  const primaryError = movieList.error || tvList.error || trendingMovies.error || trendingTV.error || featuredDetails.error;

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
          {featuredItem && displayedFeatured && featuredTrailer && (
            <section
              aria-label="Trending movies and TV shows"
              aria-roledescription="carousel"
              className="group relative isolate h-auto overflow-hidden rounded-2xl bg-background lg:h-[25rem]"
            >
              {previousBackdropPath && previousBackdropPath !== featuredItem.backdrop_path && (
                <img
                  src={tmdbService.getImageUrl(previousBackdropPath, 'w780')}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
                />
              )}
              {featuredItem.backdrop_path && (
                <img
                  key={`${displayedFeatured.mediaType}-${featuredItem.id}`}
                  src={tmdbService.getImageUrl(featuredItem.backdrop_path, 'w780')}
                  alt=""
                  aria-hidden="true"
                  className="hero-backdrop-enter absolute inset-0 -z-20 h-full w-full object-cover object-center"
                />
              )}
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/80 to-background/25 sm:via-background/65 sm:to-transparent" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background/45 via-transparent to-background/5" />
              <Link
                to={`/${featuredMediaType}/${featuredItem.id}`}
                aria-label={`View details for ${featuredTitle}`}
                className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              />
              <div
                key={`${displayedFeatured.mediaType}-${featuredItem.id}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${displayedFeatured.index + 1} of ${trailerCandidates.length}: ${featuredTitle}`}
                aria-live="off"
                className="hero-slide-enter pointer-events-none relative z-10 flex h-auto max-w-2xl flex-col justify-start gap-3 pt-8 pb-8 pl-0 pr-5 sm:pt-10 sm:pr-8 lg:h-full lg:pt-12 lg:pb-4 lg:pr-10"
              >
                <div>
                  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                    {featuredTitle}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                    {typeof featuredItem.vote_average === 'number' && featuredItem.vote_average > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border bg-background/80 px-2 py-1 font-semibold text-foreground">
                        <Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {featuredItem.vote_average.toFixed(1)}
                      </span>
                    )}
                    {featuredSeasons !== undefined && (
                      <span>{featuredSeasons} {featuredSeasons === 1 ? 'Season' : 'Seasons'}</span>
                    )}
                    {featuredYear && <span>{featuredYear}</span>}
                  </div>
                </div>
                {featuredItem.genres && featuredItem.genres.length > 0 && (
                  <p className="text-sm font-medium">{featuredItem.genres.map((genre) => genre.name).join('  /  ')}</p>
                )}
                <div className="pointer-events-auto flex flex-wrap items-center gap-3">
                  {featuredTrailer && (
                    <Button asChild className="min-h-11">
                      <a
                        href={`https://www.youtube.com/watch?v=${encodeURIComponent(featuredTrailer.key)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Play aria-hidden="true" className="mr-2 h-4 w-4 fill-current" />
                        Watch Trailer
                      </a>
                    </Button>
                  )}
                  <div className="w-fit max-w-full">
                    <AccountMediaActions
                      mediaId={featuredItem.id}
                      mediaType={displayedFeatured.mediaType}
                      mediaTitle={featuredTitle ?? ''}
                      showAddToList={false}
                      squareButtons
                    />
                  </div>
                </div>
                {featuredItem.overview && (
                  <p
                    className="max-w-xl shrink-0 text-sm leading-6 text-muted-foreground sm:text-base"
                    style={{
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 3,
                      overflow: 'hidden',
                    }}
                  >
                    {featuredItem.overview}
                  </p>
                )}
                {featuredDetails.error && (
                  <p role="alert" className="text-sm text-destructive">
                    Additional featured-title details could not be loaded: {featuredDetails.error.message}
                  </p>
                )}
              </div>
            </section>
          )}
          <MediaSection
            title="Movies"
            titleClassName="text-3xl"
            titleAction={
              <MediaCategoryToggle
                label="Movies"
                options={MOVIE_CATEGORIES}
                value={movieCategory}
                onChange={(value) => updateCategory('movie_category', value)}
                className="w-full sm:w-auto"
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
            titleClassName="text-3xl"
            titleAction={
              <MediaCategoryToggle
                label="TV shows"
                options={TV_CATEGORIES}
                value={tvCategory}
                onChange={(value) => updateCategory('tv_category', value)}
                className="w-full sm:w-auto"
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
