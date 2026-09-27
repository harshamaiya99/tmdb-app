import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaCard } from '@/components/MediaCard';
import { tmdbService } from '@/lib/tmdb';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePagination } from '@/hooks/usePagination';
import { usePageTitle } from '@/hooks/usePageTitle';

export function PeopleListPage() {
  const { page, setPage } = usePagination();

  usePageTitle('Popular People');

  const peopleQuery = useCachedQuery(
    `people:${page}`,
    (signal) => tmdbService.getPopularPersons(page, { signal }),
  );
  const people = peopleQuery.data?.results ?? [];
  const totalPages = Math.min(peopleQuery.data?.total_pages ?? 1, 500);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="container py-8">
      {peopleQuery.loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-8 2xl:grid-cols-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-lg bg-card">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <div className="flex flex-1 flex-col gap-1 p-2.5">
                <div className="flex h-[30px] flex-col justify-between py-0.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8 pb-12">
          {peopleQuery.error && (
            <Alert variant="destructive">
              <AlertDescription>{peopleQuery.error.message}</AlertDescription>
            </Alert>
          )}
          {people.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No people found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-8 2xl:grid-cols-10">
              {people.map((person) => (
                <MediaCard key={person.id} item={person} type="person" />
              ))}
            </div>
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-6 mt-12 pt-8 border-t">
              <Button 
                variant="outline" 
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
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