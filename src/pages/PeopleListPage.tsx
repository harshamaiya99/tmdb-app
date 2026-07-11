import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { tmdbService, type PersonListResult } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';
import { useTitle } from '@/contexts/TitleContext';

export function PeopleListPage() {
  const [people, setPeople] = useState<PersonListResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setTitle } = useTitle();

  // Read page from URL or default to 1
  useEffect(() => {
    const urlPage = parseInt(searchParams.get('page') || '1', 10);
    setPage(urlPage);
  }, [searchParams]);

  useEffect(() => {
    setTitle('Popular People');
  }, [setTitle]);

  useEffect(() => {
    const fetchPeople = async () => {
      setLoading(true);
      try {
        const data = await tmdbService.getPopularPersons(page);
        setPeople(data.results);
        setTotalPages(Math.min(data.total_pages, 500)); // TMDB limits pagination
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load popular people.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPeople();
  }, [page, toast]);

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage.toString() });
  };

  return (
    <main className="container py-8">
      {loading ? (
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
          {people.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No people found.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
              {people.map((person) => (
                <div 
                  key={person.id} 
                  onClick={() => navigate(`/person/${person.id}`)}
                  className="cursor-pointer group flex flex-col space-y-2"
                >
                  <div className="overflow-hidden rounded-xl bg-muted aspect-[2/3] border shadow-sm relative">
                    {person.profile_path ? (
                      <img 
                        src={tmdbService.getImageUrl(person.profile_path, 'w500')} 
                        alt={person.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No Image
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
                </div>
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