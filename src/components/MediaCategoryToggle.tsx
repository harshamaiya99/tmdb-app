import { Button } from '@/components/ui/button';

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

interface MediaCategoryToggleProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function MediaCategoryToggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: MediaCategoryToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={`${label} category`}
      className="flex max-w-full items-center overflow-x-auto rounded-md border p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
