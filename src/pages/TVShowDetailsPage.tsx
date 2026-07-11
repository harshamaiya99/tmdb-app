// src/pages/TVShowDetailsPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, Star, Tv, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaCard } from '@/components/MediaCard';
import { tmdbService, type TVShow, type Episode } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';
import { useTitle } from '@/contexts/TitleContext';
import { ReviewSection } from '../components/ReviewSection';
import { EpisodesRatingOverview } from '../components/EpisodesRatingOverview';

export function TVShowDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [tvShow, setTVShow] = useState<TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSeason = parseInt(searchParams.get('season') || '0', 10);
  
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  
  // States for View More buttons
const [creditsVisible, setCreditsVisible] = useState(14); 
  const [heatmapRowSpan, setHeatmapRowSpan] = useState(1);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { setTitle } = useTitle();

  useEffect(() => {
    if (id) {
      fetchTVShowDetails(parseInt(id));
      window.scrollTo(0, 0);
    }
  }, [id]);

  useEffect(() => {
    setTitle('TV Show Details');
  }, [setTitle]);

  useEffect(() => {
    if (tvShow?.seasons && tvShow.seasons.length > 0 && !searchParams.get('season')) {
      const defaultSeason = tvShow.seasons.find(s => s.season_number === 1) || tvShow.seasons[0];
      const newParams = new URLSearchParams(searchParams);
      newParams.set('season', defaultSeason.season_number.toString());
      setSearchParams(newParams, { replace: true });
    }
  }, [tvShow, searchParams, setSearchParams]);

  useEffect(() => {
    if (tvShow && selectedSeason > 0) {
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
  const firstAirYear = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : '';
  const rating = tvShow.vote_average.toFixed(1);
  const episodeRuntime = tvShow.episode_run_time?.[0];
  const similarShows = tvShow.similar?.results || [];

  // Sort Crew: Creators & Executive Producers First!
  const cast = tvShow.credits?.cast || [];
  const rawCrew = tvShow.credits?.crew || [];
  
  const creators = (tvShow.created_by || []).map(c => ({...c, job: 'Creator'}));
  const creatorIds = new Set(creators.map(c => c.id));
  
  const execProducers = rawCrew.filter(c => c.job === 'Executive Producer' && !creatorIds.has(c.id));
  const execIds = new Set(execProducers.map(c => c.id));
  
  const otherCrew = rawCrew.filter(c => !creatorIds.has(c.id) && !execIds.has(c.id));
  
  const crew = [...creators, ...execProducers, ...otherCrew].filter(
    (person, index, self) => index === self.findIndex(t => t.id === person.id)
  );

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        <div className="grid md:grid-cols-[200px_1fr] gap-6">
          <div className="space-y-4">
            {posterUrl ? (
              <img src={posterUrl} alt={tvShow.name} className="w-full rounded-lg border" />
            ) : (
              <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center">No image</div>
            )}
            
            <div className="space-y-2 text-sm text-center">
              {tvShow.status && (
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-medium">{tvShow.status}</span>
                </div>
              )}
              {tvShow.number_of_seasons !== undefined && (
                <div className="flex items-center justify-center gap-1">
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
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{tvShow.name}</h1>
                  {tvShow.tagline && (
                    <p className="text-sm italic text-muted-foreground mt-1">"{tvShow.tagline}"</p>
                  )}

                  {tvShow.created_by && tvShow.created_by.length > 0 && (
                    <p className="text-sm font-medium mt-3 text-muted-foreground">
                      Created by{' '}
                      {tvShow.created_by.map((creator, index) => (
                        <span key={creator.id}>
                          <Link to={`/person/${creator.id}`} className="text-primary hover:underline font-semibold">
                            {creator.name}
                          </Link>
                          {index < tvShow.created_by!.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
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
                        <Badge variant="secondary">{genre.name}</Badge>
                      </Link>
                    ))}
                  </div>
                )}

                {tvShow.overview && (
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Overview</h2>
                    <p className="text-muted-foreground leading-relaxed">{tvShow.overview}</p>
                  </div>
                )}
              </div>

              {tvShow.videos?.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube') && (
                <div className="xl:w-[400px] shrink-0">
                  <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5" /> Trailer
                  </h2>
                  <div className="aspect-video w-full rounded-lg overflow-hidden border">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${tvShow.videos.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube')?.key}`}
                      title="Trailer"
                      frameBorder="0"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 50:50 SPLIT SECTION: Cast & Crew */}
        {(cast.length > 0 || crew.length > 0) && (
          <div className="mt-12 pt-8 border-t">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              
              {/* Left Column: Cast */}
              {cast.length > 0 && (
                <div className="min-w-0 flex flex-col">
                  <h2 className="text-xl font-semibold mb-4">Cast</h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(75px,1fr))] gap-3">
                    {cast.slice(0, creditsVisible).map((actor) => (
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

              {/* Right Column: Crew */}
              {crew.length > 0 && (
                <div className="min-w-0 flex flex-col">
                  <h2 className="text-xl font-semibold mb-4">Crew</h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(75px,1fr))] gap-3">
                    {crew.slice(0, creditsVisible).map((person) => (
                      <Link key={person.id} to={`/person/${person.id}`} className="text-center group block">
                        <div className="overflow-hidden rounded-md border bg-muted">
                          {person.profile_path ? (
                            <img
                              src={tmdbService.getImageUrl(person.profile_path, 'w500')}
                              alt={person.name}
                              className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105"
                            />
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
                      setCreditsVisible(14); // Reset back to default
                    }
                  }}
                >
                  {(cast.length > creditsVisible || crew.length > creditsVisible) 
                    ? 'View More Cast & Crew' 
                    : 'View Less Cast & Crew'}
                </Button>
              </div>
            )}
          </div>
        )}
        
{/* Dynamic Episodes Section (Dense Masonry Grid) */}
        {tvShow.seasons && tvShow.seasons.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            
            {/* Perfectly Aligned Header Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-6">
              
              {/* Left Header: Episodes + Dropdown */}
              <div className="col-span-1 sm:col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-3 flex flex-row items-center gap-4">
                <h2 className="text-2xl font-semibold leading-none">Episodes</h2>
                <select
                  value={selectedSeason || ''}
                  onChange={(e) => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('season', e.target.value);
                    setSearchParams(newParams);
                  }}
                  className="flex h-9 w-full sm:w-[250px] items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {tvShow.seasons.map((season) => (
                    <option key={season.id} value={season.season_number}>
                      {season.name} ({season.episode_count} Episodes)
                    </option>
                  ))}
                </select>
              </div>

              {/* Right Header: Season Ratings (Matches Heatmap Columns!) */}
              <div className="hidden md:flex items-center col-span-2 md:col-start-2 lg:col-start-3 xl:col-start-4">
                <h2 className="text-2xl font-semibold leading-none">Season Ratings</h2>
              </div>
            </div>

            {/* Dense Grid: Heatmap spans columns/rows, Episodes flow around it! */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 grid-flow-row-dense">
              
              {/* The Heatmap Card */}
              <div 
                className="col-span-1 sm:col-span-2 md:col-start-2 lg:col-start-3 xl:col-start-4"
                style={{ gridRowEnd: `span ${heatmapRowSpan}` }}
              >
                <div className="h-full w-full rounded-xl border bg-card text-card-foreground shadow-sm p-4 lg:p-5 flex flex-col">
                  {/* The scrollable component fills the whole box */}
                  <div className="flex-1 min-h-0">
                    <EpisodesRatingOverview 
                      tvId={tvShow.id} 
                      seasons={tvShow.seasons} 
                      rowSpan={heatmapRowSpan} // PASSES HEIGHT DATA TO COMPONENT
                      onExpand={() => setHeatmapRowSpan(prev => prev + 1)}
                      onCollapse={() => setHeatmapRowSpan(1)}
                    />
                  </div>
                </div>
              </div>

              {/* The Episodes Array */}
              {loadingEpisodes ? (
                [...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full rounded-xl col-span-1" />
                ))
              ) : (
                episodes.map((episode) => {
                  const imdbId = tvShow.external_ids?.imdb_id || '';
                  const urlTemplate = import.meta.env.VITE_TV_EMBED_URL;
                  
                  const streamUrl = urlTemplate
                    .replace('{IMDB_ID}', imdbId)
                    .replace('{SEASON}', selectedSeason.toString())
                    .replace('{EPISODE}', episode.episode_number.toString());

                  return (
                    <a 
                      key={episode.id} 
                      href={streamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-1 flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden group hover:ring-2 hover:ring-primary transition-all cursor-pointer h-full"
                    >
                      <div className="relative overflow-hidden shrink-0">
                        {episode.still_path ? (
                          <img 
                            src={tmdbService.getImageUrl(episode.still_path, 'w500')} 
                            alt={episode.name} 
                            className="w-full aspect-video object-cover bg-muted group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full aspect-video bg-muted flex items-center justify-center border-b text-sm text-muted-foreground">
                            No Image
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlayCircle className="w-12 h-12 text-white shadow-sm" />
                        </div>
                      </div>
                      
                      <div className="p-4 flex-1 flex flex-col z-10 bg-card">
                        <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                          <span className="text-muted-foreground mr-1">{episode.episode_number}.</span> 
                          {episode.name}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 mt-2 mb-1.5">
                          {episode.air_date && <span>{formatDate(episode.air_date)}</span>}
                          {episode.runtime && <span>{episode.runtime} min</span>}
                        </div>
                        
                        {/* TEXT CLIPPING FIX: explicit leading-relaxed and hidden overflow */}
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed overflow-hidden shrink-0">
                          {episode.overview || "No overview available for this episode."}
                        </p>
                      </div>
                    </a>
                  );
                })
              )}
              
              {!loadingEpisodes && episodes.length === 0 && (
                <div className="col-span-full pt-8">
                  <p className="text-muted-foreground text-center">No episodes found for this season.</p>
                </div>
              )}
              
            </div>
          </div>
        )}

        {tvShow.reviews && tvShow.reviews.results.length > 0 && (
          <ReviewSection reviews={tvShow.reviews.results} />
        )}
        
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