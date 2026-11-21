import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { tmdbService, type Movie, type Person, type TVShow } from '@/lib/tmdb';
import { clearRequestCache } from '@/lib/requestCache';
import { searchWikimediaImages } from '@/lib/wikimedia';

vi.mock('@/lib/wikimedia', () => ({
  searchWikimediaImages: vi.fn().mockResolvedValue([]),
}));

const experiences = [
  { id: 'cinema', name: 'Studio', brand: 'Studio home' },
  { id: 'expressive', name: 'Midnight Matinee', brand: 'Midnight Matinee home' },
  { id: 'screenroom', name: 'Screenroom', brand: 'Screenroom home' },
] as const;

const movieFixture: Movie = {
  id: 501,
  title: 'Sample Feature',
  poster_path: null,
  backdrop_path: null,
  overview: 'A feature used to verify the detail page.',
  release_date: '2024-01-01',
  vote_count: 12,
  genres: [],
};

const tvShowFixture: TVShow = {
  id: 502,
  name: 'Sample Series',
  poster_path: null,
  backdrop_path: null,
  overview: 'A series used to verify the detail page.',
  first_air_date: '2023-01-01',
  vote_count: 15,
  seasons: [],
};

const personFixture: Person = {
  id: 503,
  name: 'Sample Performer',
  biography: 'A performer used to verify the profile page.',
  birthday: null,
  deathday: null,
  place_of_birth: null,
  profile_path: null,
  known_for_department: 'Acting',
  combined_credits: { cast: [] },
  images: { profiles: [] },
};

const detailRoutes = [
  {
    path: '/movie/501',
    contentClass: '.media-detail-movie-hero',
    title: 'Sample Feature',
    description: 'A feature used to verify the detail page.',
  },
  {
    path: '/tv/502',
    contentClass: '.media-detail-tv-hero',
    title: 'Sample Series',
    description: 'A series used to verify the detail page.',
  },
  {
    path: '/person/503',
    contentClass: '.person-details-hero',
    title: 'Sample Performer',
    description: 'A performer used to verify the profile page.',
  },
] as const;

class TestResizeObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

describe('detail routes across web experiences', () => {
  beforeEach(() => {
    clearRequestCache();
    localStorage.clear();
    vi.stubGlobal('__TMDB_DEV_API_KEY__', '');
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
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

    vi.spyOn(tmdbService, 'getMovieDetails').mockResolvedValue(movieFixture);
    vi.spyOn(tmdbService, 'getTVShowDetails').mockResolvedValue(tvShowFixture);
    vi.spyOn(tmdbService, 'getPersonDetails').mockResolvedValue(personFixture);
    vi.mocked(searchWikimediaImages).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it.each(experiences)('renders movie, TV, and person detail pages in $name', async ({ id, brand }) => {
    localStorage.setItem('ui_experience', id);

    for (const route of detailRoutes) {
      window.history.replaceState({}, '', `/#${route.path}`);
      const { container, unmount } = render(<App />);

      expect(await screen.findByText(route.description, {}, { timeout: 5000 })).toBeInTheDocument();
      expect(container.querySelector(route.contentClass)).not.toBeNull();
      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-experience', id);
        expect(screen.getAllByRole('link', { name: brand }).length).toBeGreaterThan(0);
      });

      unmount();
    }

    expect(tmdbService.getMovieDetails).toHaveBeenCalledWith(501, expect.any(Object));
    expect(tmdbService.getTVShowDetails).toHaveBeenCalledWith(502, expect.any(Object));
    expect(tmdbService.getPersonDetails).toHaveBeenCalledWith(503, expect.any(Object));
    expect(searchWikimediaImages).toHaveBeenCalledWith(personFixture.name, expect.any(AbortSignal));
  }, 20_000);
});
