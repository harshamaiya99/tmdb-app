import { tmdbService } from '@/lib/tmdb';

interface TMDBImageProps {
  path: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  title?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
}

export function TMDBImage({
  path,
  alt,
  width,
  height,
  className,
  sizes = '100vw',
  loading = 'lazy',
  fetchPriority,
  title,
}: TMDBImageProps) {
  if (!path) return null;

  return (
    <img
      src={tmdbService.getImageUrl(path)}
      srcSet={tmdbService.getImageSrcSet(path)}
      sizes={sizes}
      alt={alt}
      title={title}
      width={width}
      height={height}
      loading={loading}
      fetchPriority={fetchPriority}
      className={className}
    />
  );
}