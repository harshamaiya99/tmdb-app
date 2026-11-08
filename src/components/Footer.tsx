import { Link } from 'react-router-dom';

const footerLinkClassName = 'text-sm text-muted-foreground transition-colors hover:text-foreground';

export function Footer() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="container">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-8 sm:grid-cols-3 sm:gap-8 md:py-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 space-y-3 sm:col-span-3 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 font-semibold text-foreground">
              <img
                src={`${import.meta.env.BASE_URL}favicon.svg`}
                alt=""
                aria-hidden="true"
                className="h-7 w-7"
              />
              TMDB Explorer
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Discover movies, TV shows, and the people behind them.
            </p>
            <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="inline-flex rounded bg-white px-2 py-1">
              <img
                src={`${import.meta.env.BASE_URL}tmdb-logo.svg`}
                alt="TMDB"
                className="h-5 w-auto"
              />
            </a>
          </div>

          <nav aria-label="Explore" className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Explore</h2>
            <ul className="space-y-2">
              <li><Link to="/movie" className={footerLinkClassName}>Movies</Link></li>
              <li><Link to="/tv" className={footerLinkClassName}>TV shows</Link></li>
              <li><Link to="/person" className={footerLinkClassName}>People</Link></li>
            </ul>
          </nav>

          <nav aria-label="Application" className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Application</h2>
            <ul className="space-y-2">
              <li><Link to="/about" className={footerLinkClassName}>About</Link></li>
              <li><Link to="/settings" className={footerLinkClassName}>Settings</Link></li>
              <li>
                <a
                  href="https://github.com/harshamaiya99/tmdb-app"
                  target="_blank"
                  rel="noreferrer"
                  className={footerLinkClassName}
                >
                  GitHub
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="TMDB resources" className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">TMDB resources</h2>
            <ul className="space-y-2">
              <li>
                <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className={footerLinkClassName}>
                  TMDB website
                </a>
              </li>
              <li>
                <a
                  href="https://www.themoviedb.org/api-terms-of-use"
                  target="_blank"
                  rel="noreferrer"
                  className={footerLinkClassName}
                >
                  API terms of use
                </a>
              </li>
              <li>
                <a
                  href="https://www.themoviedb.org/about/logos-attribution"
                  target="_blank"
                  rel="noreferrer"
                  className={footerLinkClassName}
                >
                  Logo & attribution
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:pb-4">
          <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
          <p>Movie and TV data provided by TMDB.</p>
        </div>
      </div>
    </footer>
  );
}
