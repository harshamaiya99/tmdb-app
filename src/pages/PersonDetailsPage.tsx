// src/pages/PersonDetailsPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaCard } from '@/components/MediaCard';
import { tmdbService, type Person } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

export function PersonDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchPersonDetails(parseInt(id));
      window.scrollTo(0, 0);
    }
  }, [id]);

  const fetchPersonDetails = async (personId: number) => {
    try {
      setLoading(true);
      const data = await tmdbService.getPersonDetails(personId);
      setPerson(data);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load person details',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container py-6 space-y-6">
          <Skeleton className="h-8 w-24" />
          <div className="grid md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr] gap-8">
            <Skeleton className="aspect-[2/3] rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Person not found</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const profileUrl = tmdbService.getImageUrl(person.profile_path, 'original');
  const birthDate = formatDate(person.birthday);
  const deathDate = formatDate(person.deathday);

  // Filter out credits without images and sort by popularity
  const knownFor = person.combined_credits?.cast
    ?.filter((credit) => credit.poster_path)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 20) || [];

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr] gap-8">
          {/* Left Column: Profile Picture & Personal Info */}
          <div className="space-y-6">
            {profileUrl ? (
              <img
                src={profileUrl}
                alt={person.name}
                className="w-full rounded-xl border bg-muted shadow-sm"
              />
            ) : (
              <div className="aspect-[2/3] bg-muted rounded-xl border flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
            
            <div className="space-y-4 text-sm bg-card p-4 rounded-xl border shadow-sm">
              <h3 className="font-semibold text-lg border-b pb-2">Personal Info</h3>
              
              <div>
                <p className="font-medium">Known For</p>
                <p className="text-muted-foreground">{person.known_for_department}</p>
              </div>
              
              {birthDate && (
                <div>
                  <p className="font-medium flex items-center gap-1"><Calendar className="w-4 h-4" /> Born</p>
                  <p className="text-muted-foreground">{birthDate}</p>
                </div>
              )}

              {deathDate && (
                <div>
                  <p className="font-medium flex items-center gap-1"><Calendar className="w-4 h-4" /> Died</p>
                  <p className="text-muted-foreground">{deathDate}</p>
                </div>
              )}

              {person.place_of_birth && (
                <div>
                  <p className="font-medium flex items-center gap-1"><MapPin className="w-4 h-4" /> Place of Birth</p>
                  <p className="text-muted-foreground">{person.place_of_birth}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Biography & Known For Grid */}
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                {person.name}
              </h1>
              
              {person.biography && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Biography</h2>
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">
                    {person.biography}
                  </div>
                </div>
              )}
            </div>

            {knownFor.length > 0 && (
              <div className="pt-8 border-t">
                <h2 className="text-2xl font-semibold mb-6">Known For</h2>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {knownFor.map((credit, idx) => (
                    <MediaCard 
                      key={`${credit.id}-${idx}`} 
                      item={credit} 
                      type={credit.media_type} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}