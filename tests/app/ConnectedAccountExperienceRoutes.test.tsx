import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { clearRequestCache } from '@/lib/requestCache';
import {
  tmdbService,
  type TMDBAccountMedia,
  type Movie,
  type TMDBUserList,
  type TMDBUserListDetails,
  type TMDBUserListItem,
  type TrendingResponse,
} from '@/lib/tmdb';

const experiences = [
  { id: 'cinema', name: 'Studio', brand: 'Studio home' },
  { id: 'expressive', name: 'Midnight Matinee', brand: 'Midnight Matinee home' },
  { id: 'screenroom', name: 'Screenroom', brand: 'Screenroom home' },
] as const;

const movieFixture: Movie = {
  id: 701,
  title: 'Account Sample Movie',
  poster_path: null,
  backdrop_path: null,
  overview: 'A title used to verify connected account pages.',
  release_date: '2024-02-01',
  vote_count: 18,
  vote_average: 8.5,
};

const listItem: TMDBUserListItem = {
  ...movieFixture,
  media_type: 'movie',
};

const userList: TMDBUserList = {
  id: 900,
  name: 'Sample Collection',
  description: 'Curated titles',
  favorite_count: 0,
  poster_path: null,
  iso_639_1: 'en',
  public: false,
};

const userListDetails: TMDBUserListDetails = {
  ...userList,
  results: [listItem],
  object_ids: { movie: [movieFixture.id], tv: [] },
  page: 1,
  total_pages: 1,
  total_results: 1,
};

function response<T>(results: T[]): TrendingResponse<T> {
  return { page: 1, results, total_pages: 1, total_results: results.length };
}

describe('connected account routes across web experiences', () => {
  beforeEach(() => {
    clearRequestCache();
    localStorage.clear();
    vi.stubGlobal('__TMDB_DEV_API_KEY__', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isConnected: true,
        account: { id: 700, name: 'Test Viewer', username: 'test-viewer' },
        isListAccountConnected: true,
        listAccountId: 'list-account-700',
        canConnectLists: true,
      }),
    }));

    vi.spyOn(tmdbService, 'getAccountList').mockImplementation(async (section, mediaType) => (
      response<TMDBAccountMedia>(
        mediaType === 'tv'
          ? []
          : section === 'ratings'
            ? [{ ...movieFixture, rating: 8.5 }]
            : [movieFixture],
      )
    ));
    vi.spyOn(tmdbService, 'setAccountWatchlist').mockResolvedValue();
    vi.spyOn(tmdbService, 'setAccountFavorite').mockResolvedValue();
    vi.spyOn(tmdbService, 'deleteMediaRating').mockResolvedValue();
    vi.spyOn(tmdbService, 'getAccountLists').mockResolvedValue(response([userList]));
    vi.spyOn(tmdbService, 'getAccountListPreviews').mockResolvedValue({
      [userList.id]: { count: 1, items: [listItem], isPublic: false },
    });
    vi.spyOn(tmdbService, 'getUserList').mockResolvedValue(userListDetails);
    vi.spyOn(tmdbService, 'updateUserList').mockResolvedValue();
    vi.spyOn(tmdbService, 'removeMediaFromUserList').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it.each(experiences)(
    'supports watchlist, favorites, ratings, and custom lists in $name',
    async ({ id, brand }) => {
      const user = userEvent.setup();
      localStorage.setItem('ui_experience', id);

      const accountSections = [
        {
          section: 'watchlist',
          heading: 'Your Watchlist',
          action: 'Remove Account Sample Movie from watchlist',
          assertUpdated: () => expect(tmdbService.setAccountWatchlist).toHaveBeenCalledWith(
            'movie',
            movieFixture.id,
            false,
          ),
        },
        {
          section: 'favorites',
          heading: 'Your Favorites',
          action: 'Remove Account Sample Movie from favorites',
          assertUpdated: () => expect(tmdbService.setAccountFavorite).toHaveBeenCalledWith(
            'movie',
            movieFixture.id,
            false,
          ),
        },
        {
          section: 'ratings',
          heading: 'Your Ratings',
          action: 'Remove Account Sample Movie from ratings',
          assertUpdated: () => expect(tmdbService.deleteMediaRating).toHaveBeenCalledWith(
            'movie',
            movieFixture.id,
          ),
        },
      ] as const;

      for (const { section, heading, action, assertUpdated } of accountSections) {
        window.history.replaceState({}, '', `/#/account/${section}`);
        const { unmount } = render(<App />);

        expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
        expect(await screen.findByRole('link', { name: 'View Account Sample Movie' })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: brand }).length).toBeGreaterThan(0);
        if (section === 'ratings') expect(screen.getAllByText('8.5').length).toBeGreaterThan(0);

        await user.click(screen.getByRole('button', { name: action }));
        await waitFor(assertUpdated);
        expect(tmdbService.getAccountList).toHaveBeenCalledWith(
          section,
          'movie',
          1,
          expect.any(AbortSignal),
        );
        unmount();
      }

      window.history.replaceState({}, '', '/#/account/lists');
      const overview = render(<App />);
      expect(await screen.findByRole('heading', { name: 'Your Lists' })).toBeInTheDocument();
      expect(await screen.findByRole('link', { name: /Sample Collection/ })).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: brand }).length).toBeGreaterThan(0);

      await user.click(screen.getByRole('link', { name: /Sample Collection/ }));
      expect(await screen.findByRole('heading', { name: /Sample Collection/ })).toBeInTheDocument();
      expect(await screen.findByRole('link', { name: 'View Account Sample Movie' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Edit list' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Edit list' }));
      const nameInput = screen.getByLabelText('List name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Collection');
      await user.click(screen.getByRole('button', { name: 'Save changes' }));
      await waitFor(() => expect(tmdbService.updateUserList).toHaveBeenCalledWith(
        userList.id,
        'Updated Collection',
        userList.description,
        userList.public,
        userList.iso_639_1,
      ));

      await user.click(screen.getByRole('button', {
        name: 'Remove Account Sample Movie from Sample Collection',
      }));
      await waitFor(() => expect(tmdbService.removeMediaFromUserList).toHaveBeenCalledWith(
        userList.id,
        'movie',
        movieFixture.id,
      ));
      expect(tmdbService.getAccountLists).toHaveBeenCalledWith(1, expect.any(AbortSignal));
      expect(tmdbService.getUserList).toHaveBeenCalledWith(userList.id, 1, expect.any(AbortSignal));
      overview.unmount();
    },
    20_000,
  );
});
