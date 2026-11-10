import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaginationControls } from '@/components/PaginationControls';

describe('PaginationControls', () => {
  it('shows the current page and sends bounded previous and next changes', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls page={2} totalPages={4} onPageChange={onPageChange} />);

    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('disables navigation at the first and last pages', () => {
    const onPageChange = vi.fn();
    const { rerender } = render(<PaginationControls page={1} totalPages={3} onPageChange={onPageChange} />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    rerender(<PaginationControls page={3} totalPages={3} onPageChange={onPageChange} />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('renders no controls when there is only one page', () => {
    render(<PaginationControls page={1} totalPages={1} onPageChange={vi.fn()} />);

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });
});
