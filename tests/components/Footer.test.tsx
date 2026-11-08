import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Footer } from '@/components/Footer';

describe('Footer', () => {
  it('displays app navigation, TMDB resources, and attribution', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.'))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Movies' })).toHaveAttribute('href', '/movie');
    expect(screen.getByRole('link', { name: 'TV shows' })).toHaveAttribute('href', '/tv');
    expect(screen.getByRole('link', { name: 'People' })).toHaveAttribute('href', '/person');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: 'TMDB website' }))
      .toHaveAttribute('href', 'https://www.themoviedb.org/');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'API terms of use' }))
      .toHaveAttribute('href', 'https://www.themoviedb.org/api-terms-of-use');
    expect(screen.getByRole('link', { name: 'Logo & attribution' }))
      .toHaveAttribute('href', 'https://www.themoviedb.org/about/logos-attribution');
    expect(screen.getByRole('link', { name: 'GitHub' }))
      .toHaveAttribute('href', 'https://github.com/harshamaiya99/tmdb-app');
  });
});
