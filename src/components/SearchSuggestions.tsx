import { Link } from 'react-router-dom';
import { TMDBImage } from '@/components/TMDBImage';
import { tmdbService } from '@/lib/tmdb';
import { useCachedQuery } from '@/hooks/useCachedQuery';

export function SearchSuggestionsLoading({ id = 'search-suggestions' }: { id?: string }) {
  return (
    <div
      id={id}
      role="listbox"
      aria-label="Search suggestions"
      className="absolute left-0 right-0 top-full z-50 mt-2 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
    >
      <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
    </div>
  );
}

export function SearchSuggestions({
  query,
  onSelect,
  id = 'search-suggestions',
}: {
  query: string;
  onSelect: () => void;
  id?: string;
}) {
  const suggestions = useCachedQuery(
    `search:suggestions:${query}:1`,
    (signal) => tmdbService.searchMulti(query, 1, { signal }),
  );

  const results = suggestions.data?.results.slice(0, 6) ?? [];

  return (
    <div
      id={id}
      role="listbox"
      aria-label="Search suggestions"
      className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {suggestions.loading ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
      ) : suggestions.error ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">Suggestions unavailable. Press Enter to search.</p>
      ) : results.length ? (
        results.map((item) => {
          const title = item.media_type === 'movie' ? item.title : item.name;
          const imagePath = item.media_type === 'person' ? item.profile_path : item.poster_path;
          const date = item.media_type === 'movie' ? item.release_date : item.media_type === 'tv' ? item.first_air_date : '';
          const year = date ? new Date(date).getFullYear() : null;
          const subtitle = item.media_type === 'person'
            ? item.known_for_department || 'Person'
            : `${item.media_type === 'tv' ? 'TV show' : 'Movie'}${year && !Number.isNaN(year) ? ` · ${year}` : ''}`;

          return (
            <Link
              key={`${item.media_type}:${item.id}`}
              to={`/${item.media_type}/${item.id}`}
              role="option"
              aria-label={`${title}, ${subtitle}`}
              onClick={onSelect}
              className="flex items-center gap-3 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
            >
              <div className="flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-[10px] text-muted-foreground">
                <TMDBImage
                  path={imagePath}
                  alt=""
                  width={45}
                  height={68}
                  sizes="36px"
                  className="h-full w-full object-cover"
                />
                {!imagePath && <span aria-hidden="true">N/A</span>}
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{title}</span>
                <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
              </span>
            </Link>
          );
        })
      ) : (
        <p className="px-3 py-2 text-sm text-muted-foreground">No suggestions found. Press Enter to search.</p>
      )}
    </div>
  );
}
