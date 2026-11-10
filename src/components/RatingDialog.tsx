import { useEffect, useId, useRef, type MouseEvent } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RatingDialogProps {
  open: boolean;
  title: string;
  subtitle: string;
  detail?: string;
  currentRating: number | null;
  hoveredRating: number | null;
  pendingRating: number | null;
  setHoveredRating: (rating: number | null) => void;
  onClose: () => void;
  onRate: (rating: number) => void;
  onRemove: () => void;
  overlayZIndex?: '100' | '110';
}

function getRatingFromPointer(event: MouseEvent<HTMLButtonElement>, starNumber: number) {
  const rect = event.currentTarget.getBoundingClientRect();
  const isLeftHalf = event.clientX - rect.left < rect.width / 2;
  return Math.min(10, Math.max(0.5, isLeftHalf ? starNumber - 0.5 : starNumber));
}

export function RatingDialog({
  open,
  title,
  subtitle,
  detail,
  currentRating,
  hoveredRating,
  pendingRating,
  setHoveredRating,
  onClose,
  onRate,
  onRemove,
  overlayZIndex = '100',
}: RatingDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const overlayClassName = overlayZIndex === '110' ? 'z-[110]' : 'z-[100]';

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${overlayClassName} flex items-center justify-center bg-black/60 p-4`}
      onClick={(event) => {
        if (event.target === event.currentTarget && pendingRating === null) onClose();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape' && pendingRating === null) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border bg-background p-5 shadow-xl sm:p-6"
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
          </div>
          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close rating dialog"
            disabled={pendingRating !== null}
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </header>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-1 rounded-lg border bg-muted/30 px-3 py-3" aria-live="polite">
            {Array.from({ length: 10 }, (_, index) => {
              const starNumber = index + 1;
              const activeRating = hoveredRating ?? currentRating ?? 0;
              const fill = Math.max(0, Math.min(1, activeRating - (starNumber - 1)));

              return (
                <button
                  key={starNumber}
                  type="button"
                  className="group relative h-8 w-8 rounded-sm text-amber-400 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={`${starNumber} star${starNumber === 1 ? '' : 's'}`}
                  disabled={pendingRating !== null}
                  onMouseEnter={(event) => setHoveredRating(getRatingFromPointer(event, starNumber))}
                  onMouseMove={(event) => setHoveredRating(getRatingFromPointer(event, starNumber))}
                  onMouseLeave={() => setHoveredRating(null)}
                  onFocus={() => setHoveredRating(starNumber)}
                  onClick={(event) => onRate(
                    event.detail === 0 ? starNumber : getRatingFromPointer(event, starNumber),
                  )}
                >
                  <Star aria-hidden="true" className="absolute inset-0 h-full w-full fill-muted-foreground/20 text-muted-foreground/30" />
                  <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                    <Star aria-hidden="true" className="h-full w-full fill-current text-amber-400" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{(hoveredRating ?? currentRating ?? 0).toFixed(1)} / 10</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentRating === null || pendingRating !== null}
              onClick={onRemove}
            >
              Remove rating
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
