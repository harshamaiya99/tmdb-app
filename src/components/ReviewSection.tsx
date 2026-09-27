import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Star, ChevronDown, FilterX } from 'lucide-react';
import { Button } from './ui/button';
import { Review, tmdbService } from '../lib/tmdb';
import { formatDate } from '../lib/utils';

interface ReviewSectionProps {
  reviews: Review[];
  mediaId: number;
  mediaType: 'movie' | 'tv';
  totalPages: number;
}

export function ReviewSection({ reviews: initialReviews, mediaId, mediaType, totalPages }: ReviewSectionProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [visibleCount, setVisibleCount] = useState(5); 
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  // Track the currently active rating filter (1-10)
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    requestController.current?.abort();
    setReviews(initialReviews);
    setVisibleCount(5);
    setExpandedReviewId(null);
    setRatingFilter(null);
    setCurrentPage(1);
    setLoadError(null);
  }, [initialReviews, mediaId, mediaType]);

  useEffect(() => () => requestController.current?.abort(), []);

  if (!reviews || reviews.length === 0) return null;

  const totalReviews = reviews.length;
  const distribution: Record<number, number> = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratedReviewsCount = 0;

  // Calculate distribution based on ALL reviews (unfiltered)
  reviews.forEach((r) => {
    const rating = r.author_details?.rating;
    if (rating) {
      ratedReviewsCount++;
      const roundedRating = Math.round(rating);
      if (roundedRating >= 1 && roundedRating <= 10) {
        distribution[roundedRating]++;
      }
    }
  });

  // Filter reviews based on the active selection
  const filteredReviews = ratingFilter 
    ? reviews.filter((r) => r.author_details?.rating && Math.round(r.author_details.rating) === ratingFilter)
    : reviews;

  const toggleExpand = (id: string) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => {
          setExpandedReviewId((prev) => (prev === id ? null : id));
        });
      });
    } else {
      setExpandedReviewId((prev) => (prev === id ? null : id));
    }
  };

  const toggleFilter = (star: number) => {
    // Prevent filtering if there are no reviews for that star rating
    if (distribution[star] === 0) return;

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => {
          setRatingFilter((prev) => (prev === star ? null : star));
          setVisibleCount(5); // Reset visible count when filter changes
          setExpandedReviewId(null); // Close any expanded review
        });
      });
    } else {
      setRatingFilter((prev) => (prev === star ? null : star));
      setVisibleCount(5);
      setExpandedReviewId(null);
    }
  };

  const loadMoreReviews = async () => {
    if (loadingMore) return;

    if (visibleCount < filteredReviews.length) {
      setVisibleCount((prev) => prev + 6);
      return;
    }

    if (currentPage >= totalPages) return;

    const nextPage = currentPage + 1;
    const controller = new AbortController();
    requestController.current?.abort();
    requestController.current = controller;
    setLoadingMore(true);
    setLoadError(null);

    try {
      const response = mediaType === 'movie'
        ? await tmdbService.getMovieReviews(mediaId, nextPage, { signal: controller.signal })
        : await tmdbService.getTVShowReviews(mediaId, nextPage, { signal: controller.signal });

      setReviews((previous) => {
        const existingIds = new Set(previous.map((review) => review.id));
        return [...previous, ...response.results.filter((review) => !existingIds.has(review.id))];
      });
      setCurrentPage(response.page);
      setVisibleCount((prev) => prev + 6);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load more reviews.');
      }
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  };

  const getRatingColor = (rating: number | null) => {
    if (!rating) return 'text-muted-foreground bg-muted';
    if (rating >= 8) return 'text-emerald-500 bg-emerald-500/10';
    if (rating >= 5) return 'text-amber-500 bg-amber-500/10';
    return 'text-rose-500 bg-rose-500/10';
  };

  const formatReviewContent = (content: string) =>
    content.replace(
      /(^|[\s(])((?:https?:\/\/|www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s<>'")]+)?)(?=$|[\s).,;!?])/gi,
      (_match, prefix, url) => {
        const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        return `${prefix}[${url}](${normalizedUrl})`;
      }
    );

  return (
    <div className="mt-12 mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Reviews</h2>
        {/* Quick clear filter button shown only when a filter is active */}
        {ratingFilter && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => toggleFilter(ratingFilter)}
            className="text-muted-foreground hover:text-foreground"
          >
            <FilterX className="w-4 h-4 mr-2" />
            Clear Filter
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 grid-flow-row-dense auto-rows-[240px]">
        
        {/* Rating Chart */}
        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center gap-4 col-span-1 row-span-1">
          <div className="flex flex-col items-center justify-center min-w-[70px]">
            <div className="text-4xl font-bold text-primary">{totalReviews}</div>
            <div className="text-xs text-muted-foreground mt-1 text-center">Total<br/>Reviews</div>
          </div>
          
          {/* Removed space-y gaps to shrink it vertically so it fits the 240px box perfectly */}
          <div className="flex-1 w-full flex flex-col justify-center space-y-0">
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star];
              const percentage = ratedReviewsCount > 0 ? (count / ratedReviewsCount) * 100 : 0;
              const isSelectable = count > 0;
              const isActive = ratingFilter === star;
              const isDimmed = ratingFilter !== null && !isActive;

              return (
                <button
                  type="button"
                  key={star} 
                  onClick={() => toggleFilter(star)}
                  disabled={!isSelectable}
                  aria-label={`${count} reviews rated ${star} out of 10`}
                  aria-pressed={isActive}
                  className={`flex items-center gap-2 text-[11px] px-2 py-0.5 -mx-2 rounded-md transition-all duration-200
                    ${isSelectable ? 'cursor-pointer hover:bg-muted/80' : 'cursor-default opacity-40'}
                    ${isActive ? 'bg-muted ring-1 ring-border shadow-sm' : ''}
                    ${isDimmed ? 'opacity-30' : ''}
                  `}
                >
                  <div className="w-6 flex items-center justify-end gap-1 text-muted-foreground font-medium shrink-0">
                    {star} <Star className="w-2.5 h-2.5 fill-current" />
                  </div>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-4 text-right text-muted-foreground font-medium shrink-0">
                    {count}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty State when a filter yields no results (edge case, but good to have) */}
        {filteredReviews.length === 0 && (
          <div className="p-5 rounded-xl border border-dashed flex items-center justify-center col-span-1 md:col-span-2 text-muted-foreground text-sm">
            No reviews found for {ratingFilter} stars.
          </div>
        )}

        {/* Reviews - Now looping over filteredReviews */}
        {filteredReviews.slice(0, visibleCount).map((review) => {
          const isExpanded = expandedReviewId === review.id;
          
          const isLong = review.content.length > 200; 
          const needsTwoRows = review.content.length > 400; 

          let spanClasses = 'col-span-1 row-span-1';
          if (isExpanded) {
            spanClasses = needsTwoRows 
              ? 'md:col-span-2 md:row-span-2' 
              : 'md:col-span-2 md:row-span-1'; 
          }

          return (
            <div 
              key={review.id}
              style={{ viewTransitionName: `review-card-${review.id}` }} 
              onClick={() => isLong && toggleExpand(review.id)}
              className={`p-5 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col cursor-pointer transition-colors hover:border-muted-foreground/30 ${spanClasses} ${isLong ? 'select-none' : ''}`}
              role={isLong ? 'button' : undefined}
              tabIndex={isLong ? 0 : undefined}
              onKeyDown={(event) => {
                if (isLong && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  toggleExpand(review.id);
                }
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary uppercase text-sm">
                    {review.author.charAt(0)}
                  </div>
                  <span className="font-semibold text-sm line-clamp-1">{review.author}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground/70">
                    {formatDate(review.created_at)}
                  </span>
                  {review.author_details?.rating && (
                    <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-bold shrink-0 ${getRatingColor(review.author_details.rating)}`}>
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{review.author_details.rating}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 mt-3 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                <div id={`review-content-${review.id}`} className={`markdown-body text-sm text-muted-foreground ${!isExpanded ? 'line-clamp-4' : ''}`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      a: ({ href, children, ...props }) => (
                        <a
                          {...props}
                          href={href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-primary underline underline-offset-2 break-all hover:text-primary/80"
                        >
                          {children}
                        </a>
                      ),
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
                      h1: ({ children }) => <h1 className="text-base font-bold mt-4 mb-2 text-foreground">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold mt-4 mb-2 text-foreground">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-2 text-foreground">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-border pl-3 my-2 text-foreground/80 italic">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children, className }) => (
                        <code className={`${className ?? ''} rounded bg-muted px-1 py-0.5 text-[0.8em] text-foreground`}>
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="overflow-x-auto rounded-md bg-muted p-3 my-2 text-xs text-foreground">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {formatReviewContent(review.content)}
                  </ReactMarkdown>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* View More Button */}
      {(visibleCount < filteredReviews.length || currentPage < totalPages) && (
        <div className="flex justify-center mt-8">
          <Button 
            variant="outline" 
            onClick={() => {
              if (document.startViewTransition) {
                document.startViewTransition(() => flushSync(() => { void loadMoreReviews(); }));
              } else {
                void loadMoreReviews();
              }
            }}
            className="rounded-full px-6"
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'View More'} <ChevronDown className="ml-2 w-4 h-4" />
          </Button>
        </div>
      )}
      {loadError && (
        <div className="flex flex-col items-center gap-2 mt-4 text-sm text-destructive">
          <p>{loadError}</p>
          <Button variant="ghost" size="sm" onClick={() => void loadMoreReviews()} disabled={loadingMore}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}