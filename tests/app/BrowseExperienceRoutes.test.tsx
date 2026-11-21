import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { clearRequestCache } from '@/lib/requestCache';
import {
  tmdbService,
  type Movie,
  type PersonListResult,
  type TrendingResponse,
} from '@/lib/tmdb';

const experiences = [
  { id: 'cinema', name: 'Studio', brand: 'Studio home' },
  { id: 'expressive', name: 'Midnight Matinee', brand: 'Midnight Matinee home' },
  { id: 'screenroom', name: 'Screenroom', brand: 'Screenroom home' },
] as const;

const movieFixture: Movie = {
  id: 601,
  title: 'Browse Sample Movie',
  poster_path: null,
  backdrop_path: null,
  overview: 'A movie used to verify the browse page.',
  release_date: '2024-01-15',
  vote_count: 21,
};

const releaseFixture: Movie = {
  ...movieFixture,
  id: 602,
  title: 'Release Sample Movie',
};

const personFixture: PersonListResult = {
  id: 603,
  name: 'Browse Sample Person',
  profile_path: null,
  known_for_department: 'Acting',
  popularity: 3,
};

function response<T>(results: T[]): TrendingResponse<T> {
  return { page: 1, results, total_pages: 1, total_results: results.length };
}

const browseRoutes = [
  {
    path: '/category/popular-movies',
    className: '.page-media-list',
    linkName: 'View Browse Sample Movie',
  },
  {
    path: '/person',
    className: '.page-people-list',
    linkName: 'View Browse Sample Person',
  },
  {
    path: '/releases/2024-01-15',
    className: '.page-release-list',
    linkName: 'View Release Sample Movie',
  },
] as const;

describe('browse routes across web experiences', () => {
  beforeEach(() => {
    clearRequestCache();
    localStorage.clear();
    vi.stubGlobal('__TMDB_DEV_API_KEY__', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isConnected: false,
        account: null,
        isListAccountConnected: false,
        listAccountId: '',
        canConnectLists: false,
      }),
    }));

    vi.spyOn(tmdbService, 'getCategoryList').mockResolvedValue(response([movieFixture]));
    vi.spyOn(tmdbService, 'getPopularPersons').mockResolvedValue(response([personFixture]));
    vi.spyOn(tmdbService, 'getMoviesByReleaseDateRange').mockResolvedValue(response([releaseFixture]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it.each(experiences)('renders media, people, and release routes in $name', async ({ id, brand }) => {
    localStorage.setItem('ui_experience', id);

    for (const route of browseRoutes) {
      window.history.replaceState({}, '', `/#${route.path}`);
      const { container, unmount } = render(<App />);

      expect(await screen.findByRole('link', { name: route.linkName }, { timeout: 5000 })).toBeInTheDocument();
      expect(container.querySelector(route.className)).not.toBeNull();
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-experience', id);
        expect(screen.getAllByRole('link', { name: brand }).length).toBeGreaterThan(0);
      });

      unmount();
    }

    expect(tmdbService.getCategoryList).toHaveBeenCalledWith(
      'popular-movies',
      1,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      undefined,
      'popularity.desc',
      expect.any(String),
    );
    expect(tmdbService.getPopularPersons).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(tmdbService.getMoviesByReleaseDateRange).toHaveBeenCalledWith(
      '2024-01-15',
      '2024-01-15',
      1,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      expect.any(String),
    );
  }, 20_000);
});
