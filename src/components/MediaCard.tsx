// src/components/MediaCard.tsx

import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Movie, type TVShow, type PersonCredit, type PersonListResult } from '@/lib/tmdb';
import { TMDBImage } from '@/components/TMDBImage';

type MediaCardProps =
  | { item: Movie | TVShow | PersonCredit; type: 'movie' | 'tv' }
  | { item: PersonListResult; type: 'person' };

export function MediaCard({ item, type }: MediaCardProps) {
  const isPerson = type === 'person';
  const title = isPerson ? item.name : ('title' in item && item.title ? item.title : ('name' in item ? item.name : ''));
  const imagePath = isPerson ? item.profile_path : item.poster_path;
  const date = isPerson ? undefined : ('release_date' in item && item.release_date ? item.release_date : ('first_air_date' in item ? item.first_air_date : undefined));
  const year = date ? new Date(date).getFullYear() : null;
  const rating = isPerson ? null : item.vote_average.toFixed(1);

  return (
    <Link to={isPerson ? `/person/${item.id}` : `/${type}/${item.id}`} className="block h-full">
      <Card className="group flex h-full flex-col overflow-hidden border-0 bg-card transition-all hover:shadow-lg">
        <div className="relative aspect-[2/3] shrink-0 overflow-hidden rounded-lg">
          {imagePath ? (
            <TMDBImage
              path={imagePath}
              alt={`${title} ${isPerson ? 'profile' : 'poster'}`}
              width={500}
              height={750}
              sizes="(min-width: 1536px) 9vw, (min-width: 1024px) 12vw, (min-width: 640px) 20vw, 30vw"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted px-2 text-center text-xs text-muted-foreground" role="img" aria-label={`${title} poster unavailable`}>
              Poster unavailable
            </div>
          )}
          {rating !== null && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="gap-1">
                <Star className="w-3 h-3 fill-current" />
                <span aria-label={`Rating ${rating} out of 10`}>{rating}</span>
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2.5">
          <h3
            className="h-[30px] shrink-0 overflow-hidden text-[12px] font-medium leading-[15px] break-words transition-colors group-hover:text-primary"
            style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
          >
            {title}
          </h3>
          {year && (
            <p className="text-[10px] text-muted-foreground">{year}</p>
          )}
          {isPerson && (
            <p className="line-clamp-1 text-[10px] text-muted-foreground">{item.known_for_department}</p>
          )}
          {'character' in item && item.character && (
            <p className="break-words text-[9px] leading-3 text-muted-foreground italic">as {item.character}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}