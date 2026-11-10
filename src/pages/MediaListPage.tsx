// src/pages/MediaListPage.tsx
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from '@/components/ui/button';
import { MediaCard } from '@/components/MediaCard';
import { MediaGridSkeleton } from '@/components/MediaGridSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MediaCategoryToggle, MOVIE_CATEGORIES, TV_CATEGORIES } from '@/components/MediaCategoryToggle';
import { tmdbService, filterPersonCredits, sortPersonCredits, type Movie, type TVShow, type PersonCredit, type TrendingResponse } from '@/lib/tmdb';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePagination } from '@/hooks/usePagination';
import { useEmbedSettings } from '@/contexts/EmbedSettingsContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatLanguage } from '@/lib/utils';

const GENRE_NAMES: Record<string, string> = {
  '28': 'Action', '12': 'Adventure', '16': 'Animation', '35': 'Comedy', '80': 'Crime',
  '99': 'Documentary', '18': 'Drama', '10751': 'Family', '14': 'Fantasy', '36': 'History',
  '27': 'Horror', '10402': 'Music', '9648': 'Mystery', '10749': 'Romance', '878': 'Science Fiction',
  '10770': 'TV Movie', '53': 'Thriller', '10752': 'War', '37': 'Western',
  '10759': 'Action & Adventure', '10762': 'Kids', '10763': 'News', '10764': 'Reality',
  '10765': 'Sci-Fi & Fantasy', '10766': 'Soap', '10767': 'Talk', '10768': 'War & Politics',
};

const CATEGORY_TITLES: Record<string, string> = {
  'trending-movies': 'Trending Movies',
  'popular-movies': 'Popular Movies',
  'trending-streaming-movies': 'Streaming Movies',
  'now-playing-movies': 'Now Playing in Theaters',
  'top-rated-movies': 'Top Rated Movies',
  'upcoming-movies': 'Upcoming Movies',
  'trending-tv': 'Trending TV Shows',
  'popular-tv': 'Popular TV Shows',
  'top-rated-tv': 'Top Rated TV Shows'
};

const GENRE_OPTIONS_BY_TYPE = {
  movie: [
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
  ],
  tv: [
    { value: 'all', label: 'All Genres' },
    { value: '10759', label: 'Action & Adventure' },
    { value: '16', label: 'Animation' },
    { value: '35', label: 'Comedy' },
    { value: '80', label: 'Crime' },
    { value: '99', label: 'Documentary' },
    { value: '18', label: 'Drama' },
    { value: '10751', label: 'Family' },
    { value: '10762', label: 'Kids' },
    { value: '9648', label: 'Mystery' },
    { value: '10763', label: 'News' },
    { value: '10764', label: 'Reality' },
    { value: '10765', label: 'Sci-Fi & Fantasy' },
    { value: '10766', label: 'Soap' },
    { value: '10768', label: 'War & Politics' },
    { value: '37', label: 'Western' },
  ],
} as const;

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

const SORT_OPTIONS_BY_TYPE = {
  movie: [
    { value: 'popularity.desc', label: 'Popularity' },
    { value: 'vote_average.desc', label: 'Rating' },
    { value: 'primary_release_date.desc', label: 'Newest' },
    { value: 'primary_release_date.asc', label: 'Oldest' },
    { value: 'original_title.asc', label: 'Title A–Z' },
  ],
  tv: [
    { value: 'popularity.desc', label: 'Popularity' },
    { value: 'vote_average.desc', label: 'Rating' },
    { value: 'first_air_date.desc', label: 'Newest' },
    { value: 'first_air_date.asc', label: 'Oldest' },
    { value: 'name.asc', label: 'Title A–Z' },
  ],
} as const;

const PERSON_CREDITS_PAGE_SIZE = 20;
const PERSON_MEDIA_OPTIONS = [
  { value: 'movies', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
] as const;

function getDefaultSort(category: string | undefined): string {
  if (category === 'top-rated-movies' || category === 'top-rated-tv' || category === 'imdb-top-rated-movies') {
    return 'vote_average.desc';
  }
  if (category === 'upcoming-movies') return 'primary_release_date.asc';
  return 'popularity.desc';
}

export function MediaListPage() {
  const { category } = useParams<{ category: string }>();
  const { region } = useEmbedSettings();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, setPage } = usePagination();
  const entityNameParam = searchParams.get('name');
  const isMovieTab = location.pathname === '/movie';
  const isTVTab = location.pathname === '/tv';
  const isMovieCategoryPage = MOVIE_CATEGORIES.some(({ value }) => value === category);
  const isTVCategoryPage = TV_CATEGORIES.some(({ value }) => value === category);
  const showMovieCategories = isMovieTab || isMovieCategoryPage;
  const showTVCategories = isTVTab || isTVCategoryPage;
  const movieTabCategory = MOVIE_CATEGORIES.find(({ value }) => value === searchParams.get('movie_category'))?.value;
  const tvTabCategory = TV_CATEGORIES.find(({ value }) => value === searchParams.get('tv_category'))?.value;
  const selectedTabCategory = isMovieCategoryPage || isTVCategoryPage
    ? category as (typeof MOVIE_CATEGORIES)[number]['value'] | (typeof TV_CATEGORIES)[number]['value']
    : isMovieTab
      ? movieTabCategory ?? 'trending-movies'
      : tvTabCategory ?? 'trending-tv';

  let effectiveCategory = category;
  if (!effectiveCategory) {
    if (isMovieTab) effectiveCategory = movieTabCategory ?? 'trending-movies';
    else if (isTVTab) effectiveCategory = tvTabCategory ?? 'trending-tv';
  }

  const personMatch = effectiveCategory?.match(/^person-(\d+)-(movies|tv)$/);
  const genreMatch = effectiveCategory?.match(/^genre-(movie|tv)-(\d+)$/);
  const languageMatch = effectiveCategory?.match(/^language-(movie|tv)-([a-z]{2,3})$/i);
  const selectedLanguage = searchParams.get('language') ?? languageMatch?.[2].toLowerCase() ?? 'all';
  const companyMatch = effectiveCategory?.match(/^company-(\d+)$/); 
  const providerMatch = effectiveCategory?.match(/^provider-(\d+)$/); 
  const isCompanyProviderCategory = Boolean(companyMatch || providerMatch);
  const selectedMediaType = searchParams.get('media_type') === 'tv' ? 'tv' : 'movie';
  const selectedGenre = searchParams.get('genre') ?? (genreMatch ? genreMatch[2] : 'all');
  
  const personType = personMatch?.[2] === 'tv' ? 'tv' : 'movie';
  const itemType = personMatch
    ? personType
    : genreMatch
      ? genreMatch[1] as 'movie' | 'tv'
      : languageMatch
        ? languageMatch[1] as 'movie' | 'tv'
        : isCompanyProviderCategory
          ? selectedMediaType
          : effectiveCategory?.includes('tv') ? 'tv' : 'movie';
  const defaultSort = getDefaultSort(effectiveCategory);
  const selectedSort = searchParams.get('sort') ?? defaultSort;
  const genreOptions = itemType === 'tv' ? GENRE_OPTIONS_BY_TYPE.tv : GENRE_OPTIONS_BY_TYPE.movie;
  const availableSortOptions = itemType === 'tv' ? SORT_OPTIONS_BY_TYPE.tv : SORT_OPTIONS_BY_TYPE.movie;
  
  const personNameQuery = useCachedQuery(
    `person-name:${personMatch?.[1] ?? 'none'}`,
    (signal) => tmdbService.getPersonDetails(Number(personMatch?.[1]), { signal }),
    { enabled: Boolean(personMatch?.[1]), ttlMs: 30 * 60 * 1000 },
  );

  const listQuery = useCachedQuery<TrendingResponse<Movie | TVShow | PersonCredit>>(
    `list:${effectiveCategory ?? 'none'}:${itemType}:${personMatch ? 'all' : page}:${personMatch ? 'all' : selectedLanguage}:${personMatch ? 'all' : selectedGenre}:${personMatch ? 'default' : selectedSort}:${region}`,
    async (signal) => {
      const currentPersonMatch = effectiveCategory?.match(/^person-(\d+)-(movies|tv)$/);
      const currentCompanyMatch = effectiveCategory?.match(/^company-(\d+)$/);
      const currentProviderMatch = effectiveCategory?.match(/^provider-(\d+)$/);
      const currentGenreMatch = effectiveCategory?.match(/^genre-(movie|tv)-(\d+)$/);
      const currentLanguageMatch = effectiveCategory?.match(/^language-(movie|tv)-([a-z]{2,3})$/i);
      const currentItemType = currentPersonMatch?.[2] === 'tv' ? 'tv' : 'movie';
      const languageFilter = selectedLanguage === 'all' ? undefined : selectedLanguage;
      const genreFilter = selectedGenre === 'all' ? undefined : Number(selectedGenre);
      const sortFilter = selectedSort || defaultSort;

      if (currentPersonMatch && currentPersonMatch[1]) {
        return tmdbService.getPersonCredits(Number(currentPersonMatch[1]), currentItemType, { signal });
      }

      const effectiveLanguage = languageFilter;
      const isCompanyOrProvider = Boolean(currentCompanyMatch || currentProviderMatch);
      const isGenreOrLanguageRoute = Boolean(currentGenreMatch || currentLanguageMatch);
      const hasCustomFilters = Boolean(effectiveLanguage)
        || genreFilter !== undefined
        || sortFilter !== defaultSort;
      const needsDiscovery = isCompanyOrProvider
        || isGenreOrLanguageRoute
        || hasCustomFilters;

      if (needsDiscovery) {
        return tmdbService.getFilteredMediaList({
          mediaType: itemType,
          page,
          category: isCompanyOrProvider || isGenreOrLanguageRoute ? undefined : effectiveCategory,
          genreId: genreFilter,
          language: effectiveLanguage,
          sortBy: sortFilter,
          companyId: currentCompanyMatch ? Number(currentCompanyMatch[1]) : undefined,
          providerId: currentProviderMatch ? Number(currentProviderMatch[1]) : undefined,
          region,
        }, { signal });
      }

      return tmdbService.getCategoryList(effectiveCategory ?? '', page, { signal }, undefined, sortFilter, region);
    },
    { enabled: Boolean(effectiveCategory) },
  );

  const personCredits = personMatch
    ? sortPersonCredits(
        filterPersonCredits(
          (listQuery.data?.results ?? []).filter(
            (item): item is PersonCredit => 'media_type' in item,
          ),
          selectedGenre === 'all' ? undefined : Number(selectedGenre),
          selectedLanguage === 'all' ? undefined : selectedLanguage,
        ),
        personNameQuery.data?.known_for_department,
        selectedSort,
      )
    : null;
  const items = personCredits
    ? personCredits.slice((page - 1) * PERSON_CREDITS_PAGE_SIZE, page * PERSON_CREDITS_PAGE_SIZE)
    : listQuery.data?.results ?? [];
  const totalPages = personCredits
    ? Math.ceil(personCredits.length / PERSON_CREDITS_PAGE_SIZE)
    : Math.min(listQuery.data?.total_pages ?? 1, 500);
  const loading = listQuery.loading;
  const personName = personNameQuery.data?.name ?? (personNameQuery.error ? 'Unknown' : null);

  let pageTitle = CATEGORY_TITLES[effectiveCategory ?? ''] ?? 'Media List';
  if (personMatch && personName) {
    pageTitle = personType === 'tv' ? `${personName}'s TV Shows` : `${personName}'s Movies`;
  } else if (genreMatch?.[2]) {
    const activeGenre = selectedGenre === 'all' ? undefined : GENRE_NAMES[selectedGenre];
    pageTitle = activeGenre
      ? `${activeGenre} ${itemType === 'tv' ? 'TV Shows' : 'Movies'}`
      : itemType === 'tv' ? 'TV Shows' : 'Movies';
  } else if (languageMatch) {
    pageTitle = selectedLanguage === 'all'
      ? itemType === 'tv' ? 'TV Shows' : 'Movies'
      : `${formatLanguage(selectedLanguage)} ${itemType === 'tv' ? 'TV Shows' : 'Movies'}`;
  } else if (companyMatch) {
    pageTitle = itemType === 'tv'
      ? entityNameParam ? `TV Shows by ${entityNameParam}` : 'Production TV Shows'
      : entityNameParam ? `Movies by ${entityNameParam}` : 'Production Movies';
  } else if (providerMatch) {
    pageTitle = entityNameParam
      ? `Streaming on ${entityNameParam} ${itemType === 'tv' ? 'TV Shows' : 'Movies'}`
      : `Platform ${itemType === 'tv' ? 'TV Shows' : 'Movies'}`;
  }

  usePageTitle(pageTitle);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateLanguageFilter = (language: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('page');
    if (language === 'all') {
      if (languageMatch) nextParams.set('language', 'all');
      else nextParams.delete('language');
    } else {
      nextParams.set('language', language);
    }
    setPage(1);
    setSearchParams(nextParams, { replace: true });
  };

  const updateGenreFilter = (genre: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('page');
    if (genre === 'all') {
      if (genreMatch) nextParams.set('genre', 'all');
      else nextParams.delete('genre');
    } else {
      nextParams.set('genre', genre);
    }
    setPage(1);
    setSearchParams(nextParams, { replace: true });
  };

  const updateSortFilter = (sort: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('page');
    if (sort === defaultSort) {
      nextParams.delete('sort');
    } else {
      nextParams.set('sort', sort);
    }
    setPage(1);
    setSearchParams(nextParams, { replace: true });
  };

  const clearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('page');
    nextParams.delete('sort');
    if (genreMatch) nextParams.set('genre', 'all');
    else nextParams.delete('genre');
    if (languageMatch) nextParams.set('language', 'all');
    else nextParams.delete('language');
    setPage(1);
    setSearchParams(nextParams, { replace: true });
  };

  const updateMediaType = (mediaType: 'movie' | 'tv') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('page');
    nextParams.delete('genre');
    if (mediaType === 'movie') {
      nextParams.delete('media_type');
    } else {
      nextParams.set('media_type', mediaType);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const updateTabCategory = (nextCategory: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('page');
    nextParams.delete('genre');
    if (isMovieCategoryPage || isTVCategoryPage) {
      const query = nextParams.toString();
      navigate(`/category/${nextCategory}${query ? `?${query}` : ''}`);
      return;
    }

    nextParams.set(isMovieTab ? 'movie_category' : 'tv_category', nextCategory);
    setSearchParams(nextParams, { replace: true });
  };

  const updatePersonMediaType = (mediaType: 'movies' | 'tv') => {
    if (!personMatch) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('page');
    const query = nextParams.toString();
    navigate(`/category/person-${personMatch[1]}-${mediaType}${query ? `?${query}` : ''}`);
  };

  const filtersControl = (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          Filters
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          aria-label="Media filters"
          className="z-50 w-64 space-y-4 rounded-md border bg-popover p-4 text-popover-foreground shadow-md"
        >
          {!languageMatch && (
            <div className="space-y-2">
              <label htmlFor="media-language-filter" className="text-sm font-medium">Language</label>
              <select
                id="media-language-filter"
                value={selectedLanguage}
                onChange={(event) => updateLanguageFilter(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {LANGUAGE_OPTIONS.map((language) => (
                  <option key={language.value} value={language.value}>{language.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="media-genre-filter" className="text-sm font-medium">Genre</label>
            <select
              id="media-genre-filter"
              value={selectedGenre}
              onChange={(event) => updateGenreFilter(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {genreOptions.map((genre) => (
                <option key={genre.value} value={genre.value}>{genre.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="media-sort-filter" className="text-sm font-medium">Sort by</label>
            <select
              id="media-sort-filter"
              value={selectedSort}
              onChange={(event) => updateSortFilter(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {availableSortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end border-t pt-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-full"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  return (
    <main className="container py-4">
        {(showMovieCategories || showTVCategories) && (
          <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 sm:flex sm:gap-4">
            <h1 className="min-w-0 text-3xl font-bold tracking-tight">{showMovieCategories ? 'Movies' : 'TV Shows'}</h1>
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <MediaCategoryToggle
                label={showMovieCategories ? 'Movies' : 'TV shows'}
                options={showMovieCategories ? MOVIE_CATEGORIES : TV_CATEGORIES}
                value={selectedTabCategory}
                onChange={updateTabCategory}
                className="w-full sm:w-auto"
              />
            </div>
            <div className="col-start-2 row-start-1 shrink-0 sm:ml-auto">{filtersControl}</div>
          </div>
        )}
        {!showMovieCategories && !showTVCategories && (
          <div className={`mb-4 flex flex-wrap items-center gap-3 ${personMatch || isCompanyProviderCategory ? 'justify-between' : 'justify-end'}`}>
            {personMatch && (
              <MediaCategoryToggle
                label="Person media type"
                options={PERSON_MEDIA_OPTIONS}
                value={personType === 'movie' ? 'movies' : 'tv'}
                onChange={updatePersonMediaType}
                className="w-full sm:w-auto"
              />
            )}
            {isCompanyProviderCategory && (
              <MediaCategoryToggle
                label="Media type"
                options={[
                  { value: 'movie', label: 'Movies' },
                  { value: 'tv', label: 'TV Shows' },
                ]}
                value={itemType}
                onChange={updateMediaType}
              />
            )}
            {filtersControl}
          </div>
        )}
        
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
              <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 2xl:grid-cols-10">
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