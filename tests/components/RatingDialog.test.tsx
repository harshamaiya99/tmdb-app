import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RatingDialog } from '@/components/RatingDialog';

function renderRatingDialog(overrides: Partial<React.ComponentProps<typeof RatingDialog>> = {}) {
  const props: React.ComponentProps<typeof RatingDialog> = {
    open: true,
    title: 'Rate this title',
    subtitle: 'A title',
    currentRating: null,
    hoveredRating: null,
    pendingRating: null,
    setHoveredRating: vi.fn(),
    onClose: vi.fn(),
    onRate: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  return { ...render(<RatingDialog {...props} />), props };
}

describe('RatingDialog', () => {
  it('submits half-star pointer ratings and whole-star keyboard ratings', () => {
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 0, 20, 20));
    const { props } = renderRatingDialog();

    fireEvent.click(screen.getByRole('button', { name: '3 stars' }), {
      detail: 1,
      clientX: 5,
    });
    expect(props.onRate).toHaveBeenLastCalledWith(2.5);

    fireEvent.click(screen.getByRole('button', { name: '4 stars' }), { detail: 0 });
    expect(props.onRate).toHaveBeenLastCalledWith(4);
    bounds.mockRestore();
  });

  it('shows optional detail and disables rating changes while an action is pending', () => {
    renderRatingDialog({
      detail: 'Season 1, Episode 2',
      currentRating: 7.5,
      pendingRating: 7.5,
    });

    expect(screen.getByText('Season 1, Episode 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close rating dialog' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '7 stars' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove rating' })).toBeDisabled();
  });
});
