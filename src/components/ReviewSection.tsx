import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Star, ChevronDown, FilterX } from 'lucide-react';
import { Button } from './ui/button';
import { Review } from '../lib/tmdb';

interface ReviewSectionProps {
  reviews: Review[];
}

export function ReviewSection({ reviews }: ReviewSectionProps) {
  const [visibleCount, setVisibleCount] = useState(5); 
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  // Track the currently active rating filter (1-10)
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

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

  const getRatingColor = (rating: number | null) => {
    if (!rating) return 'text-muted-foreground bg-muted';
    if (rating >= 8) return 'text-emerald-500 bg-emerald-500/10';
    if (rating >= 5) return 'text-amber-500 bg-amber-500/10';
    return 'text-rose-500 bg-rose-500/10';
  };

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
                <div 
                  key={star} 
                  onClick={() => toggleFilter(star)}
                  // py-0.5 keeps it super compact vertically.
                  // px-2 and -mx-2 give the background horizontal breathing room without shifting the text.
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
                </div>
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
              className={`p-5 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col ${spanClasses}`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary uppercase text-sm">
                    {review.author.charAt(0)}
                  </div>
                  <span className="font-semibold text-sm line-clamp-1">{review.author}</span>
                </div>
                {review.author_details?.rating && (
                  <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-bold shrink-0 ${getRatingColor(review.author_details.rating)}`}>
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{review.author_details.rating}</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 mt-3 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${!isExpanded ? 'line-clamp-4' : ''}`}>
                  {review.content}
                </p>
                {isLong && (
                  <button 
                    onClick={() => toggleExpand(review.id)} 
                    className="text-primary hover:text-primary/80 font-medium text-xs mt-2 transition-colors"
                  >
                    {isExpanded ? 'Read less' : 'Read more...'}
                  </button>
                )}
              </div>

              <div className="text-xs text-muted-foreground/60 pt-3 font-medium shrink-0">
                {new Date(review.created_at).toLocaleDateString(undefined, { 
                  year: 'numeric', month: 'short', day: 'numeric' 
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* View More Button */}
      {visibleCount < filteredReviews.length && (
        <div className="flex justify-center mt-8">
          <Button 
            variant="outline" 
            onClick={() => {
              if (document.startViewTransition) {
                document.startViewTransition(() => flushSync(() => setVisibleCount((prev) => prev + 6)));
              } else {
                setVisibleCount((prev) => prev + 6);
              }
            }}
            className="rounded-full px-6"
          >
            View More <ChevronDown className="ml-2 w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}