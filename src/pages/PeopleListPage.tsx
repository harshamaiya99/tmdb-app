import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
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
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
              {people.map((person) => (
                <Link key={person.id} to={`/person/${person.id}`} className="group flex flex-col space-y-2">
                  <div className="overflow-hidden rounded-xl bg-muted aspect-[2/3] border shadow-sm relative">
                    {person.profile_path ? (
                      <img 
                        src={tmdbService.getImageUrl(person.profile_path, 'w500')} 
                        alt={`${person.name} profile`}
                        width="500"
                        height="750"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div role="img" aria-label={`${person.name} profile unavailable`} className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        Profile unavailable
                      </div>
                    )}
                  </div>
                  <div className="px-1">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {person.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {person.known_for_department}
                    </p>
                  </div>
                </Link>
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