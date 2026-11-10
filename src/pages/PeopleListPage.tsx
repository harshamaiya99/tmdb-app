import { Skeleton } from '@/components/ui/skeleton';
import { MediaCard } from '@/components/MediaCard';
import { PaginationControls } from '@/components/PaginationControls';
import { tmdbService } from '@/lib/tmdb';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePagination } from '@/hooks/usePagination';
import { usePageTitle } from '@/hooks/usePageTitle';
import { MediaCategoryToggle, PEOPLE_CATEGORIES } from '@/components/MediaCategoryToggle';

export function PeopleListPage() {
  const { page, searchParams, setSearchParams, setPage } = usePagination();
  const category = searchParams.get('category') === 'trending' ? 'trending' : 'popular';

  usePageTitle(category === 'trending' ? 'Trending People' : 'Popular People');

  const peopleQuery = useCachedQuery(
    `people:${category}:${page}`,
    (signal) => (
      category === 'trending'
        ? tmdbService.getTrendingPersons(page, { signal })
        : tmdbService.getPopularPersons(page, { signal })
    ),
  );
  const people = peopleQuery.data?.results ?? [];
  const totalPages = Math.min(peopleQuery.data?.total_pages ?? 1, 500);

  const handleCategoryChange = (nextCategory: (typeof PEOPLE_CATEGORIES)[number]['value']) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextCategory === 'popular') {
      nextParams.delete('category');
    } else {
      nextParams.set('category', nextCategory);
    }
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="container py-4">
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 sm:flex sm:gap-4">
        <h1 className="min-w-0 text-3xl font-bold tracking-tight">People</h1>
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <MediaCategoryToggle
            label="People"
            options={PEOPLE_CATEGORIES}
            value={category}
            onChange={handleCategoryChange}
            className="w-full sm:w-auto"
          />
        </div>
      </div>
      {peopleQuery.loading ? (
        <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-8 2xl:grid-cols-10">
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
            <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-8 2xl:grid-cols-10">
              {people.map((person) => (
                <MediaCard key={person.id} item={person} type="person" />
              ))}
            </div>
          )}
          
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="mt-12 pt-8"
          />
        </div>
      )}
    </main>
  );
}