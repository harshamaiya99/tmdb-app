import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MediaCard } from '@/components/MediaCard';
import type { Movie } from '@/lib/tmdb';

function renderMovieCard(movie: Movie) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MediaCard item={movie} type="movie" />
    </MemoryRouter>,
  );
}

describe('MediaCard', () => {
  it('renders movie details when a result has no rating', () => {
    const movie: Movie = {
      id: 123,
      title: 'Kannada film',
      poster_path: null,
      backdrop_path: null,
      overview: '',
      release_date: '2024-01-01',
      vote_average: undefined,
      vote_count: 0,
    };

    renderMovieCard(movie);

    expect(screen.getByRole('heading', { name: 'Kannada film' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Rating .* out of 10/)).not.toBeInTheDocument();
  });

  it('shows a rating when it is a valid number', () => {
    const movie: Movie = {
      id: 123,
      title: 'Rated film',
      poster_path: null,
      backdrop_path: null,
      overview: '',
      release_date: '2024-01-01',
      vote_average: 7.4,
      vote_count: 10,
    };

    renderMovieCard(movie);

    expect(screen.getByLabelText('Rating 7.4 out of 10')).toBeInTheDocument();
  });
});
