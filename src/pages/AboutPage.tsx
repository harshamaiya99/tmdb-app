import { usePageTitle } from '@/hooks/usePageTitle';

export function AboutPage() {
  usePageTitle('About');

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">About</h1>
        <p className="text-muted-foreground">
          TMDB Browser helps you explore movies, TV shows, and people.
        </p>
      </header>

      <section
        aria-labelledby="tmdb-attribution-heading"
        className="space-y-4 rounded-lg border bg-card p-5 shadow-sm sm:p-6"
      >
        <h2 id="tmdb-attribution-heading" className="text-xl font-semibold">
          TMDB attribution
        </h2>
        <div className="inline-flex max-w-full rounded-md bg-white p-3">
          <img
            src={`${import.meta.env.BASE_URL}tmdb-logo.svg`}
            alt="TMDB"
            className="h-auto w-56 max-w-full"
          />
        </div>
        <p className="text-sm leading-relaxed">
          This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <a
            href="https://www.themoviedb.org/api-terms-of-use"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            TMDB API Terms of Use
          </a>
          <a
            href="https://www.themoviedb.org/about/logos-attribution"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            TMDB logo and attribution guidelines
          </a>
        </div>
      </section>
    </article>
  );
}
