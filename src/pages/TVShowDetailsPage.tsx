// src/pages/TVShowDetailsPage.tsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, Clock, ExternalLink, Star, PlayCircle, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaSection } from '@/components/MediaSection';
import { CreditsCarousel } from '@/components/CreditsCarousel';
import { tmdbService, type Episode, type TVShow, type TVEpisodeDetails, type TVSeasonDetails } from '@/lib/tmdb';
import { buildEmbedUrl, formatDate, formatLanguage } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { ReviewSection } from '../components/ReviewSection';
import { EpisodesRatingOverview } from '../components/EpisodesRatingOverview';
import { LazySection } from '@/components/LazySection';
import { TMDBImage } from '@/components/TMDBImage';
import { useEmbedSettings } from '@/contexts/EmbedSettingsContext';
import { AccountMediaActions } from '@/components/AccountMediaActions';
import { TVEpisodeRatingAction } from '@/components/TVEpisodeRatingAction';
import { WatchLinkButton } from '@/components/WatchLinkButton';

const embedSettingsDialogTitle = 'Embed settings needed';
const embedSettingsDialogMessage = 'Add a TV URL template in embed settings to enable playback.';

interface EpisodeCardProps {
  episode: Episode;
  tvShowName: string;
  onSelectEpisode: (episode: Episode) => void;
}

function EpisodeCard({ episode, tvShowName, onSelectEpisode }: EpisodeCardProps) {
  return (
    <div className="relative min-w-0 sm:min-h-64">
      <button
        type="button"
        onClick={() => onSelectEpisode(episode)}
        className="group relative flex h-full w-full cursor-pointer appearance-none flex-row overflow-hidden rounded-xl border bg-card text-left text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-col"
      >
        <div className="relative w-2/5 shrink-0 self-stretch overflow-hidden sm:w-auto">
          {episode.still_path ? (
            <TMDBImage
              path={episode.still_path}
              alt={`${tvShowName}, episode ${episode.episode_number}: ${episode.name}`}
              width={500}
              height={281}
              sizes="(min-width: 1536px) 18vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 40vw"
              className="h-full min-h-[112px] w-full bg-muted object-cover sm:aspect-video sm:h-auto sm:min-h-0"
            />
          ) : (
            <div role="img" aria-label={`${episode.name} still unavailable`} className="flex h-full min-h-[112px] w-full items-center justify-center bg-muted text-center text-sm text-muted-foreground sm:aspect-video sm:h-auto sm:min-h-0">
              Still unavailable
            </div>
          )}
        </div>

        <div className="z-10 flex min-h-0 min-w-0 flex-1 flex-col bg-card p-3 sm:p-4">
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
          <p className="shrink-0 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:line-clamp-3">
            {episode.overview || 'No overview available for this episode.'}
          </p>
        </div>
      </button>
    </div>
  );
}

export function TVShowDetailsPage() {
  const { tvLinks, region } = useEmbedSettings();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSeason = parseInt(searchParams.get('season') || '0', 10);
  const [activeCredits, setActiveCredits] = useState<'cast' | 'crew'>('cast');
  const [activeEpisodeCredits, setActiveEpisodeCredits] = useState<'guest_stars' | 'crew'>('guest_stars');
  const [activeEpisodeMedia, setActiveEpisodeMedia] = useState<'images' | 'videos'>('images');
  const [activeShowMedia, setActiveShowMedia] = useState<'images' | 'videos'>('images');
  const [selectedEpisode, setSelectedEpisode] = useState<{ episode: Episode } | null>(null);
  const [selectedShowImageIndex, setSelectedShowImageIndex] = useState<number | null>(null);
  const [showEmbedSettingsDialog, setShowEmbedSettingsDialog] = useState(false);
  const episodeDialogCloseRef = useRef<HTMLButtonElement>(null);
  const showImageDialogRef = useRef<HTMLDivElement>(null);
  const showImageTriggerRef = useRef<HTMLButtonElement | null>(null);

  const navigate = useNavigate();
  const tvShowQuery = useCachedQuery<TVShow>(
    `tv:${id ?? 'none'}`,
    (signal) => tmdbService.getTVShowDetails(Number(id), { signal }),
    { enabled: Boolean(id), ttlMs: 15 * 60 * 1000 },
  );
  const tvShow = tvShowQuery.data ?? null;
  const regionProviders = region ? tvShow?.['watch/providers']?.results?.[region]?.flatrate ?? [] : [];
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
  const episodeGuestStars = episodeDetails?.guest_stars ?? [];
  const episodeCrew = (episodeDetails?.crew ?? []).filter((member) => member.job !== 'Director');
  const episodeDirectors = (episodeDetails?.crew ?? []).filter((member, index, crew) =>
    member.job === 'Director'
      && crew.findIndex((candidate) => candidate.id === member.id && candidate.job === 'Director') === index,
  );
  const episodeImages = episodeDetails?.images?.stills ?? [];
  const episodeVideos = episodeDetails?.videos?.results ?? [];
  const showImages = [
    ...(tvShow?.images?.backdrops ?? []).map((image) => ({ ...image, type: 'backdrop' as const })),
    ...(tvShow?.images?.posters ?? []).map((image) => ({ ...image, type: 'poster' as const })),
    ...(tvShow?.images?.logos ?? []).map((image) => ({ ...image, type: 'logo' as const })),
  ].filter((image) => image.file_path);
  const episodes = seasonQuery.data?.episodes ?? [];
  const selectedEpisodeIndex = selectedEpisode
    ? episodes.findIndex((episode) => episode.id === selectedEpisode.episode.id)
    : -1;
  const previousEpisode = selectedEpisodeIndex > 0 ? episodes[selectedEpisodeIndex - 1] : undefined;
  const nextEpisode = selectedEpisodeIndex >= 0 && selectedEpisodeIndex < episodes.length - 1
    ? episodes[selectedEpisodeIndex + 1]
    : undefined;
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
    if (selectedSeason > 0 && (seasonCast === null || seasonCrew === null)) return;

    const castCount = selectedSeason > 0
      ? seasonCast?.length ?? 0
      : tvShow?.credits?.cast.length ?? 0;
    const crewCount = selectedSeason > 0
      ? seasonCrew?.length ?? 0
      : tvShow?.credits?.crew.length ?? 0;
    setActiveCredits(castCount === 0 && crewCount > 0 ? 'crew' : 'cast');
  }, [
    selectedSeason,
    seasonCast,
    seasonCrew,
    tvShow?.credits?.cast.length,
    tvShow?.credits?.crew.length,
  ]);

  useEffect(() => {
    if (!episodeDetails) return;
    setActiveEpisodeCredits(episodeGuestStars.length > 0 ? 'guest_stars' : 'crew');
    setActiveEpisodeMedia(episodeImages.length > 0 ? 'images' : 'videos');
  }, [episodeDetails, episodeGuestStars.length, episodeImages.length]);

  useEffect(() => {
    setActiveShowMedia(showImages.length > 0 ? 'images' : 'videos');
  }, [tvShow?.id, showImages.length, tvShow?.videos?.results.length]);

  useEffect(() => {
    if (selectedShowImageIndex !== null) {
      showImageDialogRef.current?.focus();
    } else {
      showImageTriggerRef.current?.focus();
    }
  }, [selectedShowImageIndex]);

  useEffect(() => {
    if (selectedShowImageIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        setSelectedShowImageIndex((index) => index === null ? null : (index + 1) % showImages.length);
      } else if (event.key === 'ArrowLeft') {
        setSelectedShowImageIndex((index) => index === null ? null : (index - 1 + showImages.length) % showImages.length);
      } else if (event.key === 'Escape') {
        setSelectedShowImageIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShowImageIndex, showImages.length]);

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
  const contentRating = region
    ? tvShow.content_ratings?.results.find((contentRating) =>
      contentRating.iso_3166_1 === region && contentRating.rating,
    )
    : undefined;
  const tvRelated = tvShow.recommendations?.results?.length ? tvShow.recommendations : tvShow.similar;
  const similarShows = tvRelated?.results ?? [];
  const tvRelatedType = tvShow.recommendations?.results?.length ? 'recommendations' : 'similar';
  const hasMoreRelatedShows = (tvRelated?.total_pages ?? (similarShows.length >= 20 ? 2 : 1)) > 1;
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
  const hasCredits = cast.length > 0 || crew.length > 0 || seasonCreditsLoading;
  const hasSeasonRatings = tvShow.seasons?.some((season) => season.season_number > 0) ?? false;

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        <div className="mb-6 min-w-0 md:hidden">
          <h1 className="break-words text-3xl font-bold tracking-tight md:text-4xl">{tvShow.name}</h1>
          {tvShow.tagline && (
            <p className="mt-1 text-sm italic text-muted-foreground">"{tvShow.tagline}"</p>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 min-[360px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
          <div className="mx-auto w-full max-w-[180px] space-y-4 min-[360px]:mx-0 min-[360px]:max-w-none md:max-w-none">
            {tvShow.poster_path ? (
              <TMDBImage path={tvShow.poster_path} alt={`${tvShow.name} poster`} width={500} height={750} sizes="(min-width: 768px) 200px, (min-width: 360px) 42vw, 180px" loading="eager" fetchPriority="high" className="block h-auto w-full max-w-full rounded-lg border" />
            ) : (
              <div role="img" aria-label={`${tvShow.name} poster unavailable`} className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center text-center text-sm text-muted-foreground">Poster unavailable</div>
            )}
            <AccountMediaActions mediaId={tvShow.id} mediaType="tv" mediaTitle={tvShow.name} />
          </div>

          <div className="contents md:grid md:min-w-0 md:grid-cols-1 md:gap-y-4 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6">
            <div className="contents md:col-start-1 md:row-start-1 md:flex md:flex-col md:gap-4">
            <div className="min-w-0 flex flex-col gap-6 min-[360px]:col-start-2">
            <div className="hidden md:block">
              <h1 className="break-words text-3xl font-bold tracking-tight">{tvShow.name}</h1>
              {tvShow.tagline && (
                <p className="mt-1 text-sm italic text-muted-foreground">"{tvShow.tagline}"</p>
              )}
            </div>
            {tvShow.created_by && tvShow.created_by.length > 0 && (
              <p className="text-sm font-medium text-muted-foreground">
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

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
              {contentRating && (
                <Badge variant="outline" aria-label={`${region} content rating ${contentRating.rating}`}>
                  {region} · {contentRating.rating}
                </Badge>
              )}
              {tvShow.original_language && (
                <Link to={`/category/language-tv-${tvShow.original_language}`} className="inline-flex">
                  <Badge variant="secondary" aria-label={`Original language: ${formatLanguage(tvShow.original_language)}`}>
                    {formatLanguage(tvShow.original_language)}
                  </Badge>
                </Link>
              )}
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

            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {tvShow.external_ids?.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${tvShow.external_ids.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  IMDb
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
              )}
              <a
                href={`https://www.themoviedb.org/tv/${tvShow.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                TMDB
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            </div>

            {(tvShow.status || tvShow.number_of_seasons !== undefined) && (
              <div className="space-y-1 text-sm">
                {tvShow.status && (
                  <p>
                    <span className="text-muted-foreground">Status: </span>
                    <span className="font-medium">{tvShow.status}</span>
                  </p>
                )}
                {tvShow.number_of_seasons !== undefined && (
                  <p className="font-medium">
                    {tvShow.number_of_seasons} Season{tvShow.number_of_seasons !== 1 ? 's' : ''} •{' '}
                    {tvShow.number_of_episodes} Episode{tvShow.number_of_episodes !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            </div>

            {tvShow.overview && (
              <section className="min-[360px]:col-span-2">
                <h2 className="mb-2 text-xl font-semibold">Overview</h2>
                <p className="leading-relaxed text-muted-foreground">{tvShow.overview}</p>
              </section>
            )}
            </div>

            {tvShow.videos?.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube') && (
              <section className="hidden min-w-0 md:col-start-1 md:row-start-2 md:block xl:col-start-2 xl:row-start-1">
                <h2 className="mb-2 text-xl font-semibold">Trailer</h2>
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
              </section>
            )}
          </div>
        </div>

        {(regionProviders.length || tvShow.production_companies?.length) && (
          <section className="mt-8 flex flex-wrap items-start gap-x-6 gap-y-6 border-t pt-6">
            {regionProviders.length > 0 && (
              <div className="w-fit max-w-full shrink-0">
                <h2 className="mb-3 text-xl font-semibold">Streaming On in {region}</h2>
                <div className="flex flex-wrap gap-3">
                  {regionProviders.map((provider) => {
                    return (
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
                    );
                  })}
                </div>
              </div>
            )}
            {tvShow.production_companies && tvShow.production_companies.length > 0 && (
              <div className="min-w-[min(100%,16rem)] flex-1">
                <h2 className="mb-3 text-xl font-semibold">Production</h2>
                <div className="flex flex-wrap items-center gap-6">
                  {tvShow.production_companies.map((company) => (
                    <Link
                      key={company.id}
                      to={`/category/company-${company.id}?name=${encodeURIComponent(company.name)}`}
                      className="group flex items-center"
                      title={company.name}
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
                        <span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">{company.name}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {tvShow.videos?.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube') && (
          <section className="mt-8 md:hidden">
            <h2 className="mb-2 text-xl font-semibold">Trailer</h2>
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
          </section>
        )}

        {(hasCredits || hasSeasonRatings) && (
          <div className="mt-12 grid gap-6 border-t pt-8 lg:grid-cols-5">
            {hasCredits && (
              <section className="min-w-0 lg:col-span-3">
                <div className="mb-4 flex items-start justify-between gap-4">
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
              </section>
            )}

            {hasSeasonRatings && (
              <section
                className={`min-w-0 ${hasCredits ? 'lg:col-span-2' : 'lg:col-span-5'}`}
                aria-labelledby="season-ratings-title"
              >
                <h2 id="season-ratings-title" className="mb-4 text-xl font-semibold">Season Ratings</h2>
                <div className="h-[190px] w-full overflow-hidden rounded-xl border bg-card p-4 text-card-foreground shadow-sm lg:p-5">
                  <EpisodesRatingOverview tvId={tvShow.id} seasons={tvShow.seasons ?? []} />
                </div>
              </section>
            )}
          </div>
        )}

        {/* Episodes */}
        {tvShow.seasons && tvShow.seasons.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
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

            {selectedSeasonDetails?.overview?.trim() && (
              <div className="mb-6">
                <h3 className="mb-2 text-lg font-semibold">
                  {selectedSeasonDetails.name || `Season ${selectedSeason}`} Overview
                </h3>
                <p className="leading-relaxed text-muted-foreground">{selectedSeasonDetails.overview}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {loadingEpisodes ? (
                [...Array(5)].map((_, index) => (
                  <Skeleton key={index} className="h-64 w-full rounded-xl" />
                ))
              ) : (
                episodes.map((episode) => (
                  <EpisodeCard
                    key={episode.id}
                    episode={episode}
                    tvShowName={tvShow.name}
                    onSelectEpisode={(selected) => setSelectedEpisode({ episode: selected })}
                  />
                ))
              )}

              {!loadingEpisodes && episodes.length === 0 && (
                <div className="col-span-full pt-8">
                  <p className="text-center text-muted-foreground">No episodes found for this season.</p>
                </div>
              )}
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

        {(showImages.length > 0 || (tvShow.videos?.results.length ?? 0) > 0) && (
          <LazySection>
            <section aria-labelledby="tv-media-title" className="mt-12 border-t pt-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 id="tv-media-title" className="text-2xl font-semibold">Media</h2>
                <div className="flex rounded-md border p-1" role="group" aria-label="TV show media">
                  <Button
                    type="button"
                    variant={activeShowMedia === 'images' ? 'selected' : 'ghost'}
                    size="sm"
                    disabled={showImages.length === 0}
                    onClick={() => setActiveShowMedia('images')}
                  >
                    Images ({showImages.length})
                  </Button>
                  <Button
                    type="button"
                    variant={activeShowMedia === 'videos' ? 'selected' : 'ghost'}
                    size="sm"
                    disabled={!tvShow.videos?.results.length}
                    onClick={() => setActiveShowMedia('videos')}
                  >
                    Videos ({tvShow.videos?.results.length ?? 0})
                  </Button>
                </div>
              </div>

              {activeShowMedia === 'images' && showImages.length > 0 && (
                <div className="flex items-start gap-3 overflow-x-auto pb-2">
                  {showImages.map((image, index) => (
                    <button
                      type="button"
                      key={`${image.file_path}:${image.type}:${index}`}
                      onClick={() => {
                        showImageTriggerRef.current = document.activeElement instanceof HTMLButtonElement
                          ? document.activeElement
                          : null;
                        setSelectedShowImageIndex(index);
                      }}
                      aria-label={`View TV show ${image.type} ${index + 1}`}
                      className="relative block h-32 shrink-0 overflow-hidden rounded-lg border bg-muted p-0"
                      style={{ width: `${image.aspect_ratio * 8}rem` }}
                    >
                      <TMDBImage
                        path={image.file_path}
                        alt={`${tvShow.name} ${image.type} ${index + 1}`}
                        width={image.width}
                        height={image.height}
                        sizes={`${Math.ceil(image.aspect_ratio * 128)}px`}
                        className="block h-full w-full object-contain transition-transform hover:scale-105"
                      />
                      <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/65 px-2 py-1 text-[11px] font-medium capitalize text-white backdrop-blur-sm">
                        {image.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {activeShowMedia === 'videos' && tvShow.videos?.results.length ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {tvShow.videos.results.map((video) => {
                    const videoUrl = video.site === 'YouTube'
                      ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}`
                      : null;
                    const videoCard = (
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
              ) : null}
            </section>
          </LazySection>
        )}
        
        {similarShows.length > 0 && (
          <LazySection>
            <MediaSection
              title="Similar TV Shows"
              items={similarShows}
              type="tv"
              actionLabel="See More"
              category={`tv-${tvRelatedType}-${tvShow.id}`}
              hideSeeMore={!hasMoreRelatedShows}
              limit={20}
              horizontalScroll
              className="mt-12 border-t pt-8"
              titleClassName="text-2xl font-semibold tracking-normal"
            />
          </LazySection>
        )}
      </div>
      {selectedShowImageIndex !== null && showImages[selectedShowImageIndex] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 px-3 py-4 backdrop-blur-sm sm:px-6"
          onClick={() => setSelectedShowImageIndex(null)}
          role="presentation"
        >
          <div
            ref={showImageDialogRef}
            className="relative flex w-full max-w-7xl flex-col rounded-2xl p-2 outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tv-gallery-dialog-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p id="tv-gallery-dialog-title" className="text-sm font-medium text-white/70">
                {`Image ${selectedShowImageIndex + 1} / ${showImages.length}`}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedShowImageIndex(null)}
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
                onClick={() => setSelectedShowImageIndex((index) => index === null
                  ? null
                  : (index === 0 ? showImages.length - 1 : index - 1))}
                aria-label="Previous TV show image"
                title="Previous TV show image"
                className="h-10 w-10 shrink-0 rounded-full border-white/20 bg-black/50 text-white hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <TMDBImage
                path={showImages[selectedShowImageIndex].file_path}
                alt={`${tvShow.name} ${showImages[selectedShowImageIndex].type} ${selectedShowImageIndex + 1}`}
                width={showImages[selectedShowImageIndex].width}
                height={showImages[selectedShowImageIndex].height}
                sizes="min(90vw, 1200px)"
                loading="eager"
                className="max-h-[85vh] w-full rounded-xl object-contain shadow-2xl"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setSelectedShowImageIndex((index) => index === null
                  ? null
                  : (index + 1) % showImages.length)}
                aria-label="Next TV show image"
                title="Next TV show image"
                className="h-10 w-10 shrink-0 rounded-full border-white/20 bg-black/50 text-white hover:bg-white/10 hover:text-white"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
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
                  <TVEpisodeRatingAction
                    tvId={Number(id)}
                    seasonNumber={selectedEpisode.episode.season_number}
                    episodeNumber={selectedEpisode.episode.episode_number}
                    episodeName={selectedEpisode.episode.name}
                  />
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
              {episodeDirectors.length > 0 && (
                <p className="text-sm font-medium text-muted-foreground">
                  Directed by{' '}
                  {episodeDirectors.map((director, index) => (
                    <span key={director.id}>
                      <Link to={`/person/${director.id}`} className="font-semibold text-primary hover:underline">
                        {director.name}
                      </Link>
                      {index < episodeDirectors.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              )}

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
                  {(episodeDirectors.length > 0 || episodeCrew.length > 0 || episodeGuestStars.length > 0) && (
                    <section aria-labelledby="episode-credits-title" className="border-t pt-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h3 id="episode-credits-title" className="flex items-center gap-2 font-semibold">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          Episode credits
                        </h3>
                        {(episodeCrew.length > 0 || episodeGuestStars.length > 0) && (
                          <div className="flex rounded-md border p-1" role="group" aria-label="Episode credits">
                          <Button
                            type="button"
                            variant={activeEpisodeCredits === 'guest_stars' ? 'selected' : 'ghost'}
                            size="sm"
                            disabled={episodeGuestStars.length === 0}
                            onClick={() => setActiveEpisodeCredits('guest_stars')}
                          >
                            Guest stars ({episodeGuestStars.length})
                          </Button>
                          <Button
                            type="button"
                            variant={activeEpisodeCredits === 'crew' ? 'selected' : 'ghost'}
                            size="sm"
                            disabled={episodeCrew.length === 0}
                            onClick={() => setActiveEpisodeCredits('crew')}
                          >
                            Crew ({episodeCrew.length})
                          </Button>
                          </div>
                        )}
                      </div>

                      {activeEpisodeCredits === 'crew' && episodeCrew.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {episodeCrew.map((member) => (
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
                      )}

                      {activeEpisodeCredits === 'guest_stars' && episodeGuestStars.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {episodeGuestStars.map((guest) => (
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
                      )}
                    </section>
                  )}

                  {(episodeImages.length > 0 || episodeVideos.length > 0) && (
                    <section aria-labelledby="episode-media-title" className="border-t pt-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h3 id="episode-media-title" className="font-semibold">Episode media</h3>
                        <div className="flex rounded-md border p-1" role="group" aria-label="Episode media">
                          <Button
                            type="button"
                            variant={activeEpisodeMedia === 'images' ? 'selected' : 'ghost'}
                            size="sm"
                            disabled={episodeImages.length === 0}
                            onClick={() => setActiveEpisodeMedia('images')}
                          >
                            Images ({episodeImages.length})
                          </Button>
                          <Button
                            type="button"
                            variant={activeEpisodeMedia === 'videos' ? 'selected' : 'ghost'}
                            size="sm"
                            disabled={episodeVideos.length === 0}
                            onClick={() => setActiveEpisodeMedia('videos')}
                          >
                            Videos ({episodeVideos.length})
                          </Button>
                        </div>
                      </div>
                      {activeEpisodeMedia === 'images' && episodeImages.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {episodeImages.map((image, index) => (
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
                      )}

                      {activeEpisodeMedia === 'videos' && episodeVideos.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {episodeVideos.map((video) => {
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
                      )}
                    </section>
                  )}
                </>
              )}

            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-card/95 p-3 backdrop-blur sm:p-4 sm:px-6">
              <WatchLinkButton
                links={tvShow ? tvLinks.map((link) => ({
                  name: link.name,
                  url: buildEmbedUrl(link.urlTemplate, tvShow.id, tvShow.external_ids?.imdb_id || '')
                    .replace(/\{SEASON\}/g, selectedEpisode.episode.season_number.toString())
                    .replace(/\{EPISODE\}/g, selectedEpisode.episode.episode_number.toString()),
                })) : []}
                label="Watch episode"
                size="lg"
                className="h-9 min-w-0 shrink gap-1 px-2 sm:h-10 sm:gap-2 sm:px-8"
                onEmpty={() => setShowEmbedSettingsDialog(true)}
              />
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-9 w-9 shrink-0 px-0 sm:h-10 sm:w-10"
                  aria-label="Previous episode"
                  title="Previous episode"
                  disabled={!previousEpisode}
                  onClick={() => previousEpisode && setSelectedEpisode({ episode: previousEpisode })}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-9 w-9 shrink-0 px-0 sm:h-10 sm:w-10"
                  aria-label="Next episode"
                  title="Next episode"
                  disabled={!nextEpisode}
                  onClick={() => nextEpisode && setSelectedEpisode({ episode: nextEpisode })}
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
      {showEmbedSettingsDialog && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="max-w-sm rounded-lg bg-card p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">{embedSettingsDialogTitle}</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {embedSettingsDialogMessage}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEmbedSettingsDialog(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowEmbedSettingsDialog(false);
                  navigate('/settings');
                }}
                className="flex-1"
              >
                Go to Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

