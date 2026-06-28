import { useEffect, useState } from 'react';
import { LogOut, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MediaCard } from '@/components/MediaCard';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { tmdbService, type Movie, type TVShow } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';

export function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [tvShows, setTVShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ movies: Movie[], tv: TVShow[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      setLoading(true);
      setError('');
      const [moviesData, tvData] = await Promise.all([
        tmdbService.getTrendingMovies(),
        tmdbService.getTrendingTVShows(),
      ]);
      setMovies(moviesData);
      setTVShows(tvData);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setSearching(true);
      const [movieResults, tvResults] = await Promise.all([
        tmdbService.searchMovies(searchQuery),
        tmdbService.searchTVShows(searchQuery),
      ]);
      setSearchResults({
        movies: movieResults.results,
        tv: tvResults.results,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'Unable to perform search.',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tmdb_api_key');
    tmdbService.setApiKey('');
    navigate('/login');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const displayMovies = searchResults?.movies || movies;
  const displayTVShows = searchResults?.tv || tvShows;
  const isSearching = searchResults !== null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <a className="mr-6 flex items-center space-x-2" href="/">
              <span className="font-bold">TMDB</span>
            </a>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <form onSubmit={handleSearch} className="w-full flex-1 md:w-auto md:flex-none">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 md:w-[300px]"
                />
              </div>
            </form>
            <nav className="flex items-center space-x-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Logout</span>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSearching && (
          <div className="mb-6">
            <Button variant="outline" size="sm" onClick={clearSearch}>
              ← Back to trending
            </Button>
          </div>
        )}

        {loading || searching ? (
          <div className="space-y-8">
            <MediaGridSkeleton />
            <MediaGridSkeleton />
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold tracking-tight mb-4">
                {isSearching ? 'Movies' : 'Trending Movies'}
              </h2>
              {displayMovies.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                  {displayMovies.map((movie) => (
                    <MediaCard key={movie.id} item={movie} type="movie" />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No movies found.</p>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-semibold tracking-tight mb-4">
                {isSearching ? 'TV Shows' : 'Trending TV Shows'}
              </h2>
              {displayTVShows.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                  {displayTVShows.map((show) => (
                    <MediaCard key={show.id} item={show} type="tv" />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No TV shows found.</p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
