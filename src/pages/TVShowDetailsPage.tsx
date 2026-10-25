// src/pages/TVShowDetailsPage.tsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, Star, PlayCircle, X, Image as ImageIcon, Video, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaCard } from '@/components/MediaCard';
import { CreditsCarousel } from '@/components/CreditsCarousel';
import { tmdbService, type Episode, type TVShow, type TVEpisodeDetails, type TVSeasonDetails } from '@/lib/tmdb';
import { buildEmbedUrl, formatDate } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { ReviewSection } from '../components/ReviewSection';
import { EpisodesRatingOverview } from '../components/EpisodesRatingOverview';
import { LazySection } from '@/components/LazySection';
import { TMDBImage } from '@/components/TMDBImage';
import { useEmbedSettings } from '@/contexts/EmbedSettingsContext';

interface EpisodeCardProps {
  episode: Episode;
  tvShowName: string;
  streamUrl: string;
  onSelectEpisode: (episode: Episode, streamUrl: string) => void;
}

function EpisodeCard({ episode, tvShowName, streamUrl, onSelectEpisode }: EpisodeCardProps) {
  return (
    <div className="relative min-w-0 min-h-64">
      <button
        type="button"
        onClick={() => onSelectEpisode(episode, streamUrl)}
        className="group relative flex h-full w-full cursor-pointer appearance-none flex-col overflow-hidden rounded-xl border bg-card text-left text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="relative shrink-0 overflow-hidden">
          {episode.still_path ? (
            <TMDBImage
              path={episode.still_path}
              alt={`${tvShowName}, episode ${episode.episode_number}: ${episode.name}`}
              width={500}
              height={281}
              sizes="(min-width: 1536px) 18vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
              className="aspect-video w-full bg-muted object-cover"
            />
          ) : (
            <div role="img" aria-label={`${episode.name} still unavailable`} className="w-full aspect-video bg-muted flex items-center justify-center border-b text-sm text-muted-foreground">
              Still unavailable
            </div>
          )}
        </div>

        <div className="z-10 flex min-h-0 flex-1 flex-col bg-card p-4">
          <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
            <span className="text-muted-foreground mr-1">{episode.episode_number}.</span>
            {episode.name}
          </h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 mt-2 mb-1.5">
            <div className="flex items-center gap-3">
              {episode.air_date && <span>{formatDate(episode.air_date)}</span>}
              {episode.runtime && <span>{episode.runtime} min</span>}
            </div>
          </div>
          <p className="shrink-0 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {episode.overview || 'No overview available for this episode.'}
          </p>
        </div>
      </button>
    </div>
  );
}

export function TVShowDetailsPage() {
  const { tvUrlTemplate } = useEmbedSettings();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSeason = parseInt(searchParams.get('season') || '0', 10);
  const [activeCredits, setActiveCredits] = useState<'cast' | 'crew'>('cast');
  const [selectedEpisode, setSelectedEpisode] = useState<{ episode: Episode; streamUrl: string } | null>(null);
  const episodeGridRef = useRef<HTMLDivElement>(null);
  const episodeDialogCloseRef = useRef<HTMLButtonElement>(null);

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
  const episodeDetailsQuery = useCachedQuery<TVEpisodeDetails>(
    `tv-episode:${id ?? 'none'}:${selectedEpisode?.episode.season_number ?? 'none'}:${selectedEpisode?.episode.episode_number ?? 'none'}`,
    (signal) => tmdbService.getTVEpisodeDetails(
      Number(id),
      selectedEpisode?.episode.season_number ?? 0,
      selectedEpisode?.episode.episode_number ?? 0,
      { signal },
    ),
    { enabled: Boolean(id) && Boolean(selectedEpisode), ttlMs: 15 * 60 * 1000 },
  );
  const episodeDetails = episodeDetailsQuery.data?.id === selectedEpisode?.episode.id
    ? episodeDetailsQuery.data
    : undefined;
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

  useEffect(() => {
    if (!selectedEpisode) return;

    const previousActiveElement = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    episodeDialogCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedEpisode(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previousActiveElement instanceof HTMLElement) previousActiveElement.focus();
    };
  }, [selectedEpisode]);

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

  const firstAirYear = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : '';
  const rating = tvShow.vote_average?.toFixed(1);
  const episodeRuntime = tvShow.episode_run_time?.[0];
  const similarShows = (tvShow.recommendations?.results?.length ? tvShow.recommendations.results : tvShow.similar?.results) || [];
  const selectedSeasonDetails = tvShow.seasons?.find((season) => season.season_number === selectedSeason);

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
        <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            {tvShow.poster_path ? (
              <TMDBImage path={tvShow.poster_path} alt={`${tvShow.name} poster`} width={500} height={750} sizes="(min-width: 768px) 200px, calc(100vw - 2rem)" loading="eager" fetchPriority="high" className="block h-auto w-full max-w-full rounded-lg border" />
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

          <div className="min-w-0 space-y-8">
            <div className="flex min-w-0 flex-col gap-6 xl:flex-row">
              
              <div className="min-w-0 flex-1 space-y-6">
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
                    {rating !== undefined && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-medium text-foreground">{rating}</span>
                        <span>({tvShow.vote_count.toLocaleString()})</span>
                      </div>
                    )}
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
                <div className="min-w-0 w-full shrink-0 xl:w-[400px]">
                  <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5" /> Trailer
                  </h2>
                  <div className="aspect-video w-full min-w-0 overflow-hidden rounded-lg border">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${tvShow.videos.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube')?.key}`}
                      title="Trailer"
                      frameBorder="0"
                      allowFullScreen
                      className="block h-full w-full"
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
              <div className="col-span-1 flex flex-col items-stretch gap-3 sm:col-span-2 sm:flex-row sm:items-center md:col-span-1 lg:col-span-2 xl:col-span-3">
                <h2 className="text-2xl font-semibold leading-none">Episodes</h2>
                <select
                  value={selectedSeason || ''}
                  onChange={(e) => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('season', e.target.value);
                    setSearchParams(newParams);
                  }}
                  className="flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:w-[250px]"
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

            <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
              <div className="md:col-span-3">
                {selectedSeasonDetails?.overview?.trim() && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">
                      {selectedSeasonDetails.name || `Season ${selectedSeason}`} Overview
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{selectedSeasonDetails.overview}</p>
                  </div>
                )}

                <div className="episode-row grid grid-cols-1 gap-6 md:grid-cols-3">
                  {loadingEpisodes ? (
                    [...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-64 w-full rounded-xl" />
                    ))
                  ) : episodes.slice(0, 3).map((episode) => {
                    const imdbId = tvShow.external_ids?.imdb_id || '';
                    const streamUrl = buildEmbedUrl(tvUrlTemplate, tvShow.id, imdbId)
                      .replace('{SEASON}', selectedSeason.toString())
                      .replace('{EPISODE}', episode.episode_number.toString());

                    return (
                      <EpisodeCard
                        key={episode.id}
                        episode={episode}
                        tvShowName={tvShow.name}
                        streamUrl={streamUrl}
                        onSelectEpisode={(selected, url) => setSelectedEpisode({ episode: selected, streamUrl: url })}
                      />
                    );
                  })}
                </div>
              </div>

              {/* The Heatmap Card */}
              <div className="w-full min-h-64 md:min-h-80 md:col-span-2 md:col-start-4 md:row-start-1">
                <h3 className="mb-3 text-xl font-semibold md:hidden">Season Ratings</h3>
                <div className="h-full w-full rounded-xl border bg-card text-card-foreground shadow-sm p-4 lg:p-5 flex flex-col">
                  <div className="flex-1 min-w-0 min-h-0">
                    <EpisodesRatingOverview 
                      tvId={tvShow.id} 
                      seasons={tvShow.seasons} 
                    />
                  </div>
                </div>
              </div>

              {/* Remaining episode rows use the full page width. */}
              <div ref={episodeGridRef} className="episode-grid col-span-full grid gap-6">
                {loadingEpisodes ? (
                  [...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full rounded-xl" />
                  ))
                ) : (
                  Array.from({ length: Math.ceil(Math.max(0, episodes.length - 3) / 5) }, (_, rowIndex) => (
                    <div key={rowIndex} className="episode-row grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {episodes.slice(rowIndex * 5 + 3, rowIndex * 5 + 8).map((episode) => {
                      const imdbId = tvShow.external_ids?.imdb_id || '';
                      const streamUrl = buildEmbedUrl(tvUrlTemplate, tvShow.id, imdbId)
                        .replace('{SEASON}', selectedSeason.toString())
                        .replace('{EPISODE}', episode.episode_number.toString());

                      return (
                        <EpisodeCard
                          key={episode.id}
                          episode={episode}
                          tvShowName={tvShow.name}
                          streamUrl={streamUrl}
                          onSelectEpisode={(selected, url) => setSelectedEpisode({ episode: selected, streamUrl: url })}
                        />
                      );
                      })}
                    </div>
                  ))
                )}
              
              {!loadingEpisodes && episodes.length === 0 && (
                <div className="col-span-full pt-8">
                  <p className="text-muted-foreground text-center">No episodes found for this season.</p>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {tvShow.reviews && tvShow.reviews.results.length > 0 && (
          <LazySection>
            <ReviewSection
              reviews={tvShow.reviews.results}
              mediaId={tvShow.id}
              mediaType="tv"
              totalPages={tvShow.reviews.total_pages}
            />
          </LazySection>
        )}
        
        {similarShows.length > 0 && (
          <LazySection>
            <div className="mt-12 border-t pt-8">
              <h2 className="mb-6 text-2xl font-semibold">Similar TV Shows</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
                {similarShows.slice(0, 10).map((similar) => (
                  <MediaCard key={similar.id} item={similar} type="tv" />
                ))}
              </div>
            </div>
          </LazySection>
        )}
      </div>
      {selectedEpisode && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedEpisode(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="episode-dialog-title"
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl"
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return;

              const focusableElements = event.currentTarget.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
              );
              const firstElement = focusableElements[0];
              const lastElement = focusableElements[focusableElements.length - 1];

              if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement?.focus();
              } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement?.focus();
              }
            }}
          >
            <div className="flex flex-col gap-3 border-b p-4 pr-14 sm:flex-row sm:gap-6 sm:p-6 sm:pr-16">
              <div className="h-fit w-32 shrink-0 overflow-hidden rounded-lg border bg-muted sm:w-52">
                {selectedEpisode.episode.still_path ? (
                  <TMDBImage
                    path={selectedEpisode.episode.still_path}
                    alt={`${selectedEpisode.episode.name} episode still`}
                    width={416}
                    height={234}
                    sizes="(min-width: 640px) 208px, 128px"
                    loading="eager"
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center px-2 text-center text-xs text-muted-foreground">
                    Still unavailable
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 self-center">
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                  {tvShow.name} · Season {selectedEpisode.episode.season_number}, Episode {selectedEpisode.episode.episode_number}
                </p>
                <h2 id="episode-dialog-title" className="mt-1 text-lg font-bold tracking-tight sm:text-2xl">
                  {selectedEpisode.episode.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                  {(episodeDetails?.vote_average ?? selectedEpisode.episode.vote_average) !== undefined && (
                    <span className="inline-flex items-center gap-1 font-medium text-amber-500">
                      <Star className="h-4 w-4 fill-current" />
                      {(episodeDetails?.vote_average ?? selectedEpisode.episode.vote_average ?? 0) > 0
                        ? (episodeDetails?.vote_average ?? selectedEpisode.episode.vote_average ?? 0).toFixed(1)
                        : 'Not rated'}
                      {episodeDetails?.vote_count ? ` (${episodeDetails.vote_count.toLocaleString()})` : ''}
                    </span>
                  )}
                  {(episodeDetails?.air_date || selectedEpisode.episode.air_date) && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(episodeDetails?.air_date || selectedEpisode.episode.air_date)}
                    </span>
                  )}
                  {(episodeDetails?.runtime || selectedEpisode.episode.runtime) && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {episodeDetails?.runtime || selectedEpisode.episode.runtime} min
                    </span>
                  )}
                </div>
                {episodeDetails?.production_code && (
                  <p className="mt-1 text-xs text-muted-foreground">Production code: {episodeDetails.production_code}</p>
                )}
              </div>
              <Button
                ref={episodeDialogCloseRef}
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Close episode details"
                onClick={() => setSelectedEpisode(null)}
                className="absolute right-3 top-3 rounded-full bg-background/90 shadow-md backdrop-blur hover:bg-background"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Overview</h3>
                <p className="text-sm leading-relaxed sm:text-base">
                  {episodeDetails?.overview || selectedEpisode.episode.overview || 'No overview available for this episode.'}
                </p>
              </div>

              {episodeDetailsQuery.loading && (
                <p className="text-sm text-muted-foreground" role="status">Loading episode credits and media...</p>
              )}
              {episodeDetailsQuery.error && (
                <p className="text-sm text-destructive" role="alert">
                  Episode credits and media could not be loaded: {episodeDetailsQuery.error.message}
                </p>
              )}

              {episodeDetails && (
                <>
                  {episodeDetails.crew.length > 0 && (
                    <section aria-labelledby="episode-crew-title" className="border-t pt-5">
                      <h3 id="episode-crew-title" className="mb-3 flex items-center gap-2 font-semibold">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Crew
                        <span className="text-sm font-normal text-muted-foreground">{episodeDetails.crew.length}</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {episodeDetails.crew.map((member) => (
                          <Link
                            key={`${member.id}:${member.job}`}
                            to={`/person/${member.id}`}
                            className="flex min-w-0 items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                              {member.profile_path ? (
                                <TMDBImage path={member.profile_path} alt="" width={96} height={144} sizes="48px" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">N/A</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{member.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{member.job}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

                  {episodeDetails.guest_stars.length > 0 && (
                    <section aria-labelledby="episode-guests-title" className="border-t pt-5">
                      <h3 id="episode-guests-title" className="mb-3 flex items-center gap-2 font-semibold">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Guest stars
                        <span className="text-sm font-normal text-muted-foreground">{episodeDetails.guest_stars.length}</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {episodeDetails.guest_stars.map((guest) => (
                          <Link
                            key={guest.id}
                            to={`/person/${guest.id}`}
                            className="flex min-w-0 items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                              {guest.profile_path ? (
                                <TMDBImage path={guest.profile_path} alt="" width={96} height={144} sizes="48px" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">N/A</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{guest.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{guest.character}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

                  {episodeDetails.images?.stills && episodeDetails.images.stills.length > 0 && (
                    <section aria-labelledby="episode-images-title" className="border-t pt-5">
                      <h3 id="episode-images-title" className="mb-3 flex items-center gap-2 font-semibold">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        Episode images
                        <span className="text-sm font-normal text-muted-foreground">{episodeDetails.images.stills.length}</span>
                      </h3>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {episodeDetails.images.stills.map((image, index) => (
                          <a
                            key={`${image.file_path}:${index}`}
                            href={tmdbService.getImageUrl(image.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open episode image ${index + 1}`}
                            className="w-48 shrink-0 overflow-hidden rounded-lg border bg-muted sm:w-56"
                          >
                            <TMDBImage
                              path={image.file_path}
                              alt={`${selectedEpisode.episode.name}, image ${index + 1}`}
                              width={448}
                              height={252}
                              sizes="(min-width: 640px) 224px, 192px"
                              className="aspect-video w-full object-cover transition-transform hover:scale-105"
                            />
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {episodeDetails.videos?.results && episodeDetails.videos.results.length > 0 && (
                    <section aria-labelledby="episode-videos-title" className="border-t pt-5">
                      <h3 id="episode-videos-title" className="mb-3 flex items-center gap-2 font-semibold">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        Videos
                        <span className="text-sm font-normal text-muted-foreground">{episodeDetails.videos.results.length}</span>
                      </h3>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {episodeDetails.videos.results.map((video) => {
                          const videoUrl = video.site === 'YouTube'
                            ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}`
                            : null;
                          const videoCard = (
                            <>
                              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-muted via-muted/70 to-primary/20">
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
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-black/45 text-white shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                                    <PlayCircle className="h-7 w-7" />
                                  </span>
                                </div>
                                <span className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                                  {video.type}
                                </span>
                                <span className="absolute bottom-2 right-2 rounded bg-black/65 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                                  {video.site}
                                </span>
                              </div>
                              <div className="p-3">
                                <p className="line-clamp-2 min-h-10 text-sm font-medium leading-5">{video.name}</p>
                              </div>
                            </>
                          );

                          return videoUrl ? (
                            <a
                              key={video.id}
                              href={videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group w-48 shrink-0 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
                            >
                              {videoCard}
                            </a>
                          ) : (
                            <div key={video.id} className="group w-48 shrink-0 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm sm:w-56">
                              {videoCard}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </>
              )}

            </div>
            <div className="flex shrink-0 flex-col gap-3 border-t bg-card/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:px-6">
              <Button
                asChild={selectedEpisode.streamUrl !== '#'}
                size="lg"
                className="gap-2"
                disabled={selectedEpisode.streamUrl === '#'}
              >
                {selectedEpisode.streamUrl !== '#' ? (
                  <a href={selectedEpisode.streamUrl} target="_blank" rel="noopener noreferrer">
                    <PlayCircle className="h-5 w-5" />
                    Watch episode
                  </a>
                ) : (
                  <>
                    <PlayCircle className="h-5 w-5" />
                    Watch episode
                  </>
                )}
              </Button>
              {selectedEpisode.streamUrl === '#' && (
                <p className="text-sm text-muted-foreground">
                  Add a TV URL template in embed settings to enable playback.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}