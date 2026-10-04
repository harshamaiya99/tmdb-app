// src/components/EpisodesRatingOverview.tsx
import { useEffect, useState } from 'react';
import { tmdbService, type Episode, type Season } from '../lib/tmdb';

interface EpisodesRatingOverviewProps {
  tvId: number;
  seasons: Season[];
}

export function EpisodesRatingOverview({ tvId, seasons }: EpisodesRatingOverviewProps) {
  const [seasonsData, setSeasonsData] = useState<Record<number, Episode[]>>({});
  const [loading, setLoading] = useState(true);

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
    <div className="w-full min-w-0 min-h-0 flex flex-col h-full">
      <div className="flex-1 min-w-0 min-h-0 overflow-auto pr-2 season-ratings-scrollbar">
        <div className="flex flex-col gap-1.5 min-w-max pb-2">
          <div className="sticky top-0 z-20 flex items-center gap-2 bg-card">
            <span className="sticky left-0 z-30 w-6 shrink-0 bg-card text-right text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ep
            </span>
            <div className="flex gap-1">
              {Array.from({ length: maxEpisodeCount }, (_, index) => (
                <span
                  key={index + 1}
                  aria-label={`Episode ${index + 1}`}
                  className="w-3.5 shrink-0 text-center text-[8px] leading-3 text-muted-foreground"
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </div>
          {regularSeasons.map((season) => {
            const episodes = seasonsData[season.season_number];

            return (
              <div key={season.id} className="flex items-center gap-2">
                <span className="sticky left-0 z-10 bg-card text-[10px] font-medium text-muted-foreground w-6 shrink-0 text-right">
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
                      <button
                        type="button"
                        key={ep.id}
                        aria-label={`Season ${season.season_number}, episode ${ep.episode_number}: ${ep.name}. Rating ${ep.vote_average?.toFixed(1) || 'not rated'}`}
                        title={`S${season.season_number}E${ep.episode_number}: ${ep.name}\nRating: ${ep.vote_average?.toFixed(1) || 'N/A'}`}
                        className={`h-3.5 w-3.5 rounded-[2px] transition-all hover:scale-125 hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${getRatingColor(ep.vote_average)}`}
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
      
      <div className="shrink-0 pt-2 bg-card mt-auto">
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