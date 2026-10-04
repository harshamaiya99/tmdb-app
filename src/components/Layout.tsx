// src/components/Layout.tsx
import { ReactNode, useEffect, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { LogOut, Search, Clapperboard, ArrowLeft } from 'lucide-react';
import { Link, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTitle } from '@/contexts/TitleContext';
import { tmdbService } from '@/lib/tmdb';
import { TMDBImage } from '@/components/TMDBImage';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface LayoutProps {
  children: ReactNode;
}

const SEARCH_ORIGIN_STORAGE_KEY = 'tmdb_search_origin';

function SearchSuggestions({ query, onSelect }: { query: string; onSelect: () => void }) {
  const suggestions = useCachedQuery(
    `search:suggestions:${query}:1`,
    (signal) => tmdbService.searchMulti(query, 1, { signal }),
  );

  const results = suggestions.data?.results.slice(0, 6) ?? [];

  return (
    <div
      id="search-suggestions"
      role="listbox"
      aria-label="Search suggestions"
      className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {suggestions.loading ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
      ) : suggestions.error ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">Suggestions unavailable. Press Enter to search.</p>
      ) : results.length ? (
        results.map((item) => {
          const title = item.media_type === 'movie' ? item.title : item.name;
          const imagePath = item.media_type === 'person' ? item.profile_path : item.poster_path;
          const date = item.media_type === 'movie' ? item.release_date : item.media_type === 'tv' ? item.first_air_date : '';
          const year = date ? new Date(date).getFullYear() : null;
          const subtitle = item.media_type === 'person'
            ? item.known_for_department || 'Person'
            : `${item.media_type === 'tv' ? 'TV show' : 'Movie'}${year && !Number.isNaN(year) ? ` · ${year}` : ''}`;

          return (
            <Link
              key={`${item.media_type}:${item.id}`}
              to={`/${item.media_type}/${item.id}`}
              role="option"
              aria-label={`${title}, ${subtitle}`}
              onClick={onSelect}
              className="flex items-center gap-3 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
            >
              <div className="flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-[10px] text-muted-foreground">
                <TMDBImage
                  path={imagePath}
                  alt=""
                  width={45}
                  height={68}
                  sizes="36px"
                  className="h-full w-full object-cover"
                />
                {!imagePath && <span aria-hidden="true">N/A</span>}
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{title}</span>
                <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
              </span>
            </Link>
          );
        })
      ) : (
        <p className="px-3 py-2 text-sm text-muted-foreground">No suggestions found. Press Enter to search.</p>
      )}
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const { title } = useTitle();
  const location = useLocation();
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), 120);
  const normalizedSearchQuery = searchQuery.trim();
  const showSuggestions = suggestionsOpen
    && normalizedSearchQuery.length >= 2;
  const suggestionQueryReady = normalizedSearchQuery === debouncedSearchQuery;

  const getSearchOrigin = () => {
    const storedOrigin = sessionStorage.getItem(SEARCH_ORIGIN_STORAGE_KEY);
    return storedOrigin || '/';
  };

  const restoreSearchOrigin = () => {
    const origin = getSearchOrigin();
    sessionStorage.removeItem(SEARCH_ORIGIN_STORAGE_KEY);
    navigate(origin);
  };

  useEffect(() => {
    setSearchQuery(searchParams.get('query') ?? '');
  }, [searchParams]);

  useEffect(() => {
    setSuggestionsOpen(false);
  }, [location.pathname, location.search]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    setSuggestionsOpen(false);

    if (!trimmedQuery) {
      restoreSearchOrigin();
      return;
    }

    if (!searchParams.get('query')) {
      sessionStorage.setItem(
        SEARCH_ORIGIN_STORAGE_KEY,
        `${location.pathname}${location.search}` || '/',
      );
    }
    navigate({ pathname: '/', search: `?query=${encodeURIComponent(trimmedQuery)}` });
  };

  const handleSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setSearchQuery(nextValue);

    if (!nextValue.trim()) {
      setSuggestionsOpen(false);
      restoreSearchOrigin();
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') setSuggestionsOpen(false);
  };

  const closeSuggestions = () => setSuggestionsOpen(false);

  const showBackButton = location.pathname !== '/';

  const handleLogout = () => {
    localStorage.removeItem('tmdb_api_key');
    tmdbService.setApiKey('');
    navigate('/login');
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="mr-2"
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Link to="/" className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5" />
              <span className="font-bold">{title}</span>
            </Link>
          </div>

          <div className="ml-auto flex flex-1 items-center justify-end gap-2 md:gap-4">
            
            {/* NEW: Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium mr-2">
              <NavLink 
                to="/movie" 
                className={({ isActive }) => 
                  `transition-colors hover:text-foreground ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'}`
                }
              >
                Movies
              </NavLink>
              <NavLink 
                to="/tv" 
                className={({ isActive }) => 
                  `transition-colors hover:text-foreground ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'}`
                }
              >
                TV Shows
              </NavLink>
              <NavLink 
                to="/person" 
                className={({ isActive }) => 
                  `transition-colors hover:text-foreground ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'}`
                }
              >
                People
              </NavLink>
            </nav>

            <form
              onSubmit={handleSearch}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setSuggestionsOpen(false);
                }
              }}
              className="w-full max-w-[16rem] sm:max-w-[20rem]"
            >
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  role="combobox"
                  aria-label="Search movies, TV shows, and people"
                  aria-autocomplete="list"
                  aria-expanded={showSuggestions}
                  aria-controls="search-suggestions"
                  placeholder="Search movies, shows & people"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onFocus={() => setSuggestionsOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-8 pr-10"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label="Search"
                  title="Search"
                  className="absolute right-0 top-0 h-9 w-9"
                >
                  <Search className="h-4 w-4" />
                </Button>
                {showSuggestions && (suggestionQueryReady ? (
                  <SearchSuggestions
                    key={debouncedSearchQuery}
                    query={debouncedSearchQuery}
                    onSelect={closeSuggestions}
                  />
                ) : (
                  <div
                    id="search-suggestions"
                    role="listbox"
                    aria-label="Search suggestions"
                    className="absolute left-0 right-0 top-full z-50 mt-2 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                  >
                    <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
                  </div>
                ))}
              </div>
            </form>

            <nav className="flex items-center space-x-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}