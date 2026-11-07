import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Star, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Review, tmdbService } from '../lib/tmdb';
import { formatDate } from '../lib/utils';

interface ReviewSectionProps {
  reviews: Review[];
  mediaId: number;
  mediaType: 'movie' | 'tv';
  totalPages: number;
}

type ReviewSortOrder = 'newest' | 'oldest' | 'highest-rated' | 'lowest-rated';

function isReviewSortOrder(value: string): value is ReviewSortOrder {
  return value === 'newest'
    || value === 'oldest'
    || value === 'highest-rated'
    || value === 'lowest-rated';
}

export function ReviewSection({ reviews: initialReviews, mediaId, mediaType, totalPages }: ReviewSectionProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [sortOrder, setSortOrder] = useState<ReviewSortOrder>('newest');
  const [visibleCount, setVisibleCount] = useState(5); 
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const mobileReviewAnchor = useRef<{ element: HTMLDivElement; top: number } | null>(null);

  useLayoutEffect(() => {
    const anchor = mobileReviewAnchor.current;
    if (!anchor) return;

    mobileReviewAnchor.current = null;
    const topDifference = anchor.element.getBoundingClientRect().top - anchor.top;
    if (topDifference !== 0) window.scrollBy(0, topDifference);
  }, [expandedReviewId]);

  useEffect(() => {
    requestController.current?.abort();
    setReviews(initialReviews);
    setSortOrder('newest');
    setVisibleCount(5);
    setExpandedReviewId(null);
    setSelectedReviewId(null);
    setCurrentPage(1);
    setLoadError(null);
  }, [initialReviews, mediaId, mediaType]);

  useEffect(() => () => requestController.current?.abort(), []);

  if (!reviews || reviews.length === 0) return null;

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOrder === 'newest' || sortOrder === 'oldest') {
      const dateDifference = Date.parse(a.created_at) - Date.parse(b.created_at);
      return sortOrder === 'newest' ? -dateDifference : dateDifference;
    }

    const aRating = a.author_details?.rating;
    const bRating = b.author_details?.rating;
    if (aRating == null && bRating != null) return 1;
    if (aRating != null && bRating == null) return -1;
    if (aRating != null && bRating != null && aRating !== bRating) {
      return sortOrder === 'highest-rated' ? bRating - aRating : aRating - bRating;
    }
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });

  const toggleExpand = (id: string, card: HTMLDivElement) => {
    const isDesktop = typeof window.matchMedia === 'function'
      && window.matchMedia('(min-width: 768px)').matches;

    setSelectedReviewId(null);

    if (!isDesktop) {
      mobileReviewAnchor.current = { element: card, top: card.getBoundingClientRect().top };
    }

    if (isDesktop && document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => {
          setExpandedReviewId((prev) => (prev === id ? null : id));
        });
      });
    } else {
      setExpandedReviewId((prev) => (prev === id ? null : id));
    }
  };

  const toggleShortReview = (id: string) => {
    if (expandedReviewId) {
      const expandedCard = document.getElementById(`review-card-${expandedReviewId}`);
      const isDesktop = typeof window.matchMedia === 'function'
        && window.matchMedia('(min-width: 768px)').matches;

      if (expandedCard instanceof HTMLDivElement && !isDesktop) {
        mobileReviewAnchor.current = {
          element: expandedCard,
          top: expandedCard.getBoundingClientRect().top,
        };
      }

      setExpandedReviewId(null);
    }

    setSelectedReviewId((previous) => (previous === id ? null : id));
  };

  const loadMoreReviews = async () => {
    if (loadingMore) return;

    if (visibleCount < reviews.length) {
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
    content.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*').replace(
      /(^|[\s(])((?:https?:\/\/|www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s<>'")]+)?)(?=$|[\s).,;!?])/gi,
      (_match, prefix, url) => {
        const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        return `${prefix}[${url}](${normalizedUrl})`;
      }
    );

  return (
    <div className="mt-12 mb-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Reviews</h2>
        <select
          aria-label="Sort reviews"
          value={sortOrder}
          onChange={(event) => {
            if (isReviewSortOrder(event.target.value)) setSortOrder(event.target.value);
          }}
          className="h-10 w-[170px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest-rated">Highest rated</option>
          <option value="lowest-rated">Lowest rated</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 grid-flow-row-dense auto-rows-[minmax(240px,auto)] md:auto-rows-[240px]">
        {sortedReviews.slice(0, visibleCount).map((review) => {
          const isExpanded = expandedReviewId === review.id;
          
          const isLong = review.content.length > 200; 
          const isSelected = selectedReviewId === review.id;
          const isHighlighted = isExpanded || isSelected;
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
              id={`review-card-${review.id}`}
              style={{ viewTransitionName: `review-card-${review.id}` }} 
              onClick={(event) => {
                if (isLong) {
                  toggleExpand(review.id, event.currentTarget);
                } else {
                  toggleShortReview(review.id);
                }
              }}
              className={`p-5 rounded-xl border ${isHighlighted ? 'border-primary/40 bg-primary/5' : 'bg-card'} text-card-foreground shadow-sm flex flex-col cursor-pointer transition-colors hover:border-muted-foreground/30 ${spanClasses} ${isLong ? 'select-none' : ''}`}
              role="button"
              tabIndex={0}
              aria-expanded={isLong ? isExpanded : undefined}
              aria-pressed={!isLong ? isSelected : undefined}
              aria-controls={isLong ? `review-content-${review.id}` : undefined}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  if (isLong) {
                    toggleExpand(review.id, event.currentTarget);
                  } else {
                    toggleShortReview(review.id);
                  }
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
              
              <div className={`mt-3 min-h-0 overflow-visible pr-2 md:overflow-y-auto custom-scrollbar ${isExpanded ? 'flex-none md:flex-1' : 'flex-1'}`}>
                <div id={`review-content-${review.id}`} className={`markdown-body text-sm text-muted-foreground ${!isExpanded ? 'line-clamp-6' : ''}`}>
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
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
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
      {(visibleCount < reviews.length || currentPage < totalPages) && (
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