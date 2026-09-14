import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TMDBImage } from '@/components/TMDBImage';

interface CreditPerson {
  id: number;
  name: string;
  profile_path: string | null;
  character?: string;
  job?: string;
  role?: string;
}

interface CreditsCarouselProps {
  people: CreditPerson[];
  type: 'cast' | 'crew';
}

export function CreditsCarousel({ people, type }: CreditsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const cards: CreditPerson[] = people.map((person) => ({
    id: person.id,
    name: person.name,
    profile_path: person.profile_path,
    role: type === 'cast' ? person.character : person.job,
  }));

  const scrollBy = (amount: number) => {
    scrollContainerRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const updateScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setCanScrollLeft(container.scrollLeft > 1);
    setCanScrollRight(maxScrollLeft - container.scrollLeft > 1);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener('scroll', updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [cards.length]);

  return (
    <div className="relative">
      <div className="relative min-w-0 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-background after:to-transparent">
      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto pb-4 pr-8 snap-x snap-mandatory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        tabIndex={0}
        role="region"
        aria-label={`${type === 'cast' ? 'Cast' : 'Crew'} credits`}
        onScroll={updateScrollState}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            scrollBy(-240);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            scrollBy(240);
          }
        }}
      >
        {cards.map((person) => (
          <Link
            key={person.id}
            to={`/person/${person.id}`}
            className="group block h-[174px] w-[75px] shrink-0 snap-start overflow-hidden text-center"
          >
            <div className="h-[112px] overflow-hidden rounded-md border bg-muted">
              {person.profile_path ? (
                <TMDBImage
                  path={person.profile_path}
                  alt={`${person.name} profile`}
                  width={500}
                  height={750}
                  sizes="75px"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">No image</span>
                </div>
              )}
            </div>
            <div className="mt-1 h-[57px] overflow-hidden">
              <p className="line-clamp-1 text-xs font-medium transition-colors group-hover:text-primary">{person.name}</p>
              <p className="line-clamp-3 break-words text-[10px] leading-tight text-muted-foreground">{person.role || 'Role unavailable'}</p>
            </div>
          </Link>
        ))}
      </div>
      </div>
      {canScrollLeft && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => scrollBy(-240)}
          aria-label={`Scroll ${type} credits left`}
          title={`Scroll ${type} credits left`}
          className="absolute left-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-background/90 shadow-md"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {canScrollRight && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => scrollBy(240)}
          aria-label={`Scroll ${type} credits right`}
          title={`Scroll ${type} credits right`}
          className="absolute right-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-background/90 shadow-md"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
