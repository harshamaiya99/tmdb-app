import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Bookmark, Film, Heart, Info, ListPlus, LogOut, PanelLeftClose, PanelLeftOpen,
  Search, Settings2, Star, Theater, Tv, UserRound, Users,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TMDBImage } from '@/components/TMDBImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useTMDBAccount } from '@/contexts/TMDBAccountContext';

const SEARCH_ORIGIN_STORAGE_KEY = 'tmdb_search_origin';

const browseNavigation = [
  { to: '/', label: 'Discover', icon: Film, end: true },
  { to: '/movie', label: 'Movies', icon: Film },
  { to: '/tv', label: 'TV Shows', icon: Tv },
  { to: '/person', label: 'People', icon: Users },
] as const;

const libraryNavigation = [
  { to: '/account/watchlist', label: 'Watchlist', icon: Bookmark },
  { to: '/account/favorites', label: 'Favorites', icon: Heart },
  { to: '/account/ratings', label: 'Ratings', icon: Star },
  { to: '/account/lists', label: 'My lists', icon: ListPlus },
] as const;

export function MidnightMatineeLayout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('query') ?? '');
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
  const visibleLibraryNavigation = libraryNavigation.filter(({ to }) => (
    to === '/account/lists' ? isListAccountConnected : isConnected
  ));

  useEffect(() => {
    setQuery(searchParams.get('query') ?? '');
  }, [searchParams]);

  const restoreSearchOrigin = () => {
    const origin = sessionStorage.getItem(SEARCH_ORIGIN_STORAGE_KEY) || '/';
    sessionStorage.removeItem(SEARCH_ORIGIN_STORAGE_KEY);
    navigate(origin);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      restoreSearchOrigin();
      return;
    }
    if (!searchParams.get('query')) {
      sessionStorage.setItem(SEARCH_ORIGIN_STORAGE_KEY, `${location.pathname}${location.search}` || '/');
    }
    navigate({ pathname: '/', search: `?query=${encodeURIComponent(trimmedQuery)}` });
  };

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (!value.trim() && searchParams.get('query')) restoreSearchOrigin();
  };

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
    <div
      data-experience="expressive"
      className={`matinee-shell flex min-h-screen bg-background${sidebarCollapsed ? ' matinee-sidebar-collapsed' : ''}`}
    >
      <aside className="matinee-sidebar hidden md:flex">
        <div className="matinee-sidebar-brand-row">
          <Link to="/" className="matinee-sidebar-brand" aria-label="Midnight Matinee home">
          <span className="matinee-brand-mark" aria-hidden="true"><Theater className="h-5 w-5" /></span>
          <span><strong>MIDNIGHT</strong><small>MATINEE</small></span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            className="matinee-sidebar-toggle h-9 w-9 shrink-0"
          >
            {sidebarCollapsed
              ? <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
              : <PanelLeftClose aria-hidden="true" className="h-4 w-4" />}
          </Button>
        </div>
        <nav aria-label="Browse" className="matinee-sidebar-nav">
          <p className="matinee-sidebar-label">BROWSE</p>
          {browseNavigation.map(({ to, label, icon: Icon, ...navProps }) => (
            <NavLink
              key={to}
              to={to}
              {...navProps}
              aria-label={label}
              title={label}
              className={({ isActive }) => `matinee-sidebar-link${isActive ? ' is-active' : ''}`}
            >
              <Icon aria-hidden="true" className="h-[1.1rem] w-[1.1rem]" />
              <span className="matinee-sidebar-link-label">{label}</span>
            </NavLink>
          ))}
          {visibleLibraryNavigation.length > 0 && (
            <>
              <p className="matinee-sidebar-label matinee-library-label">YOUR LIBRARY</p>
              {visibleLibraryNavigation.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  aria-label={label}
                  title={label}
                  className={({ isActive }) => `matinee-sidebar-link${isActive ? ' is-active' : ''}`}
                >
                  <Icon aria-hidden="true" className="h-[1.1rem] w-[1.1rem]" />
                  <span className="matinee-sidebar-link-label">{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="matinee-sidebar-bottom">
          <Link to="/settings" aria-label="Settings" title="Settings" className="matinee-sidebar-link"><Settings2 aria-hidden="true" className="h-[1.1rem] w-[1.1rem]" /><span className="matinee-sidebar-link-label">Settings</span></Link>
          <Link to="/about" aria-label="About" title="About" className="matinee-sidebar-link"><Info aria-hidden="true" className="h-[1.1rem] w-[1.1rem]" /><span className="matinee-sidebar-link-label">About</span></Link>
          <p>AN ORIGINAL WATCH TOWER EXPERIENCE</p>
        </div>
      </aside>

      <div className="matinee-main-column flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="matinee-topbar sticky top-0 z-40">
          <div className="matinee-topbar-inner">
            <Link to="/" className="matinee-mobile-brand md:hidden" aria-label="Midnight Matinee home">
              <span className="matinee-brand-mark" aria-hidden="true"><Theater className="h-4 w-4" /></span>
              <span>MIDNIGHT MATINEE</span>
            </Link>
            <form onSubmit={handleSearch} role="search" className="matinee-search-form">
              <Search aria-hidden="true" className="matinee-search-icon" />
              <Input
                type="search"
                aria-label="Search movies, TV shows, and people"
                placeholder="Search the collection"
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="matinee-search-input"
              />
              <Button type="submit" variant="ghost" size="icon" aria-label="Search" className="matinee-search-submit">
                <Search aria-hidden="true" className="h-4 w-4" />
              </Button>
            </form>
            <div className="matinee-topbar-actions">
              <ThemeToggle />
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button type="button" variant="outline" aria-label="Account menu" className="matinee-account-trigger">
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
                        {libraryNavigation.map(({ to, label, icon: Icon }) => (
                          <DropdownMenu.Item key={to} asChild>
                            <Link to={to} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                              <Icon aria-hidden="true" className="h-4 w-4" />{label}
                            </Link>
                          </DropdownMenu.Item>
                        ))}
                        {canConnectLists && !isListAccountConnected && (
                          <DropdownMenu.Item onSelect={handleConnect} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                            <ListPlus aria-hidden="true" className="h-4 w-4" />Connect custom lists
                          </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        <DropdownMenu.Item onSelect={handleDisconnect} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                          <LogOut aria-hidden="true" className="h-4 w-4" />Disconnect account
                        </DropdownMenu.Item>
                      </>
                    ) : (
                      <DropdownMenu.Item onSelect={handleConnect} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                        <UserRound aria-hidden="true" className="h-4 w-4" />Connect TMDB account
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <DropdownMenu.Item asChild>
                      <Link to="/settings" className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                        <Settings2 aria-hidden="true" className="h-4 w-4" />Settings
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link to="/about" className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent">
                        <Info aria-hidden="true" className="h-4 w-4" />About
                      </Link>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
        </header>
        <main className="matinee-content container min-w-0 flex-1 py-6 sm:py-8">{children}</main>
        <Footer />
      </div>

      <nav aria-label="Mobile main navigation" className="matinee-mobile-navigation md:hidden">
        {browseNavigation.map(({ to, label, icon: Icon, ...navProps }) => (
          <NavLink
            key={to}
            to={to}
            {...navProps}
            className={({ isActive }) => `matinee-mobile-link${isActive ? ' is-active' : ''}`}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
            <span>{label === 'Discover' ? 'Home' : label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
