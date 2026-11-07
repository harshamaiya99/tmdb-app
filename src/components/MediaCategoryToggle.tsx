import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const MEDIA_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV shows' },
] as const;

export const MOVIE_CATEGORIES = [
  { value: 'trending-movies', label: 'Trending' },
  { value: 'popular-movies', label: 'Popular' },
  { value: 'trending-streaming-movies', label: 'Streaming' },
  { value: 'now-playing-movies', label: 'In Theaters' },
  { value: 'top-rated-movies', label: 'Top Rated' },
] as const;

export const TV_CATEGORIES = [
  { value: 'trending-tv', label: 'Trending' },
  { value: 'popular-tv', label: 'Popular' },
  { value: 'top-rated-tv', label: 'Top Rated' },
] as const;

export const PEOPLE_CATEGORIES = [
  { value: 'popular', label: 'Popular' },
  { value: 'trending', label: 'Trending' },
] as const;

interface MediaCategoryToggleProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function MediaCategoryToggle<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: MediaCategoryToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={`${label} category`}
      className={cn(
        'flex min-w-0 max-w-full items-center overflow-x-auto rounded-md border p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? 'selected' : 'ghost'}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="shrink-0"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
