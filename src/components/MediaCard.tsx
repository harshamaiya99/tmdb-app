// src/components/MediaCard.tsx

import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tmdbService, type Movie, type TVShow, type PersonCredit } from '@/lib/tmdb';

interface MediaCardProps {
  item: Movie | TVShow | PersonCredit;
  type: 'movie' | 'tv';
}

export function MediaCard({ item, type }: MediaCardProps) {
  const title = 'title' in item && item.title ? item.title : ('name' in item ? item.name : '');
  const date = 'release_date' in item && item.release_date ? item.release_date : ('first_air_date' in item ? item.first_air_date : undefined);
  const year = date ? new Date(date).getFullYear() : null;
  const rating = item.vote_average.toFixed(1);
  const imageUrl = tmdbService.getImageUrl(item.poster_path);

  return (
    <Link to={`/${type}/${item.id}`}>
      <Card className="overflow-hidden border-0 bg-card transition-all hover:shadow-lg group">
        <div className="relative aspect-[2/3] overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="gap-1">
              <Star className="w-3 h-3 fill-current" />
              {rating}
            </Badge>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">{title}</h3>
          {year && (
            <p className="text-[11px] text-muted-foreground mt-1">{year}</p>
          )}
          {'character' in item && item.character && (
            <p className="text-[10px] text-muted-foreground mt-1 italic line-clamp-1">as {item.character}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}