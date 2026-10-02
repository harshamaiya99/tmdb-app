import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MediaCard } from '@/components/MediaCard';
import { type Movie, type TVShow, type PersonCredit, type PersonListResult } from '@/lib/tmdb';

interface MediaSectionProps {
  title: string;
  items: (Movie | TVShow | PersonCredit | PersonListResult)[];
  type: 'movie' | 'tv' | 'person';
  category?: string;
  hideSeeMore?: boolean;
  actionLabel?: string;
  limit?: number;
  className?: string;
  gridClassName?: string;
  horizontalScroll?: boolean;
  horizontalColumns?: 8 | 10;
}

export function MediaSection({ title, items, type, category, hideSeeMore = false, actionLabel = 'See More', limit = 10, className, gridClassName, horizontalScroll = false, horizontalColumns = 10 }: MediaSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [posterCenterY, setPosterCenterY] = useState<number | null>(null);
  const visibleItems = items.slice(0, limit);
  const updateScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setCanScrollLeft(container.scrollLeft > 1);
    setCanScrollRight(maxScrollLeft - container.scrollLeft > 1);

    const poster = container.querySelector('[data-media-card-poster]');
    if (poster) {
      const containerTop = container.getBoundingClientRect().top;
      const posterRect = poster.getBoundingClientRect();
      const centerY = Math.round(posterRect.top - containerTop + posterRect.height / 2);
      setPosterCenterY((current) => current === centerY ? current : centerY);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!horizontalScroll || !container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    updateScrollState();
    container.addEventListener('scroll', updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);
    const poster = container.querySelector('[data-media-card-poster]');
    if (poster) resizeObserver.observe(poster);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [horizontalScroll, visibleItems.length]);

  if (!items || items.length === 0) return null;

  const scrollBy = (direction: -1 | 1) => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: direction * container.clientWidth * 0.8, behavior: 'smooth' });
    }
  };

  const cards = visibleItems.map((item) => {
    const card = type === 'person' ? (
      <MediaCard key={item.id} item={item as PersonListResult} type="person" />
    ) : (
      <MediaCard key={item.id} item={item as Movie | TVShow | PersonCredit} type={type} />
    );

    return horizontalScroll ? (
      <div key={`scroll-${item.id}`} className="h-full snap-start">{card}</div>
    ) : card;
  });

  return (
    <section className={`min-w-0 ${className ?? 'space-y-4'}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {!hideSeeMore && category && (
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/category/${category}`}>{actionLabel} &rarr;</Link>
          </Button>
        )}
      </div>
      {horizontalScroll ? (
        <div className={`relative min-w-0 ${canScrollLeft ? 'before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-[1] before:w-8 before:bg-gradient-to-r before:from-background before:to-transparent' : ''} ${canScrollRight ? 'after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-[1] after:w-8 after:bg-gradient-to-l after:from-background after:to-transparent' : ''}`}>
          <div
            ref={scrollContainerRef}
            className={`grid min-w-0 grid-flow-col auto-cols-[calc((100%_-_1rem)/2)] gap-4 overflow-x-auto pb-4 pr-8 snap-x snap-mandatory sm:auto-cols-[calc((100%_-_2rem)/3)] md:auto-cols-[calc((100%_-_3rem)/4)] lg:auto-cols-[calc((100%_-_5rem)/6)] xl:auto-cols-[calc((100%_-_7rem)/8)] ${horizontalColumns === 10 ? '2xl:auto-cols-[calc((100%_-_9rem)/10)]' : '2xl:auto-cols-[calc((100%_-_7rem)/8)]'} [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
            tabIndex={0}
            role="region"
            aria-label={`${title || (type === 'person' ? 'People' : type === 'movie' ? 'Movies' : 'TV shows')} results`}
            onScroll={updateScrollState}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                scrollBy(event.key === 'ArrowLeft' ? -1 : 1);
              }
            }}
          >
            {cards}
          </div>
          {canScrollLeft && (
            <Button type="button" variant="outline" size="icon" onClick={() => scrollBy(-1)} aria-label={`Scroll ${title} left`} title={`Scroll ${title} left`} style={{ top: posterCenterY ?? '50%' }} className="absolute left-2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-background/90 shadow-md">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {canScrollRight && (
            <Button type="button" variant="outline" size="icon" onClick={() => scrollBy(1)} aria-label={`Scroll ${title} right`} title={`Scroll ${title} right`} style={{ top: posterCenterY ?? '50%' }} className="absolute right-2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-background/90 shadow-md">
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className={gridClassName ?? 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10'}>
          {cards}
        </div>
      )}
    </section>
  );
}
