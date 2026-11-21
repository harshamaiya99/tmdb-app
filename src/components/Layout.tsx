// src/components/Layout.tsx
import { ReactNode, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { LogOut, Search, ArrowLeft, Settings2, Bookmark, Heart, Star, UserRound, ListPlus, Info, Film, Tv, Users } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Link, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TMDBImage } from '@/components/TMDBImage';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SearchSuggestions, SearchSuggestionsLoading } from '@/components/SearchSuggestions';
import { useToast } from '@/components/ui/use-toast';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { Footer } from '@/components/Footer';
import { useExperience } from '@/contexts/ExperienceContext';
import { ScreenroomLayout } from '@/components/ScreenroomLayout';
import { MidnightMatineeLayout } from '@/components/MidnightMatineeLayout';

interface LayoutProps {
  children: ReactNode;
}

const SEARCH_ORIGIN_STORAGE_KEY = 'tmdb_search_origin';

const mainNavigation = [
  { to: '/movie', label: 'Movies', icon: Film },
  { to: '/tv', label: 'TV Shows', icon: Tv },
  { to: '/person', label: 'People', icon: Users },
] as const;

export function Layout({ children }: LayoutProps) {
  const { experience } = useExperience();
  if (experience === 'screenroom') return <ScreenroomLayout>{children}</ScreenroomLayout>;
  if (experience === 'expressive') return <MidnightMatineeLayout>{children}</MidnightMatineeLayout>;
  return <StandardLayout>{children}</StandardLayout>;
}

function StandardLayout({ children }: LayoutProps) {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const { toast } = useToast();
  const {
    account,
    canConnectLists,
    connectTMDBAccount,
    disconnectTMDBAccount,
    isConnected: isTMDBAccountConnected,
    isListAccountConnected,
  } = useTMDBAccount();
  const location = useLocation();
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSearchWasOpenRef = useRef(false);
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
    setIsMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    setSuggestionsOpen(false);
    setIsMobileSearchOpen(false);

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
    if (event.key === 'Escape') {
      setSuggestionsOpen(false);
      setIsMobileSearchOpen(false);
    }
  };

  const closeSuggestions = () => setSuggestionsOpen(false);

  const showBackButton = location.pathname !== '/';

  const handleConnectTMDBAccount = () => {
    void connectTMDBAccount().catch((error: unknown) => {
      toast({
        title: 'Could not connect your TMDB account',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    });
  };

  const handleDisconnectTMDBAccount = () => {
    void disconnectTMDBAccount().then(() => {
      toast({ title: 'TMDB account disconnected' });
    }).catch((error: unknown) => {
      toast({
        title: 'Could not fully disconnect TMDB account',
        description: error instanceof Error
          ? error.message
          : 'TMDB could not revoke every account token.',
        variant: 'destructive',
      });
    });
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (isMobileSearchOpen) {
      mobileSearchWasOpenRef.current = true;
      mobileSearchInputRef.current?.focus();
    } else if (mobileSearchWasOpenRef.current) {
      mobileSearchWasOpenRef.current = false;
      mobileSearchButtonRef.current?.focus();
    }
  }, [isMobileSearchOpen]);

  const renderAccountMenu = (side: 'top' | 'bottom') => (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        side={side}
        sideOffset={8}
        collisionPadding={8}
        className="z-[60] max-h-[calc(100vh-2rem)] min-w-60 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      >
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
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
            <div className="min-w-0">
              {isTMDBAccountConnected ? (
                <DropdownMenu.Label className="block truncate text-sm font-medium text-foreground">
                  {account?.username}
                </DropdownMenu.Label>
              ) : (
                <DropdownMenu.Item
                  onSelect={handleConnectTMDBAccount}
                  className="flex min-h-10 cursor-pointer items-center truncate rounded-sm text-sm font-medium text-foreground outline-none hover:text-primary focus:text-primary"
                >
                  Login to TMDB
                </DropdownMenu.Item>
              )}
              {(isTMDBAccountConnected || isListAccountConnected) && (
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {isTMDBAccountConnected ? account?.name || 'Connected' : 'Custom lists connected'}
                </span>
              )}
            </div>
          </div>
          {isTMDBAccountConnected && canConnectLists && !isListAccountConnected && (
            <DropdownMenu.Item
              onSelect={handleConnectTMDBAccount}
              title="Finish TMDB account connection"
              className="flex min-h-9 shrink-0 cursor-pointer select-none items-center gap-1 rounded-md border border-input px-2 text-xs font-medium outline-none hover:bg-accent focus:bg-accent focus:text-accent-foreground"
            >
              <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
              Finish
            </DropdownMenu.Item>
          )}
          {(isTMDBAccountConnected || isListAccountConnected) && (
            <DropdownMenu.Item
              onSelect={handleDisconnectTMDBAccount}
              aria-label="Disconnect TMDB account"
              title="Disconnect TMDB account"
              className="flex h-9 w-9 shrink-0 cursor-pointer select-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
            </DropdownMenu.Item>
          )}
        </div>
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
        {!canConnectLists && isTMDBAccountConnected && !isListAccountConnected && (
          <DropdownMenu.Item
            disabled
            className="flex min-h-10 cursor-default select-none items-center gap-2 rounded-sm px-3 py-2 text-sm text-muted-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-70"
          >
            <ListPlus className="h-4 w-4" />
            Custom lists are not configured on this app
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Separator className="my-1 h-px bg-border" />
        <DropdownMenu.Label className="px-3 py-2 text-xs font-medium text-muted-foreground">
          System
        </DropdownMenu.Label>
        <DropdownMenu.Item asChild>
          <Link
            to="/settings"
            className="flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent focus:text-accent-foreground"
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </Link>
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
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );

  return (
    <div data-experience="cinema" className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2 md:h-14 md:flex-nowrap md:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
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
            <Link
              to="/"
              className={`flex min-w-0 items-center gap-2 ${isMobileSearchOpen ? 'hidden md:flex' : ''}`}
              aria-label="Studio home"
            >
              <span className="studio-brand">
                <span className="studio-brand-mark" aria-hidden="true"><Film className="h-4 w-4" /></span>
                <span>STUDIO</span>
              </span>
            </Link>
            {!isMobileSearchOpen && (
              <Button
                ref={mobileSearchButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open search"
                title="Search"
                onClick={() => setIsMobileSearchOpen(true)}
                className="ml-auto h-10 w-10 shrink-0 md:hidden"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
            {isMobileSearchOpen && (
              <form
                onSubmit={handleSearch}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setSuggestionsOpen(false);
                  }
                }}
                className="relative flex min-w-0 flex-1 items-center gap-1 md:hidden"
              >
                <div className="search-control relative flex h-10 min-w-0 flex-1 items-center overflow-hidden rounded-md border border-input bg-background">
                  <Input
                    ref={mobileSearchInputRef}
                    type="search"
                    role="combobox"
                    aria-label="Search movies, TV shows, and people"
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions}
                    aria-controls="mobile-search-suggestions"
                    placeholder="Search movies, shows & people"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onFocus={() => setSuggestionsOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    className="search-control-input h-full min-w-0 flex-1 border-0 bg-transparent pr-3 shadow-none focus-visible:ring-0"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    aria-label="Search"
                    title="Search"
                    className="search-control-button mr-[var(--border-inset)] h-8 w-8 shrink-0"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {showSuggestions && (suggestionQueryReady ? (
                  <SearchSuggestions
                    id="mobile-search-suggestions"
                    key={debouncedSearchQuery}
                    query={debouncedSearchQuery}
                    onSelect={closeSuggestions}
                  />
                ) : (
                  <SearchSuggestionsLoading id="mobile-search-suggestions" />
                ))}
              </form>
            )}
          </div>

          <div className="hidden md:ml-auto md:flex md:w-auto md:flex-row md:items-center md:gap-4">
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
              className="relative w-full md:w-52 lg:w-80"
            >
              <div className="search-control relative flex h-10 items-center overflow-hidden rounded-md border border-input bg-background">
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
                  className="search-control-input h-full min-w-0 flex-1 border-0 bg-transparent pr-3 shadow-none focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label="Search"
                  title="Search"
                  className="search-control-button mr-[var(--border-inset)] h-8 w-8 shrink-0"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {showSuggestions && (suggestionQueryReady ? (
                <SearchSuggestions
                  key={debouncedSearchQuery}
                  query={debouncedSearchQuery}
                  onSelect={closeSuggestions}
                />
              ) : (
                <SearchSuggestionsLoading />
              ))}
            </form>
          </div>

          <DropdownMenu.Root>
          <div className="ml-auto hidden shrink-0 items-center space-x-1 md:flex md:ml-0">
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
              {renderAccountMenu('bottom')}
          </div>
          </DropdownMenu.Root>
        </div>
      </header>
      <DropdownMenu.Root>
      <nav
        aria-label="Mobile main navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      >
        <div className="container grid min-h-16 grid-cols-4 items-center gap-1">
          {mainNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-accent ${
                  isActive ? 'bg-accent text-foreground' : 'text-muted-foreground'
                }`
              }
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
          <DropdownMenu.Trigger asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="Account and settings"
              title="Account and settings"
              className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
            >
              {account?.avatar?.tmdb?.avatar_path ? (
                <TMDBImage
                  path={account.avatar.tmdb.avatar_path}
                  alt=""
                  width={24}
                  height={24}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <UserRound aria-hidden="true" className="h-5 w-5" />
              )}
              <span>Account</span>
            </Button>
          </DropdownMenu.Trigger>
          {renderAccountMenu('top')}
        </div>
      </nav>
      </DropdownMenu.Root>
      <main className="container flex-1 py-6">{children}</main>
      <Footer />
    </div>
  );
}