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
import type { HomePresentationProps } from '@/components/ScreenroomHomePage';

function SearchResults({
  title,
  items,
  type,
  error,
}: {
  title: string;
  items: HomePresentationProps['searchMovies'] | HomePresentationProps['searchPeople'];
  type: 'movie' | 'tv' | 'person';
  error?: Error;
}) {
  return (
    <section className="matinee-search-group">
      <div className="matinee-search-group-heading">
        <h2>{title}</h2>
        <span>{error ? 'Unavailable' : `${items.length} results`}</span>
      </div>
      {error ? (
        <p role="alert" className="matinee-empty-state matinee-error">{error.message}</p>
      ) : items.length ? (
        <MediaSection
          title=""
          items={items}
          type={type}
          hideSeeMore
          horizontalScroll
          limit={20}
          className="space-y-0"
        />
      ) : (
        <p className="matinee-empty-state">No {title.toLowerCase()} found.</p>
      )}
    </section>
  );
}

export function MidnightMatineeHomePage({
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
  const featuredYear = featured
    ? featured.mediaType === 'movie'
      ? featured.item.release_date?.slice(0, 4)
      : featured.item.first_air_date?.slice(0, 4)
    : '';
  const trailer = featured?.item.videos?.results.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer',
  );

  if (hasActiveSearch) {
    return (
      <div className="matinee-home matinee-search-page">
        <header className="matinee-page-heading">
          <p>Now showing in the collection</p>
          <h1>Search results</h1>
          <span>“{searchTerm}”</span>
        </header>
        {primaryLoading || searchLoading ? (
          <div className="space-y-8"><MediaGridSkeleton /><MediaGridSkeleton /></div>
        ) : (
          <div className="matinee-search-results">
            <SearchResults title="Movies" items={searchMovies} type="movie" error={searchMoviesError} />
            <SearchResults title="Television" items={searchTV} type="tv" error={searchTVError} />
            <SearchResults title="People" items={searchPeople} type="person" error={searchPeopleError} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="matinee-home">
      {primaryError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{primaryError.message}</AlertDescription>
        </Alert>
      )}
      {primaryLoading && !featured && <div aria-label="Loading featured title" className="matinee-feature-skeleton" />}
      {featured && (
        <section className="matinee-feature" aria-label="Featured title">
          <div className="matinee-feature-art">
            {featured.item.poster_path ? (
              <TMDBImage
                path={featured.item.poster_path}
                alt={`${featuredTitle} poster`}
                width={500}
                height={750}
                sizes="(max-width: 640px) 55vw, 260px"
                className="matinee-feature-poster"
              />
            ) : (
              <div className="matinee-feature-poster-fallback"><span>Tonight's feature</span></div>
            )}
            <span className="matinee-feature-stamp" aria-hidden="true">MM</span>
          </div>
          <div className="matinee-feature-copy">
            <p className="matinee-feature-kicker">TONIGHT'S FEATURE</p>
            <h2>{featuredTitle}</h2>
            <div className="matinee-feature-meta">
              {typeof featured.item.vote_average === 'number' && featured.item.vote_average > 0 && (
                <span><Star aria-hidden="true" className="h-4 w-4 fill-current" /> {featured.item.vote_average.toFixed(1)}</span>
              )}
              {featuredYear && <span>{featuredYear}</span>}
              {featured.mediaType === 'tv' && featured.item.number_of_seasons !== undefined && (
                <span>{featured.item.number_of_seasons} {featured.item.number_of_seasons === 1 ? 'season' : 'seasons'}</span>
              )}
            </div>
            {featured.item.genres && featured.item.genres.length > 0 && (
              <p className="matinee-feature-genres">{featured.item.genres.map((genre) => genre.name).join(' · ')}</p>
            )}
            {featured.item.overview && <p className="matinee-feature-overview">{featured.item.overview}</p>}
            <div className="matinee-feature-actions">
              <Button asChild className="min-h-11">
                <Link to={`/${featured.mediaType}/${featured.item.id}`}>
                  <Play aria-hidden="true" className="mr-2 h-4 w-4 fill-current" /> Explore title
                </Link>
              </Button>
              {trailer && (
                <Button asChild variant="outline" className="min-h-11">
                  <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`} target="_blank" rel="noreferrer">
                    Trailer <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
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
            {featuredDetailsError && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                Featured details could not be loaded: {featuredDetailsError.message}
              </p>
            )}
          </div>
        </section>
      )}
      <div className="matinee-content-sections">
        <MediaSection
          title="On the big screen"
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
          title="The series room"
          titleClassName="text-2xl sm:text-3xl"
          titleAction={<MediaCategoryToggle label="TV shows" options={TV_CATEGORIES} value={tvCategory} onChange={onTVCategoryChange} className="w-full sm:w-auto" />}
          items={tvItems}
          type="tv"
          category={tvCategory}
          horizontalScroll
          horizontalColumns={10}
          limit={20}
        />
        <MovieReleaseCalendar region={region} />
      </div>
    </div>
  );
}
