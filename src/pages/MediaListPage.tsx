// src/pages/MediaListPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MediaCard } from '@/components/MediaCard';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { tmdbService, type Movie, type TVShow, type PersonCredit, type Person } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';
import { useTitle } from '@/contexts/TitleContext';

const GENRE_NAMES: Record<string, string> = {
  '28': 'Action',
  '12': 'Adventure',
  '16': 'Animation',
  '35': 'Comedy',
  '80': 'Crime',
  '99': 'Documentary',
  '18': 'Drama',
  '10751': 'Family',
  '14': 'Fantasy',
  '36': 'History',
  '27': 'Horror',
  '10402': 'Music',
  '9648': 'Mystery',
  '10749': 'Romance',
  '878': 'Science Fiction',
  '10770': 'TV Movie',
  '53': 'Thriller',
  '10752': 'War',
  '37': 'Western',
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
  const [items, setItems] = useState<(Movie | TVShow | PersonCredit)[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [personName, setPersonName] = useState<string | null>(null);
  const { setTitle } = useTitle();
  const { toast } = useToast();

  const personMatch = category?.match(/^person-(\d+)-(movies|tv)$/);
  const genreMatch = category?.match(/^genre-(movie|tv)-(\d+)$/);
  const personType = personMatch?.[2] === 'tv' ? 'tv' : 'movie';
  const itemType = personMatch ? personType : genreMatch ? genreMatch[1] as 'movie' | 'tv' : category?.includes('tv') ? 'tv' : 'movie';
  
  let pageTitle = CATEGORY_TITLES[category ?? ''] ?? 'Media List';
  
  if (personMatch && personName) {
    pageTitle = personType === 'tv' ? `${personName}'s TV Shows` : `${personName}'s Movies`;
  } else if (genreMatch && genreMatch[2]) {
    const genreName = GENRE_NAMES[genreMatch[2]] || 'Genre';
    pageTitle = `${genreName} ${itemType === 'tv' ? 'TV Shows' : 'Movies'}`;
  }

  useEffect(() => {
    setTitle(pageTitle);
  }, [pageTitle, setTitle, personName]);

  useEffect(() => {
    if (personMatch && personMatch[1]) {
      const fetchPersonName = async () => {
        try {
          const person = await tmdbService.getPersonDetails(Number(personMatch[1]));
          setPersonName(person.name);
        } catch {
          setPersonName('Unknown');
        }
      };
      fetchPersonName();
    }
  }, [personMatch]);

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