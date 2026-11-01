// src/pages/MovieDetailsPage.tsx
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, Star, PlayCircle } from 'lucide-react';
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
  const { movieLinks } = useEmbedSettings();
  
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
  const similarMovies = (movie.recommendations?.results?.length ? movie.recommendations.results : movie.similar?.results) || [];
  
  const trailer = movie.videos?.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  const hasCollection = collection && collection.parts && collection.parts.length > 1;

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
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 min-[360px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
          
          {/* Poster and status */}
          <div className="mx-auto w-full max-w-[180px] space-y-4 min-[360px]:mx-0 min-[360px]:max-w-none md:max-w-none">
            {movie.poster_path ? (
              <TMDBImage path={movie.poster_path} alt={`${movie.title} poster`} width={500} height={750} sizes="(min-width: 768px) 200px, (min-width: 360px) 42vw, 180px" loading="eager" fetchPriority="high" className="block h-auto w-full max-w-full rounded-lg border shadow-sm" />
            ) : (
              <div role="img" aria-label={`${movie.title} poster unavailable`} className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center border shadow-sm text-center text-sm text-muted-foreground">Poster unavailable</div>
            )}
            {movie.status && (
              <p className="text-center text-sm">
                <span className="text-muted-foreground">Status: </span>
                <span className="font-medium">{movie.status}</span>
              </p>
            )}
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
            {movie['watch/providers']?.results?.US?.flatrate && (
              <div className="border-t pt-4">
                <h2 className="mb-3 text-base font-semibold">Streaming On</h2>
                <div className="flex flex-wrap gap-3">
                  {movie['watch/providers'].results.US.flatrate.map((provider) => (
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
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0 space-y-6">
              <div className="hidden md:block">
                <h1 className="break-words text-3xl font-bold tracking-tight">{movie.title}</h1>
                {movie.tagline && (
                  <p className="mt-1 text-sm italic text-muted-foreground">"{movie.tagline}"</p>
                )}
              </div>
              {directors.length > 0 && (
                <p className="mt-3 text-sm font-medium text-muted-foreground">
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

              <AccountMediaActions mediaId={movie.id} mediaType="movie" mediaTitle={movie.title} />

              {movie.overview && (
                <section className="hidden md:block">
                  <h2 className="mb-2 text-xl font-semibold">Overview</h2>
                  <p className="leading-relaxed text-muted-foreground">{movie.overview}</p>
                </section>
              )}
            </div>

            {(trailer || hasCollection) && (
              <div className="hidden min-w-0 space-y-8 md:block">
                {trailer && (
                  <section className="min-w-0">
                    <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold">
                      <PlayCircle className="h-5 w-5" /> Trailer
                    </h2>
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
        </div>

        {movie.overview && (
          <section className="mt-8 md:hidden">
            <h2 className="mb-2 text-xl font-semibold">Overview</h2>
            <p className="leading-relaxed text-muted-foreground">{movie.overview}</p>

          </section>
        )}

        {movie.production_companies && movie.production_companies.length > 0 && (
          <section className="mt-8 border-t pt-6">
            <h2 className="mb-4 text-xl font-semibold">Production</h2>
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
                      className="h-6 max-w-[120px] opacity-60 grayscale transition-all group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 dark:invert dark:group-hover:invert-0 md:h-8"
                    />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                      {company.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {(trailer || hasCollection) && (
          <div className="mt-8 grid min-w-0 gap-8 md:hidden">
            {trailer && (
              <section className="min-w-0">
                <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold">
                  <PlayCircle className="h-5 w-5" /> Trailer
                </h2>
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