import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  buttonVariant?: 'outline' | 'ghost';
  buttonSize?: 'default' | 'sm';
  pageLabelClassName?: string;
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  className,
  buttonVariant = 'outline',
  buttonSize,
  pageLabelClassName,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-6 border-t pt-6', className)}
    >
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Previous
      </Button>
      <span className={cn('text-sm font-medium text-muted-foreground', pageLabelClassName)}>
        Page {page} of {totalPages}
      </span>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        Next
      </Button>
    </nav>
  );
}
