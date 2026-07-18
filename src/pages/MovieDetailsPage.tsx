// src/pages/MovieDetailsPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, Star, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaCard } from '@/components/MediaCard';
import { tmdbService, type Movie, type Collection } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';
import { useTitle } from '@/contexts/TitleContext';
import { ReviewSection } from '../components/ReviewSection';

export function MovieDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  
  // View More States
  const [creditsVisible, setCreditsVisible] = useState(14);
  // Note: collectionVisible state has been removed since we are scrolling now!

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

      if (data.belongs_to_collection) {
        try {
          const collData = await tmdbService.getCollectionDetails(data.belongs_to_collection.id);
          setCollection(collData);
        } catch (error) {
          console.error("Failed to fetch collection", error);
          setCollection(null);
        }
      } else {
        setCollection(null);
      }

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
      <div className="min-h-screen container py-6 space-y-6">
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
  const similarMovies = movie.similar?.results || [];
  
  const trailer = movie.videos?.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  const hasCollection = collection && collection.parts && collection.parts.length > 1;

  // Sort Crew: Director First!
  const cast = movie.credits?.cast || [];
  const rawCrew = movie.credits?.crew || [];
  const directors = rawCrew.filter((c) => c.job === 'Director');
  const otherCrew = rawCrew.filter((c) => c.job !== 'Director');
  const crew = [...directors, ...otherCrew].filter(
    (person, index, self) => index === self.findIndex((t) => t.id === person.id)
  );

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        
        {/* TOP SECTION */}
        <div className="grid md:grid-cols-[200px_1fr] gap-6">
          
          {/* Left Column: Poster & Watch Button */}
          <div className="space-y-4">
            {posterUrl ? (
              <img src={posterUrl} alt={movie.title} className="w-full rounded-lg border shadow-sm" />
            ) : (
              <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center border shadow-sm">No image</div>
            )}
            
            {movie.status && (
              <div className="text-sm text-center mb-2">
                <span className="text-muted-foreground">Status: </span>
                <span className="font-medium">{movie.status}</span>
              </div>
            )}

            {(() => {
              const urlTemplate = import.meta.env.VITE_MOVIE_EMBED_URL;
              const streamUrl = urlTemplate ? urlTemplate.replace('{IMDB_ID}', movie.external_ids?.imdb_id || '') : '#';
              
              return (
                <Button asChild className="w-full gap-2 mt-2">
                  <a href={streamUrl} target="_blank" rel="noopener noreferrer">
                    <PlayCircle className="w-4 h-4" /> Watch Movie
                  </a>
                </Button>
              );
            })()}

           {/* NEW: Streaming Platforms Block */}
            {movie['watch/providers']?.results?.US?.flatrate && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-base font-semibold mb-3">
                  Streaming On
                </h3>
                <div className="flex flex-wrap gap-3">
                  {movie['watch/providers'].results.US.flatrate.map(provider => (
                    <Link 
                      key={provider.provider_id} 
                      to={`/category/provider-${provider.provider_id}?name=${encodeURIComponent(provider.provider_name)}`}
                      className="hover:scale-110 hover:ring-2 hover:ring-primary rounded-xl transition-all"
                    >
                      <img
                        src={tmdbService.getImageUrl(provider.logo_path, 'w200')}
                        alt={provider.provider_name}
                        title={provider.provider_name}
                        className="w-10 h-10 rounded-xl shadow-sm border"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col xl:flex-row gap-8 items-start">
            
            {/* Middle Column: Movie Details */}
            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{movie.title}</h1>
                {movie.tagline && (
                  <p className="text-sm italic text-muted-foreground mt-1">"{movie.tagline}"</p>
                )}
                
                {directors.length > 0 && (
                  <p className="text-sm font-medium mt-3 text-muted-foreground">
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
                  
                {/* NEW: Production Companies Block */}
                  {movie.production_companies && movie.production_companies.length > 0 && (
                    <div className="mt-8 pt-6 border-t">
                      <h3 className="text-xl font-semibold mb-4">
                        Production
                      </h3>
                      <div className="flex flex-wrap items-center gap-6">
                        {movie.production_companies.map(company => (
                          <Link 
                            key={company.id} 
                            to={`/category/company-${company.id}?name=${encodeURIComponent(company.name)}`}
                            className="flex items-center group"
                          >
                            {company.logo_path ? (
                              <img
                                src={tmdbService.getImageUrl(company.logo_path, 'w200')}
                                alt={company.name}
                                title={company.name}
                                className="h-6 md:h-8 max-w-[120px] object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all dark:invert dark:group-hover:invert-0"
                              />
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                {company.name}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}  
            </div>

            

            {/* Right Column: Trailer AND Collection Stacked */}
            {(trailer || hasCollection) && (
              <div className="xl:w-[400px] w-full shrink-0 flex flex-col gap-8 min-w-0">
                
                {/* Trailer */}
                {trailer && (
                  <div>
                    <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                      <PlayCircle className="w-5 h-5" /> Trailer
                    </h2>
                    <div className="aspect-video w-full rounded-lg overflow-hidden border shadow-sm">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${trailer.key}`}
                        title="Trailer"
                        frameBorder="0"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                )}

                {/* Collection (Horizontal Scroll without Scrollbar) */}
                {hasCollection && (
                  <div className="min-w-0 w-full">
                    <h2 className="text-xl font-semibold mb-4 line-clamp-1">
                      More from Collection
                    </h2>
                    <div className="flex overflow-x-auto gap-3 pb-4 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {collection.parts
                        .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())
                        .map((part) => (
                          <div key={part.id} className="w-[120px] shrink-0 snap-start">
                            <MediaCard item={part as any} type="movie" />
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* 50:50 SPLIT SECTION: Cast & Crew */}
        {(cast.length > 0 || crew.length > 0) && (
          <div className="mt-12 pt-8 border-t">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              
              {/* Cast */}
              {cast.length > 0 && (
                <div className="min-w-0 flex flex-col">
                  <h2 className="text-xl font-semibold mb-4">Cast</h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(75px,1fr))] gap-3">
                    {cast.slice(0, creditsVisible).map((actor) => (
                      <Link key={actor.id} to={`/person/${actor.id}`} className="text-center group block">
                        <div className="overflow-hidden rounded-md border bg-muted">
                          {actor.profile_path ? (
                            <img src={tmdbService.getImageUrl(actor.profile_path, 'w500')} alt={actor.name} className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105" />
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

              {/* Crew */}
              {crew.length > 0 && (
                <div className="min-w-0 flex flex-col">
                  <h2 className="text-xl font-semibold mb-4">Crew</h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(75px,1fr))] gap-3">
                    {crew.slice(0, creditsVisible).map((person) => (
                      <Link key={person.id} to={`/person/${person.id}`} className="text-center group block">
                        <div className="overflow-hidden rounded-md border bg-muted">
                          {person.profile_path ? (
                            <img src={tmdbService.getImageUrl(person.profile_path, 'w500')} alt={person.name} className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <div className="w-full aspect-[2/3] flex items-center justify-center">
                              <span className="text-[10px] text-muted-foreground">No image</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-1">
                          <p className="text-xs font-medium line-clamp-1 group-hover:text-primary transition-colors">{person.name}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{person.job}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Unified View More / View Less Button */}
            {(cast.length > 14 || crew.length > 14) && (
              <div className="flex justify-center mt-8">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full max-w-sm"
                  onClick={() => {
                    const hasMore = cast.length > creditsVisible || crew.length > creditsVisible;
                    if (hasMore) {
                      setCreditsVisible(prev => prev + 14);
                    } else {
                      setCreditsVisible(14); 
                    }
                  }}
                >
                  {(cast.length > creditsVisible || crew.length > creditsVisible) ? 'View More Cast & Crew' : 'View Less Cast & Crew'}
                </Button>
              </div>
            )}
          </div>
        )}

        {movie.reviews && movie.reviews.results.length > 0 && (
          <ReviewSection reviews={movie.reviews.results} />
        )}

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