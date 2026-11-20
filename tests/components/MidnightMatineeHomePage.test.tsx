import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MidnightMatineeHomePage } from '@/components/MidnightMatineeHomePage';

describe('MidnightMatineeHomePage', () => {
  it('shows its own search composition and grouped empty states', () => {
    render(
      <MemoryRouter>
        <MidnightMatineeHomePage
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

    expect(screen.getByRole('heading', { name: 'Search results' })).toBeInTheDocument();
    expect(screen.getByText('No movies found.')).toBeInTheDocument();
    expect(screen.getByText('No television found.')).toBeInTheDocument();
    expect(screen.getByText('No people found.')).toBeInTheDocument();
  });
});
