import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MediaCard } from '@/components/MediaCard';
import { type Movie, type TVShow, type PersonCredit } from '@/lib/tmdb';

interface MediaSectionProps {
  title: string;
  items: (Movie | TVShow | PersonCredit)[];
  type: 'movie' | 'tv';
  category?: string;
  hideSeeMore?: boolean;
  limit?: number;
  className?: string;
  gridClassName?: string;
}

export function MediaSection({ title, items, type, category, hideSeeMore = false, limit = 10, className, gridClassName }: MediaSectionProps) {
  if (!items || items.length === 0) return null;

  const visibleItems = items.slice(0, limit);

  return (
    <section className={className ?? 'space-y-4'}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {!hideSeeMore && category && (
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/category/${category}`}>See More &rarr;</Link>
          </Button>
        )}
      </div>
      <div className={gridClassName ?? 'grid grid-cols-3 gap-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10'}>
        {visibleItems.map((item) => (
          <MediaCard key={item.id} item={item as Movie | TVShow | PersonCredit} type={type} />
        ))}
      </div>
    </section>
  );
}
