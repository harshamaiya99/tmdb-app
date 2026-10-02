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

const GENRE_OPTIONS = [
  { value: 'all', label: 'All Genres' },
  { value: '28', label: 'Action' },
  { value: '12', label: 'Adventure' },
  { value: '16', label: 'Animation' },
  { value: '35', label: 'Comedy' },
  { value: '80', label: 'Crime' },
  { value: '99', label: 'Documentary' },
  { value: '18', label: 'Drama' },
  { value: '10751', label: 'Family' },
  { value: '14', label: 'Fantasy' },
  { value: '36', label: 'History' },
  { value: '27', label: 'Horror' },
  { value: '10402', label: 'Music' },
  { value: '9648', label: 'Mystery' },
  { value: '10749', label: 'Romance' },
  { value: '878', label: 'Science Fiction' },
  { value: '53', label: 'Thriller' },
  { value: '10770', label: 'TV Movie' },
  { value: '10752', label: 'War' },
  { value: '37', label: 'Western' },
  { value: '10763', label: 'News' },
  { value: '10764', label: 'Reality' },
];

const LANGUAGE_OPTIONS = [
  { value: 'all', label: 'All Languages' },
  { value: 'ar', label: 'Arabic' },
  { value: 'bn', label: 'Bengali' },
  { value: 'cs', label: 'Czech' },
  { value: 'da', label: 'Danish' },
  { value: 'de', label: 'German' },
  { value: 'el', label: 'Greek' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fi', label: 'Finnish' },
  { value: 'fr', label: 'French' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'he', label: 'Hebrew' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'id', label: 'Indonesian' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ko', label: 'Korean' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'nl', label: 'Dutch' },
  { value: 'no', label: 'Norwegian' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'pl', label: 'Polish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'sv', label: 'Swedish' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'th', label: 'Thai' },
  { value: 'tr', label: 'Turkish' },
  { value: 'zh', label: 'Mandarin' },
];

export function MediaListPage() {
  const { category } = useParams<{ category: string }>();
  const location = useLocation();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, setPage } = usePagination();
  const entityNameParam = searchParams.get('name');
  const selectedLanguage = searchParams.get('language') ?? 'all';

  let effectiveCategory = category;
  if (!effectiveCategory) {
    if (location.pathname === '/movie') effectiveCategory = 'trending-movies';
    else if (location.pathname === '/tv') effectiveCategory = 'trending-tv';
  }

  const personMatch = effectiveCategory?.match(/^person-(\d+)-(movies|tv)$/);
  const genreMatch = effectiveCategory?.match(/^genre-(movie|tv)-(\d+)$/);
  const companyMatch = effectiveCategory?.match(/^company-(\d+)$/); 
  const providerMatch = effectiveCategory?.match(/^provider-(\d+)$/); 
  const selectedGenre = searchParams.get('genre') ?? (genreMatch ? genreMatch[2] : 'all');
  
  const personType = personMatch?.[2] === 'tv' ? 'tv' : 'movie';
  const itemType = personMatch ? personType : genreMatch ? genreMatch[1] as 'movie' | 'tv' : effectiveCategory?.includes('tv') ? 'tv' : 'movie';
  
  const personNameQuery = useCachedQuery(
    `person-name:${personMatch?.[1] ?? 'none'}`,
    (signal) => tmdbService.getPersonDetails(Number(personMatch?.[1]), { signal }),
    { enabled: Boolean(personMatch?.[1]), ttlMs: 30 * 60 * 1000 },
  );

  const listQuery = useCachedQuery<TrendingResponse<Movie | TVShow | PersonCredit>>(
    `list:${effectiveCategory ?? 'none'}:${page}:${selectedLanguage}:${selectedGenre}`,
    async (signal) => {
      const currentPersonMatch = effectiveCategory?.match(/^person-(\d+)-(movies|tv)$/);
      const currentCompanyMatch = effectiveCategory?.match(/^company-(\d+)$/);
      const currentProviderMatch = effectiveCategory?.match(/^provider-(\d+)$/);
      const currentItemType = currentPersonMatch?.[2] === 'tv' ? 'tv' : 'movie';
      const languageFilter = selectedLanguage === 'all' ? undefined : selectedLanguage;
      const genreFilter = selectedGenre === 'all' ? undefined : Number(selectedGenre);

      if (currentPersonMatch && currentPersonMatch[1]) {
        return tmdbService.getPersonCredits(Number(currentPersonMatch[1]), currentItemType, page, { signal });
      }
      if (genreFilter !== undefined) {
        return tmdbService.getGenreMediaList(itemType, genreFilter, page, { signal }, languageFilter);
      }
      if (currentCompanyMatch?.[1]) {
        return tmdbService.getMoviesByCompany(Number(currentCompanyMatch[1]), page, { signal }, languageFilter);
      }
      if (currentProviderMatch?.[1]) {
        return tmdbService.getMoviesByProvider(Number(currentProviderMatch[1]), page, { signal }, languageFilter);
      }
      return tmdbService.getCategoryList(effectiveCategory ?? '', page, { signal }, languageFilter);
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

  const updateLanguageFilter = (language: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (language === 'all') {
      nextParams.delete('language');
    } else {
      nextParams.set('language', language);
    }
    setPage(1);
    setSearchParams(nextParams, { replace: true });
  };

  const updateGenreFilter = (genre: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (genre === 'all') {
      nextParams.delete('genre');
    } else {
      nextParams.set('genre', genre);
    }
    setPage(1);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <main className="container py-4">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
          <select
            id="media-language-filter"
            value={selectedLanguage}
            onChange={(event) => updateLanguageFilter(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language.value} value={language.value}>{language.label}</option>
            ))}
          </select>

          <select
            id="media-genre-filter"
            value={selectedGenre}
            onChange={(event) => updateGenreFilter(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {GENRE_OPTIONS.map((genre) => (
              <option key={genre.value} value={genre.value}>{genre.label}</option>
            ))}
          </select>
        </div>
        
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