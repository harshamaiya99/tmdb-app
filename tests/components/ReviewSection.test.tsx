import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReviewSection } from '@/components/ReviewSection';
import type { Review } from '@/lib/tmdb';

const longReview: Review = {
  id: 'review-1',
  author: 'A Reviewer',
  content: `https://example.com ${'A detailed review of this title. '.repeat(20)}`,
  created_at: '2024-01-01T00:00:00.000Z',
  author_details: {
    name: 'A Reviewer',
    username: 'reviewer',
    avatar_path: null,
    rating: 8,
  },
};

function renderReviewSection(reviews: Review[] = [longReview]) {
  return render(
    <ReviewSection
      reviews={reviews}
      mediaId={123}
      mediaType="movie"
      totalPages={1}
    />,
  );
}

describe('ReviewSection', () => {
  it('expands long review content vertically on mobile and collapses it again', () => {
    const { container } = renderReviewSection();
    const card = screen.getByRole('button', { name: /A Reviewer/ });
    const markdown = container.querySelector('.markdown-body');
    const content = markdown?.parentElement;

    expect(card).toHaveAttribute('aria-expanded', 'false');
    expect(card).toHaveClass('bg-card');
    expect(markdown).toHaveClass('line-clamp-6');
    expect(content).toHaveClass('flex-1', 'overflow-visible', 'md:overflow-y-auto');

    fireEvent.click(card);

    expect(card).toHaveAttribute('aria-expanded', 'true');
    expect(card).toHaveClass('bg-primary/5', 'border-primary/40');
    expect(markdown).not.toHaveClass('line-clamp-6');
    expect(content).toHaveClass('flex-none', 'md:flex-1');

    fireEvent.click(card);

    expect(card).toHaveAttribute('aria-expanded', 'false');
    expect(card).toHaveClass('bg-card');
    expect(card).not.toHaveClass('bg-primary/5', 'border-primary/40');
    expect(markdown).toHaveClass('line-clamp-6');
  });

  it('keeps the review card top edge in place when it expands', () => {
    renderReviewSection();
    const card = screen.getByRole('button', { name: /A Reviewer/ });
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    vi.spyOn(card, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, card.getAttribute('aria-expanded') === 'true' ? 140 : 200, 0, 0),
    );

    fireEvent.click(card);

    expect(scrollBy).toHaveBeenCalledWith(0, -60);
    scrollBy.mockRestore();
  });

  it('does not toggle the review card when a review link is clicked', () => {
    renderReviewSection();
    const card = screen.getByRole('button', { name: /A Reviewer/ });

    fireEvent.click(screen.getByRole('link', { name: 'https://example.com' }));

    expect(card).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles persistent color feedback for reviews too short to expand', () => {
    const shortReview: Review = {
      ...longReview,
      id: 'review-2',
      content: 'A short review.',
    };
    renderReviewSection([shortReview]);

    const card = screen.getByText('A short review.').closest('.rounded-xl');

    expect(card).toHaveAttribute('aria-pressed', 'false');
    expect(card).toHaveClass('bg-card');

    fireEvent.click(card!);

    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(card).toHaveClass('bg-primary/5', 'border-primary/40');

    fireEvent.click(card!);

    expect(card).toHaveAttribute('aria-pressed', 'false');
    expect(card).toHaveClass('bg-card');
    expect(card).not.toHaveClass('bg-primary/5', 'border-primary/40');
  });
});
