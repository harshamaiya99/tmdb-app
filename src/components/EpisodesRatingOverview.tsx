// src/components/EpisodesRatingOverview.tsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tmdbService, type Episode, type Season } from '../lib/tmdb';

interface EpisodesRatingOverviewProps {
  tvId: number;
  seasons: Season[];
}

export function EpisodesRatingOverview({ tvId, seasons }: EpisodesRatingOverviewProps) {
  const [seasonsData, setSeasonsData] = useState<Record<number, Episode[]>>({});
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const regularSeasons = seasons.filter((s) => s.season_number > 0);
  const maxEpisodeCount = Math.max(...regularSeasons.map((season) => season.episode_count), 0);

  useEffect(() => {
    const fetchSeasonRatings = async () => {
      setLoading(true);
      const newSeasonsData = { ...seasonsData };
      const seasonsToFetch = regularSeasons;

      const promises = seasonsToFetch.map(async (season) => {
        if (!newSeasonsData[season.season_number]) {
          try {
            const data = await tmdbService.getTVSeasonDetails(tvId, season.season_number);
            newSeasonsData[season.season_number] = data.episodes;
          } catch (error) {
            console.error(`Failed to fetch season ${season.season_number}`, error);
          }
        }
      });

      await Promise.all(promises);
      setSeasonsData(newSeasonsData);
      setLoading(false);
    };

    if (regularSeasons.length > 0) {
      fetchSeasonRatings();
    }
  }, [tvId, regularSeasons.length]);

  useEffect(() => {
    if (!isExpanded) return;

    const previousActiveElement = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExpanded(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previousActiveElement instanceof HTMLElement) previousActiveElement.focus();
    };
  }, [isExpanded]);

  const getRatingColor = (rating?: number) => {
    if (!rating || rating === 0) return 'bg-muted'; 
    if (rating >= 8.5) return 'bg-emerald-600';     
    if (rating >= 7.0) return 'bg-emerald-400';     
    if (rating >= 5.5) return 'bg-yellow-400';      
    if (rating >= 4.0) return 'bg-orange-500';      
    return 'bg-red-500';                            
  };

  if (regularSeasons.length === 0) return null;

  const renderHeatmap = (expanded = false) => (
    <div className="flex h-full w-full min-h-0 min-w-0 gap-3">
      <div className="flex-1 min-w-0 min-h-0 overflow-auto pr-2 season-ratings-scrollbar">
        <div className={`flex flex-col min-w-max pb-2 ${expanded ? 'gap-2' : 'gap-1.5'}`}>
          <div className="sticky top-0 z-20 flex items-center gap-2 bg-card">
            <span className={`sticky left-0 z-30 shrink-0 bg-card text-right font-semibold uppercase tracking-wide text-muted-foreground ${expanded ? 'w-8 text-xs' : 'w-6 text-[9px]'}`}>
              Ep
            </span>
            <div className={expanded ? 'flex gap-1.5' : 'flex gap-1'}>
              {Array.from({ length: maxEpisodeCount }, (_, index) => (
                <span
                  key={index + 1}
                  aria-label={`Episode ${index + 1}`}
                  className={`shrink-0 text-center leading-3 text-muted-foreground ${expanded ? 'w-5 text-[10px]' : 'w-3.5 text-[8px]'}`}
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </div>
          {regularSeasons.map((season) => {
            const episodes = seasonsData[season.season_number];
            const cellSize = expanded ? 'h-5 w-5' : 'h-3.5 w-3.5';

            return (
              <div key={season.id} className="flex items-center gap-2">
                <span className={`sticky left-0 z-10 shrink-0 bg-card text-right font-medium text-muted-foreground ${expanded ? 'w-8 text-xs' : 'w-6 text-[10px]'}`}>
                  S{season.season_number}
                </span>
                
                {loading && !episodes ? (
                  <div className={expanded ? 'flex gap-1.5' : 'flex gap-1'}>
                    {[...Array(season.episode_count || 10)].map((_, i) => (
                      <div key={i} className={`${cellSize} rounded-[2px] bg-muted animate-pulse`} />
                    ))}
                  </div>
                ) : episodes ? (
                  <div className={expanded ? 'flex gap-1.5' : 'flex gap-1'}>
                    {episodes.map((ep) => (
                      <button
                        type="button"
                        key={ep.id}
                        aria-label={`Season ${season.season_number}, episode ${ep.episode_number}: ${ep.name}. Rating ${ep.vote_average?.toFixed(1) || 'not rated'}`}
                        title={`S${season.season_number}E${ep.episode_number}: ${ep.name}\nRating: ${ep.vote_average?.toFixed(1) || 'N/A'}`}
                        className={`${cellSize} rounded-[2px] transition-all hover:scale-125 hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${getRatingColor(ep.vote_average)}`}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Failed to load</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className={`flex shrink-0 flex-col self-end justify-end bg-card font-semibold uppercase tracking-wider text-muted-foreground ${expanded ? 'gap-3 text-xs' : 'gap-1.5 text-[9px]'}`}>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-emerald-600"></div> Great</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-emerald-400"></div> Good</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-yellow-400"></div> Mixed</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-red-500"></div> Poor</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="relative h-full w-full min-h-0 min-w-0">
        {renderHeatmap()}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(true)}
          aria-label="Expand season ratings heatmap"
          aria-haspopup="dialog"
          title="Expand season ratings heatmap"
          className="absolute right-0 top-0 z-30 h-7 w-7 bg-card/90"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      {isExpanded && createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsExpanded(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="expanded-season-ratings-title"
            className="flex h-[90vh] w-full max-w-screen-2xl flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
              <h2 id="expanded-season-ratings-title" className="text-lg font-semibold">Season Ratings</h2>
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(false)}
                aria-label="Close expanded season ratings"
              >
                <X className="h-4 w-4" />
              </Button>
            </header>
            <div className="min-h-0 flex-1 p-4 sm:p-6">
              {renderHeatmap(true)}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}