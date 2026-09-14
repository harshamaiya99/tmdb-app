// src/pages/TVShowDetailsPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, Star, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaCard } from '@/components/MediaCard';
import { CreditsCarousel } from '@/components/CreditsCarousel';
import { tmdbService, type TVShow, type TVSeasonDetails } from '@/lib/tmdb';
import { buildEmbedUrl, formatDate } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { ReviewSection } from '../components/ReviewSection';
import { EpisodesRatingOverview } from '../components/EpisodesRatingOverview';

export function TVShowDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSeason = parseInt(searchParams.get('season') || '0', 10);
  const [activeCredits, setActiveCredits] = useState<'cast' | 'crew'>('cast');
  const [heatmapRowSpan, setHeatmapRowSpan] = useState(1);

  const navigate = useNavigate();
  const tvShowQuery = useCachedQuery<TVShow>(
    `tv:${id ?? 'none'}`,
    (signal) => tmdbService.getTVShowDetails(Number(id), { signal }),
    { enabled: Boolean(id), ttlMs: 15 * 60 * 1000 },
  );
  const tvShow = tvShowQuery.data ?? null;
  const seasonQuery = useCachedQuery<TVSeasonDetails>(
    `tv-season:${id ?? 'none'}:${selectedSeason}`,
    (signal) => tmdbService.getTVSeasonDetails(Number(id), selectedSeason, { signal }),
    { enabled: Boolean(id) && selectedSeason > 0, ttlMs: 15 * 60 * 1000 },
  );
  const episodes = seasonQuery.data?.episodes ?? [];
  const seasonCast = seasonQuery.data?.credits?.cast ?? null;
  const seasonCrew = seasonQuery.data?.credits?.crew ?? null;
  const loadingEpisodes = seasonQuery.loading;

  usePageTitle('TV Show Details');

  useEffect(() => {
    if (tvShow?.seasons && tvShow.seasons.length > 0 && !searchParams.get('season')) {
      const defaultSeason = tvShow.seasons.find(s => s.season_number === 1) || tvShow.seasons[0];
      const newParams = new URLSearchParams(searchParams);
      newParams.set('season', defaultSeason.season_number.toString());
      setSearchParams(newParams, { replace: true });
    }
  }, [tvShow, searchParams, setSearchParams]);

  useEffect(() => {
    setActiveCredits('cast');
  }, [selectedSeason]);

  if (tvShowQuery.loading) {
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

  if (tvShowQuery.error || !tvShow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">{tvShowQuery.error?.message ?? 'TV show not found'}</h2>
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
  const aggregateCast = tvShow.aggregate_credits?.cast.map((person) => ({
    id: person.id,
    name: person.name,
    profile_path: person.profile_path,
    character: person.roles.map((role) => role.character).join(', '),
  })) || tvShow.credits?.cast || [];
  const seasonCreditsLoading = selectedSeason > 0 && (seasonCast === null || seasonCrew === null);
  const cast = selectedSeason > 0 ? seasonCast || [] : aggregateCast;
  const rawCrew = selectedSeason > 0 && seasonCrew !== null
    ? seasonCrew
    : tvShow.credits?.crew || [];
  const creators = (tvShow.created_by || []).map((creator) => ({ ...creator, job: 'Creator' as const }));
  const creatorIds = new Set(creators.map((creator) => creator.id));

  const execProducers = rawCrew.filter((crewMember) => crewMember.job === 'Executive Producer' && !creatorIds.has(crewMember.id));
  const execIds = new Set(execProducers.map((crewMember) => crewMember.id));

  const otherCrew = rawCrew.filter((crewMember) => !creatorIds.has(crewMember.id) && !execIds.has(crewMember.id));

  const crew = [...creators, ...execProducers, ...otherCrew].reduce<Array<{ id: number; name: string; job: string; profile_path: string | null }>>((unique, person) => {
    const existing = unique.find((member) => member.id === person.id);
    if (existing) {
      const jobs = new Set(existing.job.split(', '));
      jobs.add(person.job);
      existing.job = Array.from(jobs).join(', ');
    } else {
      unique.push({
        id: person.id,
        name: person.name,
        job: person.job,
        profile_path: person.profile_path,
      });
    }
    return unique;
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        <div className="grid md:grid-cols-[200px_1fr] gap-6">
          <div className="space-y-4">
            {posterUrl ? (
              <img src={posterUrl} alt={`${tvShow.name} poster`} width="500" height="750" className="w-full rounded-lg border" />
            ) : (
              <div role="img" aria-label={`${tvShow.name} poster unavailable`} className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center text-center text-sm text-muted-foreground">Poster unavailable</div>
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
                          {index < (tvShow.created_by?.length ?? 0) - 1 ? ', ' : ''}
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

        {/* Cast and crew */}
        {(cast.length > 0 || crew.length > 0 || seasonCreditsLoading) && (
          <div className="mt-12 pt-8 border-t">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold">{activeCredits === 'cast' ? 'Cast' : 'Crew'}</h2>
              <div className="flex rounded-md border p-1" role="group" aria-label="Credits">
                <Button
                  type="button"
                  variant={activeCredits === 'cast' ? 'secondary' : 'ghost'}
                  size="sm"
                  disabled={cast.length === 0}
                  onClick={() => setActiveCredits('cast')}
                >
                  Cast
                </Button>
                <Button
                  type="button"
                  variant={activeCredits === 'crew' ? 'secondary' : 'ghost'}
                  size="sm"
                  disabled={crew.length === 0}
                  onClick={() => setActiveCredits('crew')}
                >
                  Crew
                </Button>
              </div>
            </div>

            <div>
              {seasonCreditsLoading ? (
                <div className="flex gap-3 overflow-hidden pb-4">
                  {[...Array(8)].map((_, index) => (
                    <Skeleton key={index} className="h-[150px] w-[75px] shrink-0 rounded-md" />
                  ))}
                </div>
              ) : activeCredits === 'cast' && cast.length > 0 ? (
                <CreditsCarousel people={cast} type="cast" />
              ) : null}

              {!seasonCreditsLoading && activeCredits === 'crew' && crew.length > 0 && (
                <CreditsCarousel people={crew} type="crew" />
              )}
            </div>

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
                  
                  const streamUrl = buildEmbedUrl(urlTemplate, tvShow.id, imdbId)
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
                            alt={`${tvShow.name}, episode ${episode.episode_number}: ${episode.name}`} 
                            width="500"
                            height="281"
                            className="w-full aspect-video object-cover bg-muted group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div role="img" aria-label={`${episode.name} still unavailable`} className="w-full aspect-video bg-muted flex items-center justify-center border-b text-sm text-muted-foreground">
                            Still unavailable
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