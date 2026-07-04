// src/pages/MovieDetailsPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, Star, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaCard } from '@/components/MediaCard';
import { tmdbService, type Movie } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';
import { useTitle } from '@/contexts/TitleContext';

export function MovieDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setTitle } = useTitle();

  useEffect(() => {
    if (id) {
      fetchMovieDetails(parseInt(id));
      window.scrollTo(0, 0);
    }
  }, [id]);

  useEffect(() => {
    setTitle('Movie Details');
  }, [setTitle]);

  const fetchMovieDetails = async (movieId: number) => {
    try {
      setLoading(true);
      const data = await tmdbService.getMovieDetails(movieId);
      setMovie(data);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load movie details',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container py-6 space-y-6">
          <Skeleton className="h-8 w-24" />
          <div className="grid md:grid-cols-[200px_1fr] gap-6">
            <Skeleton className="aspect-[2/3]" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Movie not found</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const posterUrl = tmdbService.getImageUrl(movie.poster_path);
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const rating = movie.vote_average.toFixed(1);
  const trailer = movie.videos?.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  const similarMovies = movie.similar?.results || [];

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        {/* TOP SECTION: Poster + Description + Trailer */}
        <div className="grid md:grid-cols-[200px_1fr] gap-6">
          {/* Left Column: Poster and Status */}
          <div className="space-y-4">
            {posterUrl ? (
              <img src={posterUrl} alt={movie.title} className="w-full rounded-lg border shadow-sm" />
            ) : (
              <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center border shadow-sm">No image</div>
            )}
            
            {movie.status && (
              <div className="text-sm text-center">
                <span className="text-muted-foreground">Status: </span>
                <span className="font-medium">{movie.status}</span>
              </div>
            )}
          </div>

          {/* Right Column: Details and Trailer */}
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{movie.title}</h1>
                {movie.tagline && (
                  <p className="text-sm italic text-muted-foreground mt-1">"{movie.tagline}"</p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  {releaseYear && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{releaseYear}</span>
                    </div>
                  )}
                  {movie.runtime && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{movie.runtime} min</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium text-foreground">{rating}</span>
                    <span>({movie.vote_count.toLocaleString()})</span>
                  </div>
                </div>
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

              {movie.overview && (
                <div>
                  <h2 className="text-xl font-semibold mb-2">Overview</h2>
                  <p className="text-muted-foreground leading-relaxed">{movie.overview}</p>
                </div>
              )}
            </div>

            {trailer && (
              <div className="xl:w-[400px] shrink-0">
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" /> Trailer
                </h2>
                <div className="aspect-video w-full rounded-lg overflow-hidden border">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${trailer.key}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE SECTION: Top Cast (Now below the entire top section) */}
        {movie.credits?.cast && movie.credits.cast.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4">Top Cast</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(75px,1fr))] gap-3">
              {movie.credits.cast.slice(0, 14).map((actor) => (
                <Link key={actor.id} to={`/person/${actor.id}`} className="text-center group block">
                  <div className="overflow-hidden rounded-md border bg-muted">
                    {actor.profile_path ? (
                      <img
                        src={tmdbService.getImageUrl(actor.profile_path, 'w500')}
                        alt={actor.name}
                        className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-1">
                    <p className="text-xs font-medium line-clamp-1 group-hover:text-primary transition-colors">{actor.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{actor.character}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* BOTTOM SECTION: Similar Movies (Restored) */}
        {similarMovies.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-semibold mb-6">Similar Movies</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
              {similarMovies.slice(0, 10).map((similar) => (
                <MediaCard key={similar.id} item={similar} type="movie" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}