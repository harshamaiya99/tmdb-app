// src/components/Layout.tsx
import { ReactNode, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { LogOut, Search, ArrowLeft, Settings2, X, Moon, Sun, Bookmark, Heart, Star, UserRound, ListPlus, Info, Plus, Trash2, Upload, Download } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Link, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/useTheme';
import { useTitle } from '@/contexts/TitleContext';
import { tmdbService } from '@/lib/tmdb';
import { TMDBImage } from '@/components/TMDBImage';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useEmbedSettings, type EmbedLink } from '@/contexts/EmbedSettingsContext';
import { getEmbedLinkName } from '@/lib/utils';
import {
  createEmbedSettingsFile,
  isValidEmbedUrlTemplate,
  parseEmbedSettingsFile,
} from '@/lib/embedSettings';
import { useToast } from '@/components/ui/use-toast';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';

interface LayoutProps {
  children: ReactNode;
}

const SEARCH_ORIGIN_STORAGE_KEY = 'tmdb_search_origin';

const mainNavigation = [
  { to: '/movie', label: 'Movies' },
  { to: '/tv', label: 'TV Shows' },
  { to: '/person', label: 'People' },
] as const;

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
  const { theme, toggleTheme } = useTheme();
  const {
    account,
    canConnectLists,
    connectAccount,
    connectListsAccount,
    disconnectAccount,
    disconnectListsAccount,
    isConnected: isTMDBAccountConnected,
    isListAccountConnected,
  } = useTMDBAccount();
  const { movieLinks, tvLinks, saveSettings, resetSettings } = useEmbedSettings();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [movieLinkInputs, setMovieLinkInputs] = useState<EmbedLink[]>(movieLinks.length ? movieLinks : [{ name: '', urlTemplate: '' }]);
  const [tvLinkInputs, setTvLinkInputs] = useState<EmbedLink[]>(tvLinks.length ? tvLinks : [{ name: '', urlTemplate: '' }]);
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
    localStorage.removeItem('tmdb_v4_access_token');
    tmdbService.setApiKey('');
    tmdbService.setAccessToken('');
    navigate('/login');
  };

  const handleConnectAccount = () => {
    void connectAccount().catch((error: unknown) => {
      toast({
        title: 'Could not start TMDB account connection',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    });
  };

  const handleDisconnectAccount = () => {
    void disconnectAccount().then(() => {
      toast({ title: 'TMDB account disconnected' });
    }).catch((error: unknown) => {
      toast({
        title: 'TMDB account disconnected locally',
        description: error instanceof Error
          ? `TMDB could not revoke the session remotely: ${error.message}`
          : 'TMDB could not revoke the session remotely.',
        variant: 'destructive',
      });
    });
  };

  const handleConnectListsAccount = () => {
    void connectListsAccount().catch((error: unknown) => {
      toast({
        title: 'Could not start TMDB lists authorization',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    });
  };

  const handleDisconnectListsAccount = () => {
    void disconnectListsAccount().then(() => {
      toast({ title: 'TMDB custom lists disconnected' });
    }).catch((error: unknown) => {
      toast({
        title: 'TMDB custom lists disconnected locally',
        description: error instanceof Error
          ? `Could not revoke access remotely: ${error.message}`
          : 'Could not revoke access remotely.',
        variant: 'destructive',
      });
    });
  };

  const openEmbedSettings = () => {
    setMovieLinkInputs(movieLinks.length ? movieLinks : [{ name: '', urlTemplate: '' }]);
    setTvLinkInputs(tvLinks.length ? tvLinks : [{ name: '', urlTemplate: '' }]);
    setSettingsError('');
    setSettingsOpen(true);
  };

  const updateEmbedLink = (
    mediaType: 'movie' | 'tv',
    index: number,
    value: string,
  ) => {
    const update = (links: EmbedLink[]) => links.map((link, linkIndex) => (
      linkIndex === index ? { ...link, name: getEmbedLinkName(value), urlTemplate: value } : link
    ));
    if (mediaType === 'movie') {
      setMovieLinkInputs(update);
    } else {
      setTvLinkInputs(update);
    }
  };

  const addEmbedLink = (mediaType: 'movie' | 'tv') => {
    const add = (links: EmbedLink[]) => [
      ...links,
      { name: '', urlTemplate: '' },
    ];
    if (mediaType === 'movie') {
      setMovieLinkInputs(add);
    } else {
      setTvLinkInputs(add);
    }
  };

  const removeEmbedLink = (mediaType: 'movie' | 'tv', index: number) => {
    const remove = (links: EmbedLink[]) => {
      const remaining = links.filter((_, linkIndex) => linkIndex !== index);
      return remaining.length ? remaining : [{ name: '', urlTemplate: '' }];
    };
    if (mediaType === 'movie') {
      setMovieLinkInputs(remove);
    } else {
      setTvLinkInputs(remove);
    }
  };

  const handleEmbedSettingsImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const importedSettings = parseEmbedSettingsFile(await file.text());
      setMovieLinkInputs(importedSettings.movieLinks.length ? importedSettings.movieLinks : [{ name: '', urlTemplate: '' }]);
      setTvLinkInputs(importedSettings.tvLinks.length ? importedSettings.tvLinks : [{ name: '', urlTemplate: '' }]);
      setSettingsError('');
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Could not read the selected settings file.');
    }
  };

  const handleEmbedSettingsExport = () => {
    setSettingsError('');
    try {
      const file = new Blob(
        [createEmbedSettingsFile(movieLinkInputs, tvLinkInputs)],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(file);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'tmdb-embed-settings.json';
      downloadLink.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Could not export embed settings.');
    }
  };

  const handleEmbedSettingsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSettingsError('');

    const movieLinksToSave = movieLinkInputs
      .filter((link) => link.urlTemplate.trim())
      .map((link) => ({
        name: getEmbedLinkName(link.urlTemplate.trim()),
        urlTemplate: link.urlTemplate.trim(),
      }));
    const tvLinksToSave = tvLinkInputs
      .filter((link) => link.urlTemplate.trim())
      .map((link) => ({
        name: getEmbedLinkName(link.urlTemplate.trim()),
        urlTemplate: link.urlTemplate.trim(),
      }));
    const hasInvalidLinks = [...movieLinksToSave, ...tvLinksToSave]
      .some((link) => !isValidEmbedUrlTemplate(link.urlTemplate));

    if (hasInvalidLinks) {
      setSettingsError('Enter a valid http or https URL template for each link.');
      return;
    }

    try {
      saveSettings({
        movieLinks: movieLinksToSave,
        tvLinks: tvLinksToSave,
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
              {!showBackButton && (
                <img
                  src={`${import.meta.env.BASE_URL}favicon.svg`}
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7 shrink-0"
                />
              )}
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
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Profile"
                  title="Profile"
                  className="h-10 w-10"
                >
                  {account?.avatar?.tmdb?.avatar_path ? (
                    <TMDBImage
                      path={account.avatar.tmdb.avatar_path}
                      alt=""
                      width={40}
                      height={40}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-[1.2rem] w-[1.2rem]" />
                  )}
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-[60] max-h-[calc(100vh-2rem)] min-w-60 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                >
                  <DropdownMenu.Label className="flex items-center gap-3 px-3 py-3">
                    {account?.avatar?.tmdb?.avatar_path ? (
                      <TMDBImage
                        path={account.avatar.tmdb.avatar_path}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <UserRound className="h-5 w-5 text-muted-foreground" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {isTMDBAccountConnected ? account?.username : 'TMDB account'}
                      </span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {isTMDBAccountConnected ? account?.name || 'Connected' : 'Not connected'}
                      </span>
                    </span>
                  </DropdownMenu.Label>
                  {[
                    { to: '/account/watchlist', label: 'Watchlist', icon: Bookmark },
                    { to: '/account/favorites', label: 'Favorites', icon: Heart },
                    { to: '/account/ratings', label: 'Ratings', icon: Star },
                    { to: '/account/lists', label: 'Custom lists', icon: ListPlus },
                  ].map(({ to, label, icon: Icon }) => (
                    <DropdownMenu.Item key={to} asChild>
                      <Link
                        to={to}
                        className="flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Item
                    onSelect={isTMDBAccountConnected ? handleDisconnectAccount : handleConnectAccount}
                    className="flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                  >
                    <UserRound className="h-4 w-4" />
                    {isTMDBAccountConnected ? 'Disconnect TMDB account' : 'Connect TMDB account'}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    disabled={!isListAccountConnected && !canConnectLists}
                    onSelect={isListAccountConnected ? handleDisconnectListsAccount : handleConnectListsAccount}
                    className="flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <ListPlus className="h-4 w-4" />
                    {isListAccountConnected ? 'Disconnect custom lists' : canConnectLists ? 'Connect custom lists' : 'Configure v4 token for lists'}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Label className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    System
                  </DropdownMenu.Label>
                  <DropdownMenu.Item
                    onSelect={openEmbedSettings}
                    className="flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                  >
                    <Settings2 className="h-4 w-4" />
                    Embed link settings
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={toggleTheme}
                    className="flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    Switch to {theme === 'dark' ? 'light' : 'dark'} theme
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link
                      to="/about"
                      className="flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                    >
                      <Info className="h-4 w-4" />
                      About
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    onSelect={handleLogout}
                    className="flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-accent focus:bg-accent focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
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
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border bg-background p-5 shadow-lg sm:p-6"
          >
            <div className="mb-5 flex shrink-0 items-start justify-between gap-4">
              <div>
                <h2 id="embed-settings-title" className="text-lg font-semibold">Embed link settings</h2>
                <p id="embed-settings-description" className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Add movie and TV URLs. Each domain is used as the link name.
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

            <form onSubmit={handleEmbedSettingsSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-5">
              <input
                ref={importFileInputRef}
                type="file"
                accept="application/json,.json"
                aria-label="Import embed settings JSON"
                className="hidden"
                onChange={(event) => void handleEmbedSettingsImport(event)}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => importFileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Import JSON
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleEmbedSettingsExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export JSON
                </Button>
              </div>
              {([
                { mediaType: 'movie' as const, label: 'Movie', links: movieLinkInputs, placeholder: 'https://example.com/movie/{TMDB_ID}/{IMDB_ID}' },
                { mediaType: 'tv' as const, label: 'TV', links: tvLinkInputs, placeholder: 'https://example.com/tv/{TMDB_ID}/{SEASON}/{EPISODE}' },
              ]).map(({ mediaType, label, links, placeholder }) => (
                <section key={mediaType} className="space-y-3">
                  <h3 className="text-sm font-semibold">{label} links</h3>
                  {links.map((link, index) => (
                    <div key={`${mediaType}-link-${index}`} className="flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5">
                      <h4 className="w-20 shrink-0 truncate text-xs font-medium sm:w-24">
                          {getEmbedLinkName(link.urlTemplate) || `Link ${index + 1}`}
                      </h4>
                      <Input
                        id={`${mediaType}-embed-template-${index}`}
                        aria-label={`${label} link URL template ${index + 1}`}
                        value={link.urlTemplate}
                        onChange={(event) => updateEmbedLink(mediaType, index, event.target.value)}
                        placeholder={placeholder}
                        autoComplete="url"
                        className="h-8 min-w-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmbedLink(mediaType, index)}
                        aria-label={`Remove ${label.toLowerCase()} link ${index + 1}`}
                        className="h-8 w-8 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addEmbedLink(mediaType)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add {label.toLowerCase()} link
                  </Button>
                </section>
              ))}
              <div className="rounded-md bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                Use {'{TMDB_ID}'} and {'{IMDB_ID}'} for movies. TV links also support {'{SEASON}'} and {'{EPISODE}'}. Removing all links disables that watch button; reset restores any build-time defaults.
              </div>
              {settingsError && (
                <p role="alert" className="text-sm text-destructive">{settingsError}</p>
              )}
              </div>
              <div className="flex shrink-0 flex-col gap-3 border-t bg-background pt-4 sm:flex-row sm:items-center sm:justify-between">
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