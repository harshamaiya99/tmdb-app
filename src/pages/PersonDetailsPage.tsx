// src/pages/PersonDetailsPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaCard } from '@/components/MediaCard';
import { tmdbService, isActingCredit, type Person } from '@/lib/tmdb';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';
import { useTitle } from '@/contexts/TitleContext';

export function PersonDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setTitle } = useTitle();

  useEffect(() => {
    if (id) {
      fetchPersonDetails(parseInt(id));
      window.scrollTo(0, 0);
    }
  }, [id]);

  useEffect(() => {
    if (person) {
      setTitle(`${person.name}'s Profile`);
    }
  }, [person, setTitle]);

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

  // FIX: Safely calculate gallery images BEFORE conditional returns
  const galleryImages = (person?.images?.profiles || []).filter((image) => image.file_path);

  const openImage = (index: number) => setSelectedImageIndex(index);
  const closeImage = () => setSelectedImageIndex(null);

  // FIX: Move the Keyboard Event Listener hook to the top level!
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      
      if (e.key === 'ArrowRight') {
        setSelectedImageIndex(prev => 
          prev === null ? null : (prev === galleryImages.length - 1 ? 0 : prev + 1)
        );
      } else if (e.key === 'ArrowLeft') {
        setSelectedImageIndex(prev => 
          prev === null ? null : (prev === 0 ? galleryImages.length - 1 : prev - 1)
        );
      } else if (e.key === 'Escape') {
        closeImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImageIndex, galleryImages.length]);

  // NOW we can safely have our conditional loading and error returns
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

  const credits = person.combined_credits?.cast || [];
  const movieCredits = credits
    .filter((credit) => credit.media_type === 'movie' && credit.poster_path && isActingCredit(credit.character, credit.name || credit.title))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 8);

  const tvCredits = credits
    .filter((credit) => credit.media_type === 'tv' && credit.poster_path && isActingCredit(credit.character, credit.name || credit.title))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 8);

  const selectedImage = selectedImageIndex === null ? null : galleryImages[selectedImageIndex] ?? null;

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        <div className="space-y-8">
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

              {(movieCredits.length > 0 || tvCredits.length > 0) && (
                <div className="pt-8 border-t space-y-8">
                  {movieCredits.length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Movies</h2>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/category/person-${person.id}-movies`)}>
                          View More
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                        {movieCredits.map((credit, idx) => (
                          <MediaCard
                            key={`${credit.id}-${idx}`}
                            item={credit}
                            type={credit.media_type}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {tvCredits.length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">TV Shows</h2>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/category/person-${person.id}-tv`)}>
                          View More
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
                        {tvCredits.map((credit, idx) => (
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
              )}
            </div>
          </div>

          {galleryImages.length > 0 && (
            <div className="pt-8 border-t w-full">
              <h2 className="text-2xl font-semibold mb-6">Gallery</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10">
                {galleryImages.map((image, idx) => {
                  const imageUrl = tmdbService.getImageUrl(image.file_path, 'w500');

                  return (
                    <button
                      key={`${image.file_path}-${idx}`}
                      type="button"
                      onClick={() => openImage(idx)}
                      className="overflow-hidden rounded-xl border bg-muted text-left hover:ring-2 hover:ring-primary transition-all group"
                    >
                      <img
                        src={imageUrl}
                        alt={`${person.name} gallery ${idx + 1}`}
                        className="aspect-[2/3] w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* The Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 px-3 py-4 sm:px-6 backdrop-blur-sm"
            onClick={closeImage}
          >
            <div className="relative flex w-full max-w-7xl flex-col rounded-2xl p-2" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-white/70">
                  {selectedImageIndex! + 1} / {galleryImages.length}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeImage}
                  className="rounded-full border border-white/10 bg-black/50 text-white shadow-lg backdrop-blur-md hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 sm:gap-4" onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setSelectedImageIndex(prev => prev === null ? null : (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                  className="rounded-full h-10 w-10 shrink-0 border-white/20 bg-black/50 text-white hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <img
                  src={tmdbService.getImageUrl(selectedImage.file_path, 'original')}
                  alt={`${person.name} gallery ${selectedImageIndex! + 1}`}
                  className="max-h-[85vh] w-full rounded-xl object-contain shadow-2xl"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setSelectedImageIndex(prev => prev === null ? null : (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                  className="rounded-full h-10 w-10 shrink-0 border-white/20 bg-black/50 text-white hover:bg-white/10 hover:text-white"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}