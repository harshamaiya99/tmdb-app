import { Link } from 'react-router-dom';
import { ArrowRight, Play, Star } from 'lucide-react';
import { AccountMediaActions } from '@/components/AccountMediaActions';
import { MediaCategoryToggle, MOVIE_CATEGORIES, TV_CATEGORIES } from '@/components/MediaCategoryToggle';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { MediaSection } from '@/components/MediaSection';
import { MovieReleaseCalendar } from '@/components/MovieReleaseCalendar';
import { TMDBImage } from '@/components/TMDBImage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { Movie, PersonListResult, TVShow } from '@/lib/tmdb';

export type FeaturedMedia =
  | { mediaType: 'movie'; item: Movie }
  | { mediaType: 'tv'; item: TVShow };

export interface HomePresentationProps {
  hasActiveSearch: boolean;
  searchTerm: string;
  primaryLoading: boolean;
  searchLoading: boolean;
  primaryError?: Error;
  featured?: FeaturedMedia;
  featuredDetailsError?: Error;
  searchMovies: (Movie | TVShow)[];
  searchMoviesError?: Error;
  searchTV: (Movie | TVShow)[];
  searchTVError?: Error;
  searchPeople: PersonListResult[];
  searchPeopleError?: Error;
  movieItems: (Movie | TVShow)[];
  tvItems: (Movie | TVShow)[];
  movieCategory: typeof MOVIE_CATEGORIES[number]['value'];
  tvCategory: typeof TV_CATEGORIES[number]['value'];
  onMovieCategoryChange: (value: typeof MOVIE_CATEGORIES[number]['value']) => void;
  onTVCategoryChange: (value: typeof TV_CATEGORIES[number]['value']) => void;
  region: string;
}

function SearchMessage({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <div className={`rounded-lg border border-dashed p-6 text-center text-sm ${error ? 'border-destructive/50 text-destructive' : 'border-border/70 text-muted-foreground'}`}>
      {message}
    </div>
  );
}

function SearchResultsSection({
  title,
  items,
  type,
  error,
}: {
  title: string;
  items: (Movie | TVShow | PersonListResult)[];
  type: 'movie' | 'tv' | 'person';
  error?: Error;
}) {
  return (
    <section className="screenroom-search-section">
      <h2>{title}</h2>
      {error
        ? <SearchMessage error message={error.message} />
        : items.length
          ? <MediaSection title="" items={items} type={type} hideSeeMore horizontalScroll limit={20} className="space-y-0 screenroom-search-results" horizontalColumns={7} />
          : <SearchMessage message={`No ${title.toLowerCase()} found.`} />}
    </section>
  );
}

export function ScreenroomHomePage({
  hasActiveSearch,
  searchTerm,
  primaryLoading,
  searchLoading,
  primaryError,
  featured,
  featuredDetailsError,
  searchMovies,
  searchMoviesError,
  searchTV,
  searchTVError,
  searchPeople,
  searchPeopleError,
  movieItems,
  tvItems,
  movieCategory,
  tvCategory,
  onMovieCategoryChange,
  onTVCategoryChange,
  region,
}: HomePresentationProps) {
  const featuredTitle = featured
    ? featured.mediaType === 'movie' ? featured.item.title : featured.item.name
    : '';
  const featuredDate = featured
    ? featured.mediaType === 'movie' ? featured.item.release_date : featured.item.first_air_date
    : '';
  const trailer = featured?.item.videos?.results.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer',
  );

  if (hasActiveSearch) {
    return (
      <div className="screenroom-home screenroom-search-page space-y-8">
        <header className="screenroom-page-heading">
          <p>Search the collection</p>
          <h1>Results for “{searchTerm}”</h1>
        </header>
        {primaryLoading || searchLoading ? (
          <div className="space-y-8"><MediaGridSkeleton /><MediaGridSkeleton /></div>
        ) : (
          <div className="space-y-10">
            <SearchResultsSection title="Movies" items={searchMovies} type="movie" error={searchMoviesError} />
            <SearchResultsSection title="Series" items={searchTV} type="tv" error={searchTVError} />
            <SearchResultsSection title="People" items={searchPeople} type="person" error={searchPeopleError} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="screenroom-home space-y-10 sm:space-y-14">
      {primaryError && (
        <Alert variant="destructive">
          <AlertDescription>{primaryError.message}</AlertDescription>
        </Alert>
      )}
      {primaryLoading && !featured && <div aria-label="Loading featured title" className="screenroom-hero-skeleton" />}
      {featured && (
        <section className="screenroom-hero" aria-label="Featured title">
          {featured.item.backdrop_path ? (
            <TMDBImage
              path={featured.item.backdrop_path}
              alt=""
              width={1600}
              height={900}
              sizes="100vw"
              className="screenroom-hero-backdrop"
            />
          ) : <div className="screenroom-hero-backdrop-fallback" />}
          <div className="screenroom-hero-shade" />
          <div className="screenroom-hero-content">
            <p className="screenroom-eyebrow">Featured in Screenroom</p>
            <h1>{featuredTitle}</h1>
            <div className="screenroom-hero-meta">
              {typeof featured.item.vote_average === 'number' && featured.item.vote_average > 0 && (
                <span><Star aria-hidden="true" className="h-4 w-4 fill-current" /> {featured.item.vote_average.toFixed(1)}</span>
              )}
              {featuredDate && <span>{featuredDate.slice(0, 4)}</span>}
              {featured.mediaType === 'tv' && featured.item.number_of_seasons !== undefined && (
                <span>{featured.item.number_of_seasons} {featured.item.number_of_seasons === 1 ? 'season' : 'seasons'}</span>
              )}
            </div>
            {featured.item.genres && featured.item.genres.length > 0 && (
              <p className="screenroom-hero-genres">{featured.item.genres.map((genre) => genre.name).join(' · ')}</p>
            )}
            {featured.item.overview && <p className="screenroom-hero-overview">{featured.item.overview}</p>}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild className="min-h-11">
                <Link to={`/${featured.mediaType}/${featured.item.id}`}>
                  <Play aria-hidden="true" className="mr-2 h-4 w-4 fill-current" /> View title
                </Link>
              </Button>
              {trailer && (
                <Button asChild variant="outline" className="screenroom-trailer-button min-h-11">
                  <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`} target="_blank" rel="noreferrer">
                    Watch trailer <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
              <AccountMediaActions
                mediaId={featured.item.id}
                mediaType={featured.mediaType}
                mediaTitle={featuredTitle}
                showAddToList={false}
                showRatings={false}
                squareButtons
              />
            </div>
            {featuredDetailsError && <p role="alert" className="text-sm text-destructive">Featured details could not be loaded: {featuredDetailsError.message}</p>}
          </div>
        </section>
      )}
      <MediaSection
        title="Movies"
        titleClassName="text-2xl sm:text-3xl"
        titleAction={<MediaCategoryToggle label="Movies" options={MOVIE_CATEGORIES} value={movieCategory} onChange={onMovieCategoryChange} className="w-full sm:w-auto" />}
        items={movieItems}
        type="movie"
        category={movieCategory}
        horizontalScroll
        horizontalColumns={10}
        limit={20}
      />
      <MediaSection
        title="Series"
        titleClassName="text-2xl sm:text-3xl"
        titleAction={<MediaCategoryToggle label="Series" options={TV_CATEGORIES} value={tvCategory} onChange={onTVCategoryChange} className="w-full sm:w-auto" />}
        items={tvItems}
        type="tv"
        category={tvCategory}
        horizontalScroll
        horizontalColumns={10}
        limit={20}
      />
      <MovieReleaseCalendar region={region} />
    </div>
  );
}
