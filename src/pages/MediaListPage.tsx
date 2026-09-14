// src/pages/MediaListPage.tsx
import { useParams, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MediaCard } from '@/components/MediaCard';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tmdbService, type Movie, type TVShow, type PersonCredit, type TrendingResponse } from '@/lib/tmdb';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePagination } from '@/hooks/usePagination';
import { usePageTitle } from '@/hooks/usePageTitle';

const GENRE_NAMES: Record<string, string> = {
  '28': 'Action', '12': 'Adventure', '16': 'Animation', '35': 'Comedy', '80': 'Crime',
  '99': 'Documentary', '18': 'Drama', '10751': 'Family', '14': 'Fantasy', '36': 'History',
  '27': 'Horror', '10402': 'Music', '9648': 'Mystery', '10749': 'Romance', '878': 'Science Fiction',
  '10770': 'TV Movie', '53': 'Thriller', '10752': 'War', '37': 'Western',
};

const CATEGORY_TITLES: Record<string, string> = {
  'trending-movies': 'Trending Movies',
  'now-playing-movies': 'Now Playing in Theaters',
  'top-rated-movies': 'Top Rated Movies',
  'upcoming-movies': 'Upcoming Movies',
  'trending-tv': 'Trending TV Shows',
  'popular-tv': 'Popular TV Shows',
  'top-rated-tv': 'Top Rated TV Shows'
};

export function MediaListPage() {
  const { category } = useParams<{ category: string }>();
  const location = useLocation();
  
  const [searchParams] = useSearchParams();
  const { page, setPage } = usePagination();
  const entityNameParam = searchParams.get('name'); // Grabs name from URL

  let effectiveCategory = category;
  if (!effectiveCategory) {
    if (location.pathname === '/movie') effectiveCategory = 'trending-movies';
    else if (location.pathname === '/tv') effectiveCategory = 'trending-tv';
  }

  const personMatch = effectiveCategory?.match(/^person-(\d+)-(movies|tv)$/);
  const genreMatch = effectiveCategory?.match(/^genre-(movie|tv)-(\d+)$/);
  const companyMatch = effectiveCategory?.match(/^company-(\d+)$/); 
  const providerMatch = effectiveCategory?.match(/^provider-(\d+)$/); 
  
  const personType = personMatch?.[2] === 'tv' ? 'tv' : 'movie';
  const itemType = personMatch ? personType : genreMatch ? genreMatch[1] as 'movie' | 'tv' : effectiveCategory?.includes('tv') ? 'tv' : 'movie';
  
  const personNameQuery = useCachedQuery(
    `person-name:${personMatch?.[1] ?? 'none'}`,
    (signal) => tmdbService.getPersonDetails(Number(personMatch?.[1]), { signal }),
    { enabled: Boolean(personMatch?.[1]), ttlMs: 30 * 60 * 1000 },
  );

  const listQuery = useCachedQuery<TrendingResponse<Movie | TVShow | PersonCredit>>(
    `list:${effectiveCategory ?? 'none'}:${page}`,
    async (signal) => {
      const currentPersonMatch = effectiveCategory?.match(/^person-(\d+)-(movies|tv)$/);
      const currentCompanyMatch = effectiveCategory?.match(/^company-(\d+)$/);
      const currentProviderMatch = effectiveCategory?.match(/^provider-(\d+)$/);
      const currentItemType = currentPersonMatch?.[2] === 'tv' ? 'tv' : 'movie';

      if (currentPersonMatch && currentPersonMatch[1]) {
        return tmdbService.getPersonCredits(Number(currentPersonMatch[1]), currentItemType, page, { signal });
      }
      if (genreMatch?.[2]) {
        return tmdbService.getGenreMediaList(itemType, Number(genreMatch[2]), page, { signal });
      }
      if (currentCompanyMatch?.[1]) {
        return tmdbService.getMoviesByCompany(Number(currentCompanyMatch[1]), page, { signal });
      }
      if (currentProviderMatch?.[1]) {
        return tmdbService.getMoviesByProvider(Number(currentProviderMatch[1]), page, { signal });
      }
      return tmdbService.getCategoryList(effectiveCategory ?? '', page, { signal });
    },
    { enabled: Boolean(effectiveCategory) },
  );

  const items = listQuery.data?.results ?? [];
  const totalPages = Math.min(listQuery.data?.total_pages ?? 1, 500);
  const loading = listQuery.loading;
  const personName = personNameQuery.data?.name ?? (personNameQuery.error ? 'Unknown' : null);

  let pageTitle = CATEGORY_TITLES[effectiveCategory ?? ''] ?? 'Media List';
  if (personMatch && personName) {
    pageTitle = personType === 'tv' ? `${personName}'s TV Shows` : `${personName}'s Movies`;
  } else if (genreMatch?.[2]) {
    const genreName = entityNameParam || GENRE_NAMES[genreMatch[2]] || 'Genre';
    pageTitle = `${genreName} ${itemType === 'tv' ? 'TV Shows' : 'Movies'}`;
  } else if (companyMatch) {
    pageTitle = entityNameParam ? `Movies by ${entityNameParam}` : 'Production Movies';
  } else if (providerMatch) {
    pageTitle = entityNameParam ? `Streaming on ${entityNameParam}` : 'Platform Movies';
  }

  usePageTitle(pageTitle);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="container py-8">
        {/* Visual <h1> removed completely! */}
        
        {loading ? (
          <div className="space-y-8">
             <MediaGridSkeleton />
          </div>
        ) : (
          <div className="space-y-8 pb-12">
            {listQuery.error && (
              <Alert variant="destructive">
                <AlertDescription>{listQuery.error.message}</AlertDescription>
              </Alert>
            )}
            
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No {itemType === 'tv' ? 'TV shows' : 'movies'} found for this selection.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 2xl:grid-cols-10">
                {items.map((item) => (
                  <MediaCard key={item.id} item={item} type={itemType} />
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