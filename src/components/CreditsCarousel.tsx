import { Link } from 'react-router-dom';
import { tmdbService } from '@/lib/tmdb';

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
  const cards: CreditPerson[] = people.map((person) => ({
    id: person.id,
    name: person.name,
    profile_path: person.profile_path,
    role: type === 'cast' ? person.character : person.job,
  }));

  return (
    <div className="relative after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-background after:to-transparent">
      <div
        className="flex gap-3 overflow-x-auto pb-4 pr-8 snap-x snap-mandatory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        tabIndex={0}
        role="region"
        aria-label={`${type === 'cast' ? 'Cast' : 'Crew'} credits`}
      >
        {cards.map((person) => (
          <Link
            key={person.id}
            to={`/person/${person.id}`}
            className="w-[75px] shrink-0 snap-start text-center group block"
          >
            <div className="overflow-hidden rounded-md border bg-muted">
              {person.profile_path ? (
                <img
                  src={tmdbService.getImageUrl(person.profile_path, 'w500')}
                  alt={person.name}
                  loading="lazy"
                  className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full aspect-[2/3] flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">No image</span>
                </div>
              )}
            </div>
            <div className="mt-1">
              <p className="text-xs font-medium line-clamp-1 group-hover:text-primary transition-colors">{person.name}</p>
              <p className="text-[10px] text-muted-foreground break-words leading-tight">{person.role}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
