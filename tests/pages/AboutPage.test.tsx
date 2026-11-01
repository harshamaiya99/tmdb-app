import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TitleProvider } from '@/contexts/TitleContext';
import { AboutPage } from '@/pages/AboutPage';

describe('AboutPage', () => {
  it('displays the TMDB logo, required attribution, and policy links', () => {
    render(
      <TitleProvider>
        <MemoryRouter>
          <AboutPage />
        </MemoryRouter>
      </TitleProvider>,
    );

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'TMDB' })).toHaveAttribute('src', expect.stringMatching(/\/tmdb-logo\.svg$/));
    expect(screen.getByText(
      'This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.',
    )).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TMDB API Terms of Use' }))
      .toHaveAttribute('href', 'https://www.themoviedb.org/api-terms-of-use');
    expect(screen.getByRole('link', { name: 'TMDB logo and attribution guidelines' }))
      .toHaveAttribute('href', 'https://www.themoviedb.org/about/logos-attribution');
  });
});
