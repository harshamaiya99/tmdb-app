// src/pages/MediaListPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MediaCard } from '@/components/MediaCard';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { tmdbService, type Movie, type TVShow, type PersonCredit } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';

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
  const [items, setItems] = useState<(Movie | TVShow | PersonCredit)[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();

  const personMatch = category?.match(/^person-(\d+)-(movies|tv)$/);
  const genreMatch = category?.match(/^genre-(movie|tv)-(\d+)$/);
  const personType = personMatch?.[2] === 'tv' ? 'tv' : 'movie';
  const itemType = personMatch ? personType : genreMatch ? genreMatch[1] as 'movie' | 'tv' : category?.includes('tv') ? 'tv' : 'movie';
  const pageTitle = personMatch
    ? personType === 'tv'
      ? 'Person TV Credits'
      : 'Person Movie Credits'
    : genreMatch
      ? `Popular ${itemType === 'tv' ? 'TV Shows' : 'Movies'}`
      : CATEGORY_TITLES[category ?? ''] ?? 'Media List';

  useEffect(() => {
    // Reset page to 1 if the category changes
    setPage(1);
  }, [category]);

  useEffect(() => {
    const fetchCategoryData = async () => {
      if (!category) return;

      const currentPersonMatch = category.match(/^person-(\d+)-(movies|tv)$/);
      const currentItemType = currentPersonMatch?.[2] === 'tv' ? 'tv' : 'movie';

      try {
        setLoading(true);
        setItems([]);

        let data;

        if (currentPersonMatch && currentPersonMatch[1]) {
          data = await tmdbService.getPersonCredits(Number(currentPersonMatch[1]), currentItemType as 'movie' | 'tv', page);
        } else if (genreMatch && genreMatch[2]) {
          data = await tmdbService.getGenreMediaList(itemType as 'movie' | 'tv', Number(genreMatch[2]), page);
        } else {
          data = await tmdbService.getCategoryList(category, page);
        }

        setItems(data.results);
        setTotalPages(Math.min(data.total_pages, 500));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load data.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [category, page, toast]);

  return (
    <main className="container py-8">
        {loading ? (
          <div className="space-y-8">
             <MediaGridSkeleton />
          </div>
        ) : (
          <div className="space-y-8 pb-12">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold">{pageTitle}</h1>
              {personMatch && (
                <p className="text-sm text-muted-foreground">Showing the full list of this person&apos;s {itemType === 'tv' ? 'TV shows' : 'movies'}.</p>
              )}
              {genreMatch && (
                <p className="text-sm text-muted-foreground">Showing popular {itemType === 'tv' ? 'TV shows' : 'movies'} in this genre.</p>
              )}
            </div>
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No {itemType === 'tv' ? 'TV shows' : 'movies'} found for this selection.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-4">
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
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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