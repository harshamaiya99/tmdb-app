import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

function renderReviewSection() {
  return render(
    <ReviewSection
      reviews={[longReview]}
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
    expect(markdown).toHaveClass('line-clamp-6');
    expect(content).toHaveClass('flex-1', 'overflow-visible', 'md:overflow-y-auto');

    fireEvent.click(card);

    expect(card).toHaveAttribute('aria-expanded', 'true');
    expect(markdown).not.toHaveClass('line-clamp-6');
    expect(content).toHaveClass('flex-none', 'md:flex-1');

    fireEvent.click(card);

    expect(card).toHaveAttribute('aria-expanded', 'false');
    expect(markdown).toHaveClass('line-clamp-6');
  });

  it('does not toggle the review card when a review link is clicked', () => {
    renderReviewSection();
    const card = screen.getByRole('button', { name: /A Reviewer/ });

    fireEvent.click(screen.getByRole('link', { name: 'https://example.com' }));

    expect(card).toHaveAttribute('aria-expanded', 'false');
  });
});
