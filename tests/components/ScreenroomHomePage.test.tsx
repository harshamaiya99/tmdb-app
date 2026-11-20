import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ScreenroomHomePage } from '@/components/ScreenroomHomePage';

describe('ScreenroomHomePage', () => {
  it('renders distinct search result headings and empty states', () => {
    render(
      <MemoryRouter>
        <ScreenroomHomePage
          hasActiveSearch
          searchTerm="moon"
          primaryLoading={false}
          searchLoading={false}
          searchMovies={[]}
          searchTV={[]}
          searchPeople={[]}
          movieItems={[]}
          tvItems={[]}
          movieCategory="trending-movies"
          tvCategory="trending-tv"
          onMovieCategoryChange={() => undefined}
          onTVCategoryChange={() => undefined}
          region="US"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Results for “moon”' })).toBeInTheDocument();
    expect(screen.getByText('No movies found.')).toBeInTheDocument();
    expect(screen.getByText('No series found.')).toBeInTheDocument();
    expect(screen.getByText('No people found.')).toBeInTheDocument();
  });
});
