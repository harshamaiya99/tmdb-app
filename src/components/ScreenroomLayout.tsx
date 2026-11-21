import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bookmark, Film, Heart, Info, ListPlus, LogOut, Search, Settings2, Star, Tv, UserRound, Users } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TMDBImage } from '@/components/TMDBImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';
import { useToast } from '@/components/ui/use-toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SearchSuggestions, SearchSuggestionsLoading } from '@/components/SearchSuggestions';

const SEARCH_ORIGIN_STORAGE_KEY = 'tmdb_search_origin';

const mainNavigation = [
  { to: '/', label: 'Discover', icon: Film, end: true },
  { to: '/movie', label: 'Movies', icon: Film },
  { to: '/tv', label: 'Series', icon: Tv },
  { to: '/person', label: 'People', icon: Users },
] as const;

const accountNavigation = [
  { to: '/account/watchlist', label: 'Watchlist', icon: Bookmark },
  { to: '/account/favorites', label: 'Favorites', icon: Heart },
  { to: '/account/ratings', label: 'Ratings', icon: Star },
  { to: '/account/lists', label: 'My lists', icon: ListPlus },
] as const;

export function ScreenroomLayout({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('query') ?? '');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    account,
    canConnectLists,
    connectTMDBAccount,
    disconnectTMDBAccount,
    isConnected,
    isListAccountConnected,
  } = useTMDBAccount();
  const normalizedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(normalizedQuery, 120);
  const showSuggestions = suggestionsOpen && normalizedQuery.length >= 2;
  const suggestionQueryReady = normalizedQuery === debouncedQuery;

  useEffect(() => {
    setQuery(searchParams.get('query') ?? '');
  }, [searchParams]);

  useEffect(() => {
    setSuggestionsOpen(false);
  }, [location.pathname, location.search]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    setSuggestionsOpen(false);
    if (!trimmedQuery) {
      restoreSearchOrigin();
      return;
    }
    if (!searchParams.get('query')) {
      sessionStorage.setItem(SEARCH_ORIGIN_STORAGE_KEY, `${location.pathname}${location.search}` || '/');
    }
    navigate({ pathname: '/', search: `?query=${encodeURIComponent(trimmedQuery)}` });
  };

  const restoreSearchOrigin = () => {
    const origin = sessionStorage.getItem(SEARCH_ORIGIN_STORAGE_KEY) || '/';
    sessionStorage.removeItem(SEARCH_ORIGIN_STORAGE_KEY);
    navigate(origin);
  };

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setSuggestionsOpen(true);
    } else {
      setSuggestionsOpen(false);
      restoreSearchOrigin();
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') setSuggestionsOpen(false);
  };

  const closeSuggestions = () => setSuggestionsOpen(false);

  const handleConnect = () => {
    void connectTMDBAccount().catch((error: unknown) => {
      toast({
        title: 'Could not connect your TMDB account',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    });
  };

  const handleDisconnect = () => {
    void disconnectTMDBAccount().then(() => {
      toast({ title: 'TMDB account disconnected' });
    }).catch((error: unknown) => {
      toast({
        title: 'Could not fully disconnect TMDB account',
        description: error instanceof Error ? error.message : 'TMDB could not revoke every account token.',
        variant: 'destructive',
      });
    });
  };

  return (
    <div className="screenroom-shell flex min-h-screen flex-col bg-background">
      <header className="screenroom-header sticky top-0 z-50 border-b">
        <div className="screenroom-header-main container flex min-h-16 items-center gap-5 py-2">
          <Link to="/" className="screenroom-brand shrink-0" aria-label="Screenroom home">
            <span className="screenroom-brand-mark" aria-hidden="true"><Film className="h-5 w-5" /></span>
            <span>SCREENROOM</span>
          </Link>
          <nav aria-label="Main navigation" className="screenroom-navigation hidden items-center gap-1 lg:flex">
            {mainNavigation.map(({ to, label, icon: Icon, ...navLinkProps }) => (
              <NavLink
                key={to}
                to={to}
                {...navLinkProps}
                className={({ isActive }) => `screenroom-nav-link${isActive ? ' is-active' : ''}`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
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
            role="search"
            className="screenroom-search-form relative ml-auto min-w-0 flex-1"
          >
            <div className="screenroom-search-control flex h-10 items-center">
              <Search aria-hidden="true" className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                type="search"
                role="combobox"
                aria-label="Search movies, TV shows, and people"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="screenroom-search-suggestions"
                placeholder="Search the catalog"
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
                onFocus={() => setSuggestionsOpen(true)}
                onKeyDown={handleSearchKeyDown}
                className="h-full min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button type="submit" variant="ghost" size="icon" aria-label="Search" className="mr-1 h-8 w-8 shrink-0">
                <Search aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
            {showSuggestions && (suggestionQueryReady ? (
              <SearchSuggestions
                id="screenroom-search-suggestions"
                key={debouncedQuery}
                query={debouncedQuery}
                onSelect={closeSuggestions}
              />
            ) : (
              <SearchSuggestionsLoading id="screenroom-search-suggestions" />
            ))}
          </form>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button type="button" variant="outline" aria-label="Account menu" className="screenroom-account-trigger h-10 gap-2 px-2.5">
                  {account?.avatar?.tmdb?.avatar_path
                    ? <TMDBImage path={account.avatar.tmdb.avatar_path} alt="" width={32} height={32} className="h-7 w-7 rounded-full object-cover" />
                    : <UserRound aria-hidden="true" className="h-4 w-4" />}
                  <span className="hidden max-w-24 truncate sm:inline">{isConnected ? account?.username : 'Account'}</span>
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={8} collisionPadding={8} className="z-[60] max-h-[calc(100vh-2rem)] min-w-56 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-md">
                  {isConnected ? (
                    <>
                      <DropdownMenu.Label className="px-3 py-2 text-sm font-semibold">{account?.username}</DropdownMenu.Label>
                      {accountNavigation.map(({ to, label, icon: Icon }) => (
                        <DropdownMenu.Item key={to} asChild>
                          <Link to={to} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                            <Icon className="h-4 w-4" /> {label}
                          </Link>
                        </DropdownMenu.Item>
                      ))}
                      {canConnectLists && !isListAccountConnected && (
                        <DropdownMenu.Item onSelect={handleConnect} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                          <ListPlus className="h-4 w-4" /> Connect custom lists
                        </DropdownMenu.Item>
                      )}
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      <DropdownMenu.Item onSelect={handleDisconnect} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                        <LogOut className="h-4 w-4" /> Disconnect account
                      </DropdownMenu.Item>
                    </>
                  ) : (
                    <DropdownMenu.Item onSelect={handleConnect} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                      <UserRound className="h-4 w-4" /> Connect TMDB account
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item asChild>
                    <Link to="/settings" className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                      <Settings2 className="h-4 w-4" /> Settings
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link to="/about" className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                      <Info className="h-4 w-4" /> About
                    </Link>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
        <nav aria-label="Mobile main navigation" className="screenroom-mobile-navigation container flex gap-2 overflow-x-auto pb-2 lg:hidden">
          {mainNavigation.map(({ to, label, icon: Icon, ...navLinkProps }) => (
            <NavLink
              key={to}
              to={to}
              {...navLinkProps}
              className={({ isActive }) => `screenroom-mobile-link${isActive ? ' is-active' : ''}`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="screenroom-content container min-w-0 flex-1 py-6 sm:py-8">{children}</main>
      <Footer />
    </div>
  );
}
