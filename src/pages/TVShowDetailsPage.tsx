// src/pages/TVShowDetailsPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Star, Tv, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaCard } from '@/components/MediaCard';
import { tmdbService, type TVShow, type Episode } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

export function TVShowDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [tvShow, setTVShow] = useState<TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchTVShowDetails(parseInt(id));
      window.scrollTo(0, 0);
    }
  }, [id]);

  useEffect(() => {
    if (tvShow?.seasons && tvShow.seasons.length > 0) {
      const defaultSeason = tvShow.seasons.find(s => s.season_number === 1) || tvShow.seasons[0];
      setSelectedSeason(defaultSeason.season_number);
    }
  }, [tvShow]);

  useEffect(() => {
    if (tvShow && selectedSeason !== null) {
      fetchEpisodes(tvShow.id, selectedSeason);
    }
  }, [tvShow, selectedSeason]);

  const fetchTVShowDetails = async (showId: number) => {
    try {
      setLoading(true);
      const data = await tmdbService.getTVShowDetails(showId);
      setTVShow(data);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load TV show details',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEpisodes = async (showId: number, seasonNum: number) => {
    try {
      setLoadingEpisodes(true);
      const data = await tmdbService.getTVSeasonDetails(showId, seasonNum);
      setEpisodes(data.episodes);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load episodes for this season',
      });
    } finally {
      setLoadingEpisodes(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container py-6 space-y-6">
          <Skeleton className="h-8 w-24" />
          <div className="grid md:grid-cols-[300px_1fr] gap-6">
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

  if (!tvShow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">TV show not found</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const posterUrl = tmdbService.getImageUrl(tvShow.poster_path);
  // Reverted to standard year format for details page per your instruction
  const firstAirYear = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : '';
  const rating = tvShow.vote_average.toFixed(1);
  const episodeRuntime = tvShow.episode_run_time?.[0];

  const trailer = tvShow.videos?.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  const cast = tvShow.credits?.cast.slice(0, 14) || [];
  const similarShows = tvShow.similar?.results || [];

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid md:grid-cols-[200px_1fr] gap-6">
          <div className="space-y-4">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={tvShow.name}
                className="w-full rounded-lg border"
              />
            ) : (
              <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center">
                No image
              </div>
            )}
            
            {/* Status and Seasons moved below the poster */}
            <div className="space-y-2 text-sm text-center">
              {tvShow.status && (
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-medium">{tvShow.status}</span>
                </div>
              )}
              {tvShow.number_of_seasons !== undefined && (
                <div className="flex items-center justify-center gap-1">
                  <Tv className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {tvShow.number_of_seasons} Season{tvShow.number_of_seasons !== 1 ? 's' : ''} • {' '}
                    {tvShow.number_of_episodes} Episode{tvShow.number_of_episodes !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex flex-col xl:flex-row gap-6">
              
              <div className="flex-1 space-y-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                    {tvShow.name}
                  </h1>
                  {tvShow.tagline && (
                    <p className="text-sm italic text-muted-foreground mt-1">"{tvShow.tagline}"</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {firstAirYear && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{firstAirYear}</span>
                      </div>
                    )}
                    {episodeRuntime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{episodeRuntime} min/ep</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-medium text-foreground">{rating}</span>
                      <span>({tvShow.vote_count.toLocaleString()})</span>
                    </div>
                  </div>
                </div>

                {tvShow.genres && tvShow.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tvShow.genres.map((genre) => (
                      <Link key={genre.id} to={`/category/genre-tv-${genre.id}`} className="inline-flex">
                        <Badge variant="secondary">
                          {genre.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}

                {tvShow.overview && (
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Overview</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {tvShow.overview}
                    </p>
                  </div>
                )}
              </div>

              {/* Parallel Trailer */}
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
        </div>

        {/* Top Cast Section */}
        {cast.length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4">Top Cast</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(75px,1fr))] gap-3">
              {cast.map((actor) => (
                <Link key={actor.id} to={`/person/${actor.id}`} className="text-center space-y-2 block group">
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
                  <div>
                    <p className="text-[11px] font-medium line-clamp-1 group-hover:text-primary transition-colors">{actor.name}</p>
                    <p className="text-[9px] text-muted-foreground line-clamp-1">{actor.character}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Episodes Section */}
        {tvShow.seasons && tvShow.seasons.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold">Episodes</h2>
              
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                aria-label="Select season"
                title="Select season"
                className="flex h-10 w-full sm:w-[250px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tvShow.seasons.map((season) => (
                  <option key={season.id} value={season.season_number}>
                    {season.name} ({season.episode_count} Episodes)
                  </option>
                ))}
              </select>
            </div>

            {loadingEpisodes ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {episodes.map((episode) => (
                  <div key={episode.id} className="flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                    {episode.still_path ? (
                      <img 
                        src={tmdbService.getImageUrl(episode.still_path, 'w500')} 
                        alt={episode.name} 
                        className="w-full aspect-video object-cover bg-muted"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-muted flex items-center justify-center border-b text-sm text-muted-foreground">
                        No Image
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col space-y-2">
                      <h3 className="font-semibold text-base line-clamp-2">
                        <span className="text-muted-foreground mr-1">{episode.episode_number}.</span> 
                        {episode.name}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {/* Using dd/MM/yyyy formatter strictly for episodes */}
                        {episode.air_date && <span>{formatDate(episode.air_date)}</span>}
                        {episode.runtime && <span>{episode.runtime} min</span>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 mt-2 flex-1">
                        {episode.overview || "No overview available for this episode."}
                      </p>
                    </div>
                  </div>
                ))}
                
                {episodes.length === 0 && (
                  <div className="col-span-full">
                    <p className="text-muted-foreground text-center py-8">No episodes found for this season.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Similar Shows Section */}
        {similarShows.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-semibold mb-6">Similar TV Shows</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
              {similarShows.slice(0, 10).map((similar) => (
                <MediaCard key={similar.id} item={similar} type="tv" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}