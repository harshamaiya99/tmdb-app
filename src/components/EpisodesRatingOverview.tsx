// src/components/EpisodesRatingOverview.tsx
import { useEffect, useState } from 'react';
import { tmdbService, type Episode, type Season } from '../lib/tmdb';
import { Button } from './ui/button';

interface EpisodesRatingOverviewProps {
  tvId: number;
  seasons: Season[];
  rowSpan: number; // NEW: Receives its grid height from the parent
  onExpand?: () => void;
  onCollapse?: () => void;
}

export function EpisodesRatingOverview({ tvId, seasons, rowSpan, onExpand, onCollapse }: EpisodesRatingOverviewProps) {
  const [seasonsData, setSeasonsData] = useState<Record<number, Episode[]>>({});
  const [loading, setLoading] = useState(true);

  const regularSeasons = seasons.filter((s) => s.season_number > 0);
  
  // THE MAGIC FORMULA:
  // 1 card height fits exactly 10 seasons. 
  // Each additional card height adds room for 18 more seasons (due to grid gaps).
  const visibleSeasons = 10 + (Math.max(1, rowSpan) - 1) * 18;

  useEffect(() => {
    const fetchVisibleSeasons = async () => {
      setLoading(true);
      const newSeasonsData = { ...seasonsData };
      const seasonsToFetch = regularSeasons.slice(0, visibleSeasons);

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
      fetchVisibleSeasons();
    }
  }, [tvId, visibleSeasons, regularSeasons.length]); 

  const getRatingColor = (rating?: number) => {
    if (!rating || rating === 0) return 'bg-muted'; 
    if (rating >= 8.5) return 'bg-emerald-600';     
    if (rating >= 7.0) return 'bg-emerald-400';     
    if (rating >= 5.5) return 'bg-yellow-400';      
    if (rating >= 4.0) return 'bg-orange-500';      
    return 'bg-red-500';                            
  };

  if (regularSeasons.length === 0) return null;

  return (
    <div className="w-full flex flex-col h-full">
      
      {/* Scrollable Container prevents stretching */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
        <div className="flex flex-col gap-1.5 min-w-max pb-2">
          {regularSeasons.slice(0, visibleSeasons).map((season) => {
            const episodes = seasonsData[season.season_number];

            return (
              <div key={season.id} className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground w-6 shrink-0 text-right">
                  S{season.season_number}
                </span>
                
                {loading && !episodes ? (
                  <div className="flex gap-1">
                    {[...Array(season.episode_count || 10)].map((_, i) => (
                      <div key={i} className="w-3.5 h-3.5 rounded-[2px] bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : episodes ? (
                  <div className="flex gap-1">
                    {episodes.map((ep) => (
                      <div
                        key={ep.id}
                        title={`S${season.season_number}E${ep.episode_number}: ${ep.name}\nRating: ${ep.vote_average?.toFixed(1) || 'N/A'}`}
                        className={`w-3.5 h-3.5 rounded-[2px] cursor-help hover:ring-2 hover:ring-ring hover:scale-125 transition-all ${getRatingColor(ep.vote_average)}`}
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
      
      {/* Bottom Controls */}
      <div className="shrink-0 pt-2 bg-card mt-auto">
        {visibleSeasons < regularSeasons.length ? (
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
            onClick={() => {
              if (onExpand) onExpand(); // The parent controls the expansion now!
            }}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'View More Seasons'}
          </Button>
        ) : regularSeasons.length > 10 ? (
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
            onClick={() => {
              if (onCollapse) onCollapse(); 
            }}
          >
            View Less Seasons
          </Button>
        ) : null}

        {/* Micro Legend */}
        <div className="flex items-center justify-center gap-3 mt-2 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-emerald-600"></div> Great</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-emerald-400"></div> Good</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-yellow-400"></div> Mixed</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-red-500"></div> Poor</div>
        </div>
      </div>
    </div>
  );
}