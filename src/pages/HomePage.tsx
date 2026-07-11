// src/pages/HomePage.tsx

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MediaCard } from '@/components/MediaCard';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
// NEW: Imported PersonListResult
import { tmdbService, type Movie, type TVShow, type PersonListResult } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';
import { useTitle } from '@/contexts/TitleContext';

export function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [tvShows, setTVShows] = useState<TVShow[]>([]);

  const [nowPlayingMovies, setNowPlayingMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [popularTVShows, setPopularTVShows] = useState<TVShow[]>([]);
  const [topRatedTVShows, setTopRatedTVShows] = useState<TVShow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  
  // NEW: Added people array to the searchResults state
  const [searchResults, setSearchResults] = useState<{ movies: Movie[]; tv: TVShow[]; people: PersonListResult[] } | null>(null);
  
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();
  const { setTitle } = useTitle();

  useEffect(() => {
    setTitle('TMDB Explorer');
  }, [setTitle]);

  const searchTerm = searchParams.get('query')?.trim() ?? '';
  const hasActiveSearch = Boolean(searchTerm);

  useEffect(() => {
    fetchTrending();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    let isActive = true;

    const runSearch = async () => {
      try {
        setSearching(true);
        // NEW: Added tmdbService.searchPersons to the Promise.all array
        const [movieResults, tvResults, peopleResults] = await Promise.all([
          tmdbService.searchMovies(searchTerm),
          tmdbService.searchTVShows(searchTerm),
          tmdbService.searchPersons(searchTerm),
        ]);

        if (isActive) {
          // NEW: Stored peopleResults in the state
          setSearchResults({
            movies: movieResults.results,
            tv: tvResults.results,
            people: peopleResults.results,
          });
        }
      } catch {
        if (isActive) {
          toast({
            variant: 'destructive',
            title: 'Search failed',
            description: 'Unable to perform search.',
          });
        }
      } finally {
        if (isActive) {
          setSearching(false);
        }
      }
    };

    runSearch();

    return () => {
      isActive = false;
    };
  }, [searchTerm, toast]);

  const fetchTrending = async () => {
    try {
      setLoading(true);
      setError('');
      const [
        moviesData,
        tvData,
        nowPlayingData,
        topRatedMoviesData,
        upcomingMoviesData,
        popularTVData,
        topRatedTVData,
      ] = await Promise.all([
        tmdbService.getTrendingMovies(),
        tmdbService.getTrendingTVShows(),
        tmdbService.getNowPlayingMovies(),
        tmdbService.getTopRatedMovies(),
        tmdbService.getUpcomingMovies(),
        tmdbService.getPopularTVShows(),
        tmdbService.getTopRatedTVShows(),
      ]);

      setMovies(moviesData);
      setTVShows(tvData);
      setNowPlayingMovies(nowPlayingData);
      setTopRatedMovies(topRatedMoviesData);
      setUpcomingMovies(upcomingMoviesData);
      setPopularTVShows(popularTVData);
      setTopRatedTVShows(topRatedTVData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const displayMovies = searchResults?.movies ?? movies;
  const displayTVShows = searchResults?.tv ?? tvShows;
  // NEW: Extract displayPeople array
  const displayPeople = searchResults?.people ?? [];

  const ContentSection = ({ title, items, type, category, hideSeeMore = false }: { title: string; items: (Movie | TVShow)[]; type: 'movie' | 'tv'; category: string; hideSeeMore?: boolean }) => {
    if (!items || items.length === 0) return null;

    return (
      <section className="space-y-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {!hideSeeMore && (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/category/${category}`}>See More &rarr;</Link>
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {items.slice(0, 10).map((item) => (
            <MediaCard key={item.id} item={item as any} type={type} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="container py-6">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasActiveSearch && (
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Showing results for</p>
            <h1 className="text-2xl font-semibold">“{searchTerm}”</h1>
          </div>
        </div>
      )}

      {loading || searching ? (
        <div className="space-y-8">
          <MediaGridSkeleton />
          <MediaGridSkeleton />
        </div>
      ) : (
        <div className="space-y-12 pb-12">
          
          <ContentSection
            title={hasActiveSearch ? 'Movies' : 'Trending Movies'}
            items={displayMovies}
            type="movie"
            category="trending-movies"
            hideSeeMore={hasActiveSearch}
          />

          {!hasActiveSearch && (
            <>
              <ContentSection
                title="Now Playing in Theaters"
                items={nowPlayingMovies}
                type="movie"
                category="now-playing-movies"
              />
              <ContentSection
                title="Top Rated Movies"
                items={topRatedMovies}
                type="movie"
                category="top-rated-movies"
              />
              <ContentSection
                title="Upcoming Movies"
                items={upcomingMovies}
                type="movie"
                category="upcoming-movies"
              />
            </>
          )}

          <ContentSection
            title={hasActiveSearch ? 'TV Shows' : 'Trending TV Shows'}
            items={displayTVShows}
            type="tv"
            category="trending-tv"
            hideSeeMore={hasActiveSearch}
          />

          {!hasActiveSearch && (
            <>
              <ContentSection
                title="Popular TV Shows"
                items={popularTVShows}
                type="tv"
                category="popular-tv"
              />
              <ContentSection
                title="Top Rated TV Shows"
                items={topRatedTVShows}
                type="tv"
                category="top-rated-tv"
              />
            </>
          )}

          {/* NEW: People Search Results Block */}
          {hasActiveSearch && displayPeople.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight mb-4">People</h2>
              <div className="grid grid-cols-3 gap-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                {displayPeople.slice(0, 10).map((person) => (
                  <Link 
                    key={person.id} 
                    to={`/person/${person.id}`}
                    className="cursor-pointer group flex flex-col space-y-2"
                  >
                    <div className="overflow-hidden rounded-xl bg-muted aspect-[2/3] border shadow-sm relative">
                      {person.profile_path ? (
                        <img 
                          src={tmdbService.getImageUrl(person.profile_path, 'w500')} 
                          alt={person.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="px-1 text-center sm:text-left">
                      <p className="font-semibold text-xs truncate group-hover:text-primary transition-colors">
                        {person.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {person.known_for_department}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </main>
  );
}