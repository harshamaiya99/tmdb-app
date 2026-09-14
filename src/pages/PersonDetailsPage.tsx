// src/pages/PersonDetailsPage.tsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaSection } from '@/components/MediaSection';
import { tmdbService, isActingCredit, type Person } from '@/lib/tmdb';
import { formatDate } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { LazySection } from '@/components/LazySection';
import { TMDBImage } from '@/components/TMDBImage';
import { searchWikimediaImages, type WikimediaImage } from '@/lib/wikimedia';

export function PersonDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedWikimediaIndex, setSelectedWikimediaIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const galleryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  const personQuery = useCachedQuery<Person>(
    `person:${id ?? 'none'}`,
    (signal) => tmdbService.getPersonDetails(Number(id), { signal }),
    { enabled: Boolean(id), ttlMs: 30 * 60 * 1000 },
  );
  const person = personQuery.data ?? null;
  const wikimediaQuery = useCachedQuery<WikimediaImage[]>(
    `wikimedia-person:${id ?? 'none'}`,
    (signal) => searchWikimediaImages(person?.name ?? '', signal),
    { enabled: Boolean(person?.name), ttlMs: 30 * 60 * 1000 },
  );

  usePageTitle(person ? `${person.name}'s Profile` : 'Person Details');

  // FIX: Safely calculate gallery images BEFORE conditional returns
  const galleryImages = (person?.images?.profiles || []).filter((image) => image.file_path);

  const openImage = (index: number) => {
    galleryTriggerRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    setSelectedWikimediaIndex(null);
    setSelectedImageIndex(index);
  };
  const openWikimediaImage = (index: number) => {
    galleryTriggerRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    setSelectedImageIndex(null);
    setSelectedWikimediaIndex(index);
  };
  const closeImage = () => {
    setSelectedImageIndex(null);
    setSelectedWikimediaIndex(null);
  };

  useEffect(() => {
    if (selectedImageIndex !== null || selectedWikimediaIndex !== null) {
      dialogRef.current?.focus();
    } else {
      galleryTriggerRef.current?.focus();
    }
  }, [selectedImageIndex, selectedWikimediaIndex]);

  // FIX: Move the Keyboard Event Listener hook to the top level!
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null && selectedWikimediaIndex === null) return;

      if (e.key === 'ArrowRight' && selectedImageIndex !== null) {
        setSelectedImageIndex(prev => 
          prev === null ? null : (prev === galleryImages.length - 1 ? 0 : prev + 1)
        );
      } else if (e.key === 'ArrowLeft' && selectedImageIndex !== null) {
        setSelectedImageIndex(prev => 
          prev === null ? null : (prev === 0 ? galleryImages.length - 1 : prev - 1)
        );
      } else if (e.key === 'ArrowRight' && selectedWikimediaIndex !== null) {
        setSelectedWikimediaIndex(prev =>
          prev === null ? null : (prev === wikimediaQuery.data!.length - 1 ? 0 : prev + 1)
        );
      } else if (e.key === 'ArrowLeft' && selectedWikimediaIndex !== null) {
        setSelectedWikimediaIndex(prev =>
          prev === null ? null : (prev === 0 ? wikimediaQuery.data!.length - 1 : prev - 1)
        );
      } else if (e.key === 'Escape') {
        closeImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImageIndex, selectedWikimediaIndex, galleryImages.length, wikimediaQuery.data]);

  // NOW we can safely have our conditional loading and error returns
  if (personQuery.loading) {
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

  if (personQuery.error || !person) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">{personQuery.error?.message ?? 'Person not found'}</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

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
  const selectedWikimediaImage = selectedWikimediaIndex === null
    ? null
    : wikimediaQuery.data?.[selectedWikimediaIndex] ?? null;

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        <div className="space-y-8">
          <div className="grid md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr] gap-8">
            {/* Left Column: Profile Picture & Personal Info */}
            <div className="space-y-6">
              {person.profile_path ? (
                <TMDBImage
                  path={person.profile_path}
                  alt={`${person.name} profile`}
                  width={500}
                  height={750}
                  sizes="(min-width: 1024px) 300px, (min-width: 768px) 250px, 80vw"
                  loading="eager"
                  fetchPriority="high"
                  className="w-full rounded-xl border bg-muted shadow-sm"
                />
              ) : (
                <div className="aspect-[2/3] bg-muted rounded-xl border flex items-center justify-center">
                  <span role="img" aria-label={`${person.name} profile unavailable`} className="text-muted-foreground">Profile unavailable</span>
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
                    <MediaSection
                      title="Movies"
                      items={movieCredits}
                      type="movie"
                      className="space-y-4"
                      gridClassName="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
                      category={`person-${person.id}-movies`}
                      hideSeeMore={false}
                    />
                  )}

                  {tvCredits.length > 0 && (
                    <MediaSection
                      title="TV Shows"
                      items={tvCredits}
                      type="tv"
                      className="space-y-4"
                      gridClassName="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8"
                      category={`person-${person.id}-tv`}
                      hideSeeMore={false}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {galleryImages.length > 0 && (
            <LazySection>
            <div className="w-full border-t pt-8">
              <h2 className="text-2xl font-semibold mb-6">Gallery</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 2xl:grid-cols-10">
                {galleryImages.map((image, idx) => {
                  return (
                    <button
                      key={`${image.file_path}-${idx}`}
                      type="button"
                      onClick={() => openImage(idx)}
                      className="overflow-hidden rounded-xl border bg-muted text-left hover:ring-2 hover:ring-primary transition-all group"
                    >
                      <TMDBImage
                        path={image.file_path}
                        alt={`${person.name} gallery ${idx + 1}`}
                        width={image.width}
                        height={image.height}
                        sizes="(min-width: 1536px) 9vw, (min-width: 1024px) 18vw, (min-width: 640px) 30vw, 45vw"
                        className="aspect-[2/3] w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            </LazySection>
          )}

          {wikimediaQuery.data && wikimediaQuery.data.length > 0 && (
            <LazySection>
              <section className="w-full border-t pt-8" aria-labelledby="wikimedia-gallery-heading">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <h2 id="wikimedia-gallery-heading" className="text-2xl font-semibold">Wikimedia Commons</h2>
                  <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">External source</span>
                </div>
                <p className="mb-5 text-sm text-muted-foreground">
                  Additional images from Wikimedia Commons. Select an image to view its source and licensing details.
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 2xl:grid-cols-10">
                  {wikimediaQuery.data.map((image, idx) => (
                    <button
                      key={image.pageUrl}
                      type="button"
                      onClick={() => openWikimediaImage(idx)}
                      className="group overflow-hidden rounded-xl border bg-muted shadow-sm transition hover:ring-2 hover:ring-primary"
                    >
                      <img
                        src={image.thumbnailUrl}
                        alt={image.description || `${person.name} from Wikimedia Commons`}
                        width={image.width}
                        height={image.height}
                        loading="lazy"
                        className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </section>
            </LazySection>
          )}
        </div>

        {/* The Lightbox */}
        {(selectedImage || selectedWikimediaImage) && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 px-3 py-4 sm:px-6 backdrop-blur-sm"
            onClick={closeImage}
            role="presentation"
          >
            <div
              ref={dialogRef}
              className="relative flex w-full max-w-7xl flex-col rounded-2xl p-2 outline-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="gallery-dialog-title"
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <p id="gallery-dialog-title" className="text-sm font-medium text-white/70">
                  {selectedWikimediaImage
                    ? `Wikimedia Commons: ${selectedWikimediaIndex! + 1} / ${wikimediaQuery.data?.length ?? 0}`
                    : `TMDB: ${selectedImageIndex! + 1} / ${galleryImages.length}`}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeImage}
                  aria-label="Close gallery"
                  title="Close gallery"
                  className="rounded-full border border-white/10 bg-black/50 text-white shadow-lg backdrop-blur-md hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 sm:gap-4" onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    if (selectedWikimediaIndex !== null) {
                      setSelectedWikimediaIndex((prev) => prev === null || !wikimediaQuery.data
                        ? null
                        : (prev === 0 ? wikimediaQuery.data.length - 1 : prev - 1));
                    } else {
                      setSelectedImageIndex((prev) => prev === null
                        ? null
                        : (prev === 0 ? galleryImages.length - 1 : prev - 1));
                    }
                  }}
                  aria-label="Previous gallery image"
                  title="Previous gallery image"
                  className="rounded-full h-10 w-10 shrink-0 border-white/20 bg-black/50 text-white hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {selectedWikimediaImage ? (
                  <img
                    src={selectedWikimediaImage.originalUrl}
                    alt={selectedWikimediaImage.description || `${person.name} from Wikimedia Commons`}
                    width={selectedWikimediaImage.width}
                    height={selectedWikimediaImage.height}
                    className="max-h-[85vh] w-full rounded-xl object-contain shadow-2xl"
                  />
                ) : selectedImage ? (
                  <TMDBImage
                    path={selectedImage.file_path}
                    alt={`${person.name} gallery ${selectedImageIndex! + 1}`}
                    width={selectedImage.width}
                    height={selectedImage.height}
                    sizes="min(90vw, 1200px)"
                    loading="eager"
                    className="max-h-[85vh] w-full rounded-xl object-contain shadow-2xl"
                  />
                ) : null}
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    if (selectedWikimediaIndex !== null) {
                      setSelectedWikimediaIndex((prev) => prev === null || !wikimediaQuery.data
                        ? null
                        : (prev === wikimediaQuery.data.length - 1 ? 0 : prev + 1));
                    } else {
                      setSelectedImageIndex((prev) => prev === null
                        ? null
                        : (prev === galleryImages.length - 1 ? 0 : prev + 1));
                    }
                  }}
                  aria-label="Next gallery image"
                  title="Next gallery image"
                  className="rounded-full h-10 w-10 shrink-0 border-white/20 bg-black/50 text-white hover:bg-white/10 hover:text-white"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
              {selectedWikimediaImage && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-white/70">
                  <span>{[selectedWikimediaImage.license, selectedWikimediaImage.artist].filter(Boolean).join(' · ') || 'Wikimedia Commons image'}</span>
                  <a
                    href={selectedWikimediaImage.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline underline-offset-2 hover:text-white/80"
                  >
                    View source
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}