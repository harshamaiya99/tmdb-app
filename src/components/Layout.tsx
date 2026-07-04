// src/components/Layout.tsx
import { ReactNode, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { LogOut, Search, Clapperboard } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { tmdbService } from '@/lib/tmdb';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export function Layout({ children, title }: LayoutProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSearchQuery(searchParams.get('query') ?? '');
  }, [searchParams]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchParams({});
      navigate('/');
      return;
    }

    navigate({ pathname: '/', search: `?query=${encodeURIComponent(trimmedQuery)}` });
  };

  const handleSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setSearchQuery(nextValue);

    if (!nextValue.trim()) {
      setSearchParams({});
      navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tmdb_api_key');
    tmdbService.setApiKey('');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5" />
              <span className="font-bold">{title}</span>
            </Link>
          </div>

          <div className="ml-auto flex flex-1 items-center justify-end gap-2">
            <form onSubmit={handleSearch} className="w-full max-w-[16rem] sm:max-w-[20rem]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search movies & shows"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  className="pl-8"
                />
              </div>
            </form>

            <nav className="flex items-center space-x-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={handleLogout}>
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