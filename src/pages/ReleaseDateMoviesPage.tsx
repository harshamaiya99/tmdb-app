import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MediaCard } from '@/components/MediaCard';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { useEmbedSettings } from '@/contexts/EmbedSettingsContext';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePagination } from '@/hooks/usePagination';
import { tmdbService } from '@/lib/tmdb';
import { formatDate } from '@/lib/utils';

function isValidDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function ReleaseDateMoviesPage() {
  const { date } = useParams<{ date: string }>();
  const { page, setPage } = usePagination();
  const { region } = useEmbedSettings();
  const validDate = isValidDate(date);
  const formattedDate = validDate ? formatDate(date) : '';
  const title = validDate ? `Movies Released on ${formattedDate}` : 'Movie Releases';
  const releases = useCachedQuery(
    `release-date:movies:${date ?? 'invalid'}:${region}:${page}`,
    (signal) => {
      if (!validDate || !date) throw new Error('Invalid release date.');
      return tmdbService.getMoviesByReleaseDateRange(date, date, page, { signal }, region);
    },
    { enabled: validDate },
  );
  const totalPages = Math.min(releases.data?.total_pages ?? 1, 500);

  usePageTitle(title);

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="container py-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{title}</h1>

      {!validDate ? (
        <Alert variant="destructive">
          <AlertDescription>The requested release date is invalid.</AlertDescription>
        </Alert>
      ) : releases.loading ? (
        <MediaGridSkeleton />
      ) : releases.error ? (
        <Alert variant="destructive">
          <AlertDescription>{releases.error.message}</AlertDescription>
        </Alert>
      ) : !releases.data?.results.length ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No movies found for this release date.
        </div>
      ) : (
        <div className="space-y-8 pb-12">
          <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 2xl:grid-cols-10">
            {releases.data.results.map((movie) => <MediaCard key={movie.id} item={movie} type="movie" />)}
          </div>
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-6 border-t pt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => changePage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
