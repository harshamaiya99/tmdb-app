// src/components/Layout.tsx
import { ReactNode, useEffect, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { LogOut, Search, ArrowLeft, Settings2, X } from 'lucide-react';
import { Link, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTitle } from '@/contexts/TitleContext';
import { tmdbService } from '@/lib/tmdb';
import { TMDBImage } from '@/components/TMDBImage';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useEmbedSettings } from '@/contexts/EmbedSettingsContext';
import { useToast } from '@/components/ui/use-toast';

interface LayoutProps {
  children: ReactNode;
}

const SEARCH_ORIGIN_STORAGE_KEY = 'tmdb_search_origin';

const mainNavigation = [
  { to: '/movie', label: 'Movies' },
  { to: '/tv', label: 'TV Shows' },
  { to: '/person', label: 'People' },
] as const;

function isValidEmbedUrlTemplate(template: string) {
  if (!template.trim()) return true;

  try {
    const url = new URL(template.trim().replace(/\{(TMDB_ID|IMDB_ID|SEASON|EPISODE)\}/g, '1'));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

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
  const { toast } = useToast();
  const { movieUrlTemplate, tvUrlTemplate, saveSettings, resetSettings } = useEmbedSettings();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [movieTemplateInput, setMovieTemplateInput] = useState(movieUrlTemplate);
  const [tvTemplateInput, setTvTemplateInput] = useState(tvUrlTemplate);
  const [settingsError, setSettingsError] = useState('');
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

  const openEmbedSettings = () => {
    setMovieTemplateInput(movieUrlTemplate);
    setTvTemplateInput(tvUrlTemplate);
    setSettingsError('');
    setSettingsOpen(true);
  };

  const handleEmbedSettingsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSettingsError('');

    if (!isValidEmbedUrlTemplate(movieTemplateInput) || !isValidEmbedUrlTemplate(tvTemplateInput)) {
      setSettingsError('Enter a valid http or https URL template, or leave the field blank.');
      return;
    }

    try {
      saveSettings({
        movieUrlTemplate: movieTemplateInput,
        tvUrlTemplate: tvTemplateInput,
      });
      setSettingsOpen(false);
      toast({
        title: 'Settings saved',
        description: 'Your embed URL settings have been saved in this browser.',
      });
    } catch {
      setSettingsError('Could not save settings in this browser. Check that site storage is available and try again.');
    }
  };

  const handleResetEmbedSettings = () => {
    setSettingsError('');
    try {
      resetSettings();
      setMovieTemplateInput(import.meta.env.VITE_MOVIE_EMBED_URL ?? '');
      setTvTemplateInput(import.meta.env.VITE_TV_EMBED_URL ?? '');
      setSettingsOpen(false);
      toast({
        title: 'Settings reset',
        description: 'Embed URL settings are now using the build-time defaults.',
      });
    } catch {
      setSettingsError('Could not clear saved settings in this browser. Check that site storage is available and try again.');
    }
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
        <div className="container flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2 md:h-14 md:flex-nowrap md:py-0">
          <div className="flex min-w-0 items-center gap-2">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="mr-1 h-10 w-10 shrink-0 md:mr-2"
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Link to="/" className="flex min-w-0 items-center gap-2">
              <img
                src={`${import.meta.env.BASE_URL}favicon.svg`}
                alt=""
                aria-hidden="true"
                className="h-7 w-7 shrink-0"
              />
              <span
                className={`min-w-0 truncate font-bold ${
                  showBackButton ? 'max-w-[calc(100vw-16rem)]' : 'max-w-[calc(100vw-13.5rem)]'
                } md:max-w-none`}
              >
                {title}
              </span>
            </Link>
          </div>

          <div className="order-1 flex w-full flex-col gap-3 md:order-none md:ml-auto md:w-auto md:flex-row md:items-center md:gap-4">
            <nav className="hidden items-center gap-4 text-sm font-medium md:flex lg:gap-6">
              {mainNavigation.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `transition-colors hover:text-foreground ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            <form
              onSubmit={handleSearch}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setSuggestionsOpen(false);
                }
              }}
              className="w-full md:w-52 lg:w-80"
            >
              <div className="relative">
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
                  className="h-10 pr-10"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label="Search"
                  title="Search"
                  className="absolute right-0 top-0 h-10 w-10"
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
          </div>

          <div className="ml-auto flex shrink-0 items-center space-x-1 md:ml-0">
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={openEmbedSettings}
                aria-label="Embed link settings"
                title="Embed link settings"
                className="h-10 w-10"
              >
                <Settings2 className="h-[1.2rem] w-[1.2rem]" />
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
                className="h-10 w-10"
              >
                <LogOut className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </div>
          </div>
          <nav aria-label="Main navigation" className="order-2 flex w-full items-center gap-2 pb-2 md:hidden">
            {mainNavigation.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex min-h-10 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent ${
                    isActive ? 'bg-accent text-foreground' : 'text-muted-foreground'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="container py-6">{children}</main>
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="embed-settings-title"
            aria-describedby="embed-settings-description"
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-5 shadow-lg sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="embed-settings-title" className="text-lg font-semibold">Embed link settings</h2>
                <p id="embed-settings-description" className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Customize movie and TV watch links for this browser.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close embed settings"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleEmbedSettingsSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="movie-embed-template" className="text-sm font-medium">Movie URL template</label>
                <Input
                  id="movie-embed-template"
                  value={movieTemplateInput}
                  onChange={(event) => setMovieTemplateInput(event.target.value)}
                  placeholder="https://example.com/movie/{TMDB_ID}/{IMDB_ID}"
                  autoComplete="url"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="tv-embed-template" className="text-sm font-medium">TV URL template</label>
                <Input
                  id="tv-embed-template"
                  value={tvTemplateInput}
                  onChange={(event) => setTvTemplateInput(event.target.value)}
                  placeholder="https://example.com/tv/{TMDB_ID}/{SEASON}/{EPISODE}"
                  autoComplete="url"
                />
              </div>
              <div className="rounded-md bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                Leave a field blank to use its default. Placeholders: {'{TMDB_ID}'}, {'{IMDB_ID}'}, {'{SEASON}'}, {'{EPISODE}'}.
              </div>
              {settingsError && (
                <p role="alert" className="text-sm text-destructive">{settingsError}</p>
              )}
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetEmbedSettings}
                  className="self-start px-2 text-muted-foreground"
                >
                  Reset defaults
                </Button>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save settings</Button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}