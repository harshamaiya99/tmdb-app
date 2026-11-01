import { Button } from '@/components/ui/button';

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
          variant={value === option.value ? 'default' : 'ghost'}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`shrink-0 ${value === option.value ? 'shadow-sm' : ''}`}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
