// src/pages/MovieDetailsPage.tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, Clock, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaCard } from '@/components/MediaCard';
import { CreditsCarousel } from '@/components/CreditsCarousel';
import { tmdbService, type Movie, type Collection } from '@/lib/tmdb';
import { buildEmbedUrl, formatDate } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { ReviewSection } from '../components/ReviewSection';
import { TMDBImage } from '@/components/TMDBImage';
import { LazySection } from '@/components/LazySection';
import { useEmbedSettings } from '@/contexts/EmbedSettingsContext';
import { AccountMediaActions } from '@/components/AccountMediaActions';
import { WatchLinkButton } from '@/components/WatchLinkButton';

export function MovieDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [activeCredits, setActiveCredits] = useState<'cast' | 'crew'>('cast');
  const [activeMovieMedia, setActiveMovieMedia] = useState<'images' | 'videos'>('images');
  const [selectedMovieImageIndex, setSelectedMovieImageIndex] = useState<number | null>(null);
  const [placeCompanyInfoBesideRightColumn, setPlaceCompanyInfoBesideRightColumn] = useState(false);
  const mediaDialogRef = useRef<HTMLDivElement>(null);
  const imageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const posterColumnRef = useRef<HTMLDivElement>(null);
  const detailsColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const companyInfoRef = useRef<HTMLElement>(null);
  const { movieLinks, region } = useEmbedSettings();
  
  const navigate = useNavigate();
  usePageTitle('Movie Details');

  const movieQuery = useCachedQuery<Movie>(
    `movie:${id ?? 'none'}`,
    (signal) => tmdbService.getMovieDetails(Number(id), { signal }),
    { enabled: Boolean(id), ttlMs: 15 * 60 * 1000 },
  );
  const collectionQuery = useCachedQuery<Collection>(
    `collection:${movieQuery.data?.belongs_to_collection?.id ?? 'none'}`,
    (signal) => tmdbService.getCollectionDetails(movieQuery.data?.belongs_to_collection?.id ?? 0, { signal }),
    { enabled: Boolean(movieQuery.data?.belongs_to_collection), ttlMs: 30 * 60 * 1000 },
  );
  const movie = movieQuery.data ?? null;
  const collection = collectionQuery.data ?? null;
  const loading = movieQuery.loading;
  const trailer = movie?.videos?.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  const movieImages = [
    ...(movie?.images?.backdrops ?? []),
    ...(movie?.images?.posters ?? []),
  ];
  const movieVideos = movie?.videos?.results ?? [];
  const hasCollection = collection && collection.parts.length > 1;
  const regionProviders = region ? movie?.['watch/providers']?.results?.[region]?.flatrate ?? [] : [];
  const hasStreamingProviders = regionProviders.length > 0;
  const hasProductionCompanies = Boolean(movie?.production_companies?.length);
  const hasRightColumn = Boolean(trailer || hasCollection);

  useEffect(() => {
    setActiveMovieMedia(movieImages.length > 0 ? 'images' : 'videos');
  }, [movie?.id, movieImages.length, movieVideos.length]);

  useEffect(() => {
    if (selectedMovieImageIndex !== null) {
      mediaDialogRef.current?.focus();
    } else {
      imageTriggerRef.current?.focus();
    }
  }, [selectedMovieImageIndex]);

  useEffect(() => {
    if (selectedMovieImageIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        setSelectedMovieImageIndex((index) => index === null ? null : (index + 1) % movieImages.length);
      } else if (event.key === 'ArrowLeft') {
        setSelectedMovieImageIndex((index) => index === null ? null : (index - 1 + movieImages.length) % movieImages.length);
      } else if (event.key === 'Escape') {
        setSelectedMovieImageIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMovieImageIndex, movieImages.length]);

  useLayoutEffect(() => {
    const posterColumn = posterColumnRef.current;
    const detailsColumn = detailsColumnRef.current;
    const rightColumn = rightColumnRef.current;
    const companyInfo = companyInfoRef.current;

    if (!posterColumn || !detailsColumn || !rightColumn || !companyInfo) {
      setPlaceCompanyInfoBesideRightColumn(false);
      return;
    }

    const updatePlacement = () => {
      const isWideDesktop = window.matchMedia('(min-width: 1280px)').matches;
      const leftColumnsBottom = Math.max(
        posterColumn.getBoundingClientRect().bottom,
        detailsColumn.getBoundingClientRect().bottom,
      );
      const availableHeight = rightColumn.getBoundingClientRect().bottom - leftColumnsBottom - 24;
      const hasRoom = isWideDesktop && availableHeight >= companyInfo.getBoundingClientRect().height;

      setPlaceCompanyInfoBesideRightColumn((current) => current === hasRoom ? current : hasRoom);
    };

    updatePlacement();
    const observer = new ResizeObserver(updatePlacement);
    observer.observe(posterColumn);
    observer.observe(detailsColumn);
    window.addEventListener('resize', updatePlacement);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePlacement);
    };
  }, [movie?.id, hasCollection, hasProductionCompanies, hasStreamingProviders, trailer?.key]);

  if (loading) {
    return (
      <div className="min-h-screen container py-6 space-y-6">
        <div className="grid min-w-0 grid-cols-1 gap-4 min-[360px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
          <Skeleton className="min-[360px]:col-span-2 h-10 w-3/4 md:hidden" />
          <Skeleton className="mx-auto aspect-[2/3] w-full max-w-[180px] min-[360px]:max-w-none md:mx-0 md:max-w-none" />
          <div className="min-w-0 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (movieQuery.error || !movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">{movieQuery.error?.message ?? 'Movie not found'}</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const releaseDate = formatDate(movie.release_date);
  const rating = movie.vote_average?.toFixed(1);
  const financials = [
    { label: 'Budget', amount: movie.budget },
    { label: 'Revenue', amount: movie.revenue },
  ].filter((item): item is { label: string; amount: number } => (
    typeof item.amount === 'number' && item.amount > 0
  ));
  const regionalReleases = region
    ? movie.release_dates?.results.find((release) => release.iso_3166_1 === region)?.release_dates ?? []
    : [];
  const certification = regionalReleases.find((release) => release.type === 3 && release.certification)
    ?? regionalReleases.find((release) => release.certification);
  const similarMovies = (movie.recommendations?.results?.length ? movie.recommendations.results : movie.similar?.results) || [];
  
  // Sort Crew: Director First!
  const cast = movie.credits?.cast || [];
  const rawCrew = movie.credits?.crew || [];
  const directors = rawCrew.filter((c) => c.job === 'Director');
  const otherCrew = rawCrew.filter((c) => c.job !== 'Director');
  const crew = [...directors, ...otherCrew].reduce<typeof rawCrew>((unique, person) => {
    const existing = unique.find((member) => member.id === person.id);
    if (existing) {
      const jobs = new Set(existing.job.split(', '));
      jobs.add(person.job);
      existing.job = Array.from(jobs).join(', ');
    } else {
      unique.push({ ...person });
    }
    return unique;
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        
        <div className="mb-6 min-w-0 md:hidden">
          <h1 className="break-words text-3xl font-bold tracking-tight md:text-4xl">{movie.title}</h1>
          {movie.tagline && (
            <p className="mt-1 text-sm italic text-muted-foreground">"{movie.tagline}"</p>
          )}
        </div>

        {/* TOP SECTION */}
        <div className={`grid min-w-0 grid-cols-1 items-start gap-4 min-[360px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:grid-cols-[200px_minmax(0,1fr)] md:gap-6${hasRightColumn ? ' xl:grid-cols-[200px_minmax(0,1fr)_400px]' : ' xl:grid-cols-[200px_minmax(0,1fr)]'}`}>
          
          {/* Poster and movie actions */}
          <div ref={posterColumnRef} className="mx-auto w-full max-w-[180px] space-y-4 min-[360px]:mx-0 min-[360px]:max-w-none md:max-w-none xl:col-start-1 xl:row-start-1 xl:self-start">
            {movie.poster_path ? (
              <TMDBImage path={movie.poster_path} alt={`${movie.title} poster`} width={500} height={750} sizes="(min-width: 768px) 200px, (min-width: 360px) 42vw, 180px" loading="eager" fetchPriority="high" className="block h-auto w-full max-w-full rounded-lg border shadow-sm" />
            ) : (
              <div role="img" aria-label={`${movie.title} poster unavailable`} className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center border shadow-sm text-center text-sm text-muted-foreground">Poster unavailable</div>
            )}
            <AccountMediaActions mediaId={movie.id} mediaType="movie" mediaTitle={movie.title} />
            <WatchLinkButton
              links={movieLinks.map((link) => ({
                name: link.name,
                url: buildEmbedUrl(link.urlTemplate, movie.id, movie.external_ids?.imdb_id || ''),
              }))}
              label="Watch movie"
              className="w-full"
            />
            {movieLinks.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Add a movie URL template in embed settings to enable playback.
              </p>
            )}
          </div>

          <div className="contents md:grid md:min-w-0 md:grid-cols-1 md:gap-y-4 xl:contents">
            <div ref={detailsColumnRef} className="contents md:col-start-1 md:row-start-1 md:flex md:flex-col md:gap-4 xl:col-start-2 xl:row-start-1 xl:self-start">
            <div className="min-w-0 flex flex-col gap-6 min-[360px]:col-start-2">
              <div className="hidden md:block">
                <h1 className="break-words text-3xl font-bold tracking-tight">{movie.title}</h1>
                {movie.tagline && (
                  <p className="mt-1 text-sm italic text-muted-foreground">"{movie.tagline}"</p>
                )}
              </div>
              {directors.length > 0 && (
                <p className="text-sm font-medium text-muted-foreground">
                  Directed by{' '}
                  {directors.map((director, idx) => (
                    <span key={director.id}>
                      <Link to={`/person/${director.id}`} className="text-primary hover:underline font-semibold">
                        {director.name}
                      </Link>
                      {idx < directors.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                {releaseDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{releaseDate}</span>
                  </div>
                )}
                {movie.runtime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{movie.runtime} min</span>
                  </div>
                )}
                {rating !== undefined && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium text-foreground">{rating}</span>
                    <span>({movie.vote_count.toLocaleString()})</span>
                  </div>
                )}
                {certification && (
                  <Badge variant="outline" aria-label={`${region} certificate ${certification.certification}`}>
                    {region} · {certification.certification}
                  </Badge>
                )}
              </div>

              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <Link key={genre.id} to={`/category/genre-movie-${genre.id}`} className="inline-flex">
                      <Badge variant="secondary">{genre.name}</Badge>
                    </Link>
                  ))}
                </div>
              )}

              {movie.status && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-medium">{movie.status}</span>
                </p>
              )}
              {financials.length > 0 && (
                <dl className="grid w-fit grid-cols-[max-content_max-content] gap-x-8 gap-y-3 text-sm">
                  {financials.map(({ label, amount }) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          notation: 'compact',
                          maximumFractionDigits: 2,
                        }).format(amount)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {movie.overview && (
              <section className="min-[360px]:col-span-2">
                <h2 className="mb-2 text-xl font-semibold">Overview</h2>
                <p className="leading-relaxed text-muted-foreground">{movie.overview}</p>
              </section>
            )}
            </div>

            {(trailer || hasCollection) && (
              <div ref={rightColumnRef} className={`hidden min-w-0 space-y-8 md:col-start-1 md:row-start-2 md:block xl:col-start-3 xl:row-start-1 xl:self-start${placeCompanyInfoBesideRightColumn ? ' xl:row-span-2' : ''}`}>
                {trailer && (
                  <section className="min-w-0">
                    <h2 className="mb-2 text-xl font-semibold">Trailer</h2>
                    <div className="aspect-video w-full min-w-0 overflow-hidden rounded-lg border shadow-sm">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${trailer.key}`}
                        title="Trailer"
                        frameBorder="0"
                        allowFullScreen
                        className="block h-full w-full"
                      ></iframe>
                    </div>
                  </section>
                )}
                {hasCollection && (
                  <section className="min-w-0">
                    <h2 className="mb-4 line-clamp-1 text-xl font-semibold">More from Collection</h2>
                    <div className="flex gap-3 overflow-x-auto snap-x pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {collection.parts
                        .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())
                        .map((part) => (
                          <div key={part.id} className="w-[120px] shrink-0 snap-start">
                            <MediaCard item={part as any} type="movie" />
                          </div>
                        ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>

        {(regionProviders.length || movie.production_companies?.length) && (
          <section
            ref={companyInfoRef}
            className={`mt-4 flex flex-wrap items-start gap-x-6 gap-y-6 border-t pt-6 min-[360px]:col-span-2 md:col-span-2 md:mt-0 xl:col-start-1 xl:row-start-2${placeCompanyInfoBesideRightColumn ? ' xl:col-span-2' : hasRightColumn ? ' xl:col-span-3' : ' xl:col-span-2'}`}
          >
            {regionProviders.length > 0 && (
              <div className="w-fit max-w-full shrink-0">
                <h2 className="mb-3 text-xl font-semibold">Streaming On in {region}</h2>
                <div className="flex flex-wrap gap-3">
                  {regionProviders.map((provider) => (
                    <Link
                      key={provider.provider_id}
                      to={`/category/provider-${provider.provider_id}?name=${encodeURIComponent(provider.provider_name)}`}
                      className="rounded-xl transition-all hover:scale-110 hover:ring-2 hover:ring-primary"
                    >
                      <TMDBImage
                        path={provider.logo_path}
                        alt={provider.provider_name}
                        width={500}
                        height={500}
                        sizes="40px"
                        title={provider.provider_name}
                        className="h-10 w-10 rounded-xl border shadow-sm"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {movie.production_companies && movie.production_companies.length > 0 && (
              <div className="min-w-[min(100%,16rem)] flex-1">
                <h2 className="mb-3 text-xl font-semibold">Production</h2>
                <div className="flex flex-wrap items-center gap-6">
                  {movie.production_companies.map((company) => (
                    <Link
                      key={company.id}
                      to={`/category/company-${company.id}?name=${encodeURIComponent(company.name)}`}
                      className="group flex items-center"
                    >
                      {company.logo_path ? (
                        <TMDBImage
                          path={company.logo_path}
                          alt={company.name}
                          width={120}
                          height={40}
                          sizes="120px"
                          title={company.name}
                          className="aspect-auto h-6 w-auto max-w-[120px] object-contain transition-transform group-hover:scale-105 dark:invert md:h-8"
                        />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                          {company.name}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
        </div>

        {(trailer || hasCollection) && (
          <div className="mt-8 grid min-w-0 gap-8 md:hidden">
            {trailer && (
              <section className="min-w-0">
                <h2 className="mb-2 text-xl font-semibold">Trailer</h2>
                <div className="aspect-video w-full min-w-0 overflow-hidden rounded-lg border shadow-sm">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${trailer.key}`}
                    title="Trailer"
                    frameBorder="0"
                    allowFullScreen
                    className="block h-full w-full"
                  ></iframe>
                </div>
              </section>
            )}

            {hasCollection && (
              <section className="min-w-0">
                <h2 className="mb-4 line-clamp-1 text-xl font-semibold">More from Collection</h2>
                <div className="flex gap-3 overflow-x-auto snap-x pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {collection.parts
                    .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())
                    .map((part) => (
                      <div key={part.id} className="w-[120px] shrink-0 snap-start">
                        <MediaCard item={part as any} type="movie" />
                      </div>
                    ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Cast and crew */}
        {(cast.length > 0 || crew.length > 0) && (
          <div className="mt-12 pt-8 border-t">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold">{activeCredits === 'cast' ? 'Cast' : 'Crew'}</h2>
              <div className="flex rounded-md border p-1" role="group" aria-label="Credits">
                <Button
                  type="button"
                  variant={activeCredits === 'cast' ? 'selected' : 'ghost'}
                  size="sm"
                  disabled={cast.length === 0}
                  onClick={() => setActiveCredits('cast')}
                >
                  Cast
                </Button>
                <Button
                  type="button"
                  variant={activeCredits === 'crew' ? 'selected' : 'ghost'}
                  size="sm"
                  disabled={crew.length === 0}
                  onClick={() => setActiveCredits('crew')}
                >
                  Crew
                </Button>
              </div>
            </div>

            <div>
              {activeCredits === 'cast' && cast.length > 0 && (
                <CreditsCarousel people={cast} type="cast" />
              )}

              {activeCredits === 'crew' && crew.length > 0 && (
                <CreditsCarousel people={crew} type="crew" />
              )}
            </div>

          </div>
        )}

        {movie.reviews && movie.reviews.results.length > 0 && (
          <LazySection>
            <ReviewSection
              reviews={movie.reviews.results}
              mediaId={movie.id}
              mediaType="movie"
              totalPages={movie.reviews.total_pages}
            />
          </LazySection>
        )}

        {(movieImages.length > 0 || movieVideos.length > 0) && (
          <LazySection>
            <section aria-labelledby="movie-media-title" className="mt-12 border-t pt-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 id="movie-media-title" className="text-2xl font-semibold">Media</h2>
                <div className="flex rounded-md border p-1" role="group" aria-label="Movie media">
                  <Button
                    type="button"
                    variant={activeMovieMedia === 'images' ? 'selected' : 'ghost'}
                    size="sm"
                    disabled={movieImages.length === 0}
                    onClick={() => setActiveMovieMedia('images')}
                  >
                    Images ({movieImages.length})
                  </Button>
                  <Button
                    type="button"
                    variant={activeMovieMedia === 'videos' ? 'selected' : 'ghost'}
                    size="sm"
                    disabled={movieVideos.length === 0}
                    onClick={() => setActiveMovieMedia('videos')}
                  >
                    Videos ({movieVideos.length})
                  </Button>
                </div>
              </div>

              {activeMovieMedia === 'images' && movieImages.length > 0 && (
                <div className="flex items-start gap-3 overflow-x-auto pb-2">
                  {movieImages.map((image, index) => {
                    const isPoster = index >= (movie?.images?.backdrops.length ?? 0);
                    return (
                      <button
                        type="button"
                        key={`${image.file_path}:${index}`}
                        onClick={() => {
                          imageTriggerRef.current = document.activeElement instanceof HTMLButtonElement
                            ? document.activeElement
                            : null;
                          setSelectedMovieImageIndex(index);
                        }}
                        aria-label={`View movie image ${index + 1}`}
                        className="block h-32 shrink-0 overflow-hidden rounded-lg border bg-muted p-0"
                        style={{ width: `${image.aspect_ratio * 8}rem` }}
                      >
                        <TMDBImage
                          path={image.file_path}
                          alt={`${movie.title}, ${isPoster ? 'poster' : 'backdrop'} ${isPoster ? index - (movie?.images?.backdrops.length ?? 0) + 1 : index + 1}`}
                          width={image.width}
                          height={image.height}
                          sizes={`${Math.ceil(image.aspect_ratio * 128)}px`}
                          className="block h-full w-full object-contain transition-transform hover:scale-105"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {activeMovieMedia === 'videos' && movieVideos.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {movieVideos.map((video) => {
                    const videoUrl = video.site === 'YouTube'
                      ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}`
                      : null;
                    const videoCard = (
                      <>
                        <div className="relative h-32 overflow-hidden bg-gradient-to-br from-muted via-muted/70 to-primary/20">
                          {video.site === 'YouTube' && (
                            <img
                              src={`https://img.youtube.com/vi/${encodeURIComponent(video.key)}/hqdefault.jpg`}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                          <span className="absolute left-2 top-2 rounded bg-black/65 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                            {video.type}
                          </span>
                          <span className="absolute right-2 top-2 rounded bg-black/65 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                            {video.site}
                          </span>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-2 pt-8">
                            <p className="truncate text-sm font-medium leading-5 text-white group-hover:overflow-visible group-hover:whitespace-normal group-hover:text-clip group-focus-within:overflow-visible group-focus-within:whitespace-normal group-focus-within:text-clip">
                              {video.name}
                            </p>
                          </div>
                        </div>
                      </>
                    );

                    return videoUrl ? (
                      <a
                        key={video.id}
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group w-56 shrink-0 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {videoCard}
                      </a>
                    ) : (
                      <div key={video.id} className="group w-56 shrink-0 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
                        {videoCard}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </LazySection>
        )}

        {selectedMovieImageIndex !== null && movieImages[selectedMovieImageIndex] && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 px-3 py-4 backdrop-blur-sm sm:px-6"
            onClick={() => setSelectedMovieImageIndex(null)}
            role="presentation"
          >
            <div
              ref={mediaDialogRef}
              className="relative flex w-full max-w-7xl flex-col rounded-2xl p-2 outline-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="movie-gallery-dialog-title"
              tabIndex={-1}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <p id="movie-gallery-dialog-title" className="text-sm font-medium text-white/70">
                  {`Image ${selectedMovieImageIndex + 1} / ${movieImages.length}`}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedMovieImageIndex(null)}
                  aria-label="Close image viewer"
                  title="Close image viewer"
                  className="rounded-full border border-white/10 bg-black/50 text-white shadow-lg backdrop-blur-md hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedMovieImageIndex((index) => index === null
                    ? null
                    : (index === 0 ? movieImages.length - 1 : index - 1))}
                  aria-label="Previous movie image"
                  title="Previous movie image"
                  className="h-10 w-10 shrink-0 rounded-full border-white/20 bg-black/50 text-white hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <TMDBImage
                  path={movieImages[selectedMovieImageIndex].file_path}
                  alt={`${movie.title} image ${selectedMovieImageIndex + 1}`}
                  width={movieImages[selectedMovieImageIndex].width}
                  height={movieImages[selectedMovieImageIndex].height}
                  sizes="min(90vw, 1200px)"
                  loading="eager"
                  className="max-h-[85vh] w-full rounded-xl object-contain shadow-2xl"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedMovieImageIndex((index) => index === null
                    ? null
                    : (index + 1) % movieImages.length)}
                  aria-label="Next movie image"
                  title="Next movie image"
                  className="h-10 w-10 shrink-0 rounded-full border-white/20 bg-black/50 text-white hover:bg-white/10 hover:text-white"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {similarMovies.length > 0 && (
          <LazySection>
            <div className="mt-12 border-t pt-8">
              <h2 className="mb-6 text-2xl font-semibold">Similar Movies</h2>
              <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
                {similarMovies.slice(0, 10).map((similar) => (
                  <MediaCard key={similar.id} item={similar} type="movie" />
                ))}
              </div>
            </div>
          </LazySection>
        )}
      </div>
    </div>
  );
}