import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { clearRequestCache } from '@/lib/requestCache';
import {
  tmdbService,
  type Movie,
  type Person,
  type TMDBMediaAccountState,
  type TMDBUserList,
  type TrendingResponse,
  type TVShow,
} from '@/lib/tmdb';

const experiences = [
  { id: 'cinema', name: 'Studio', brand: 'Studio home' },
  { id: 'expressive', name: 'Midnight Matinee', brand: 'Midnight Matinee home' },
  { id: 'screenroom', name: 'Screenroom', brand: 'Screenroom home' },
] as const;

const movieFixture: Movie = {
  id: 801,
  title: 'Action Sample Movie',
  poster_path: null,
  backdrop_path: null,
  overview: 'A feature used to verify account actions.',
  release_date: '2024-03-01',
  vote_count: 20,
  genres: [],
  credits: { cast: [], crew: [] },
  videos: { results: [] },
  images: { backdrops: [], posters: [] },
  recommendations: { results: [] },
  similar: { results: [] },
};

const tvShowFixture: TVShow = {
  id: 802,
  name: 'Action Sample Series',
  poster_path: null,
  backdrop_path: null,
  overview: 'A series used to verify account actions.',
  first_air_date: '2023-03-01',
  vote_count: 22,
  seasons: [],
  credits: { cast: [], crew: [] },
  aggregate_credits: { cast: [], crew: [] },
  videos: { results: [] },
  images: { backdrops: [], posters: [] },
  recommendations: { results: [] },
  similar: { results: [] },
};

const personFixture: Person = {
  id: 803,
  name: 'Action Sample Person',
  biography: '',
  birthday: null,
  deathday: null,
  place_of_birth: null,
  profile_path: null,
  known_for_department: 'Acting',
  combined_credits: { cast: [] },
  images: { profiles: [] },
};

const userList: TMDBUserList = {
  id: 901,
  name: 'Detail Actions List',
  description: '',
  favorite_count: 0,
  poster_path: null,
  iso_639_1: 'en',
  public: false,
};

function response<T>(results: T[]): TrendingResponse<T> {
  return { page: 1, results, total_pages: 1, total_results: results.length };
}

const detailRoutes = [
  {
    path: '/movie/801',
    mediaType: 'movie',
    mediaId: movieFixture.id,
    title: movieFixture.title,
    overview: movieFixture.overview,
  },
  {
    path: '/tv/802',
    mediaType: 'tv',
    mediaId: tvShowFixture.id,
    title: tvShowFixture.name,
    overview: tvShowFixture.overview,
  },
] as const;

describe('movie and TV account actions across web experiences', () => {
  beforeEach(() => {
    clearRequestCache();
    localStorage.clear();
    vi.stubGlobal('__TMDB_DEV_API_KEY__', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isConnected: true,
        account: { id: 800, name: 'Test Viewer', username: 'test-viewer' },
        isListAccountConnected: true,
        listAccountId: 'list-account-800',
        canConnectLists: true,
      }),
    }));

    vi.spyOn(tmdbService, 'getMovieDetails').mockResolvedValue(movieFixture);
    vi.spyOn(tmdbService, 'getTVShowDetails').mockResolvedValue(tvShowFixture);
    vi.spyOn(tmdbService, 'getPersonDetails').mockResolvedValue(personFixture);
    vi.spyOn(tmdbService, 'getMediaAccountState').mockResolvedValue({
      favorite: false,
      watchlist: false,
      rated: false,
    } satisfies TMDBMediaAccountState);
    vi.spyOn(tmdbService, 'setAccountWatchlist').mockResolvedValue();
    vi.spyOn(tmdbService, 'setAccountFavorite').mockResolvedValue();
    vi.spyOn(tmdbService, 'rateMedia').mockResolvedValue();
    vi.spyOn(tmdbService, 'getAccountLists').mockResolvedValue(response([userList]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it.each(experiences.flatMap((experience) =>
    detailRoutes.map((route) => ({ ...experience, mediaType: route.mediaType, route })),
  ))(
    'updates account actions on $mediaType details in $name',
    async ({ id, brand, route }) => {
      localStorage.setItem('ui_experience', id);
      let isInList = false;
      vi.spyOn(tmdbService, 'getAccountUserListMemberships').mockImplementation(async () => [{
        listId: userList.id,
        mediaIds: {
          movie: isInList && route.mediaType === 'movie' ? [route.mediaId] : [],
          tv: isInList && route.mediaType === 'tv' ? [route.mediaId] : [],
        },
      }]);
      vi.spyOn(tmdbService, 'addMediaToUserList').mockImplementation(async (listId, mediaType, mediaId) => {
        expect(listId).toBe(userList.id);
        expect(mediaType).toBe(route.mediaType);
        expect(mediaId).toBe(route.mediaId);
        isInList = true;
      });

      window.history.replaceState({}, '', `/#${route.path}`);
      const user = userEvent.setup();
      render(<App />);

      expect(await screen.findByText(route.overview, {}, { timeout: 5000 })).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: brand }).length).toBeGreaterThan(0);
      const actions = screen.getByRole('region', { name: 'TMDB account actions' });
      const watchlistButton = await screen.findByRole('button', { name: 'Add to watchlist' });
      await waitFor(() => expect(watchlistButton).toBeEnabled());

      await user.click(watchlistButton);
      await waitFor(() => expect(tmdbService.setAccountWatchlist).toHaveBeenCalledWith(
        route.mediaType,
        route.mediaId,
        true,
      ));
      expect(await screen.findByText('Added to watchlist')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove from watchlist' })).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByRole('button', { name: 'Add to favorites' }));
      await waitFor(() => expect(tmdbService.setAccountFavorite).toHaveBeenCalledWith(
        route.mediaType,
        route.mediaId,
        true,
      ));
      expect(await screen.findByText('Added to favorites')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute('aria-pressed', 'true');

      const ratingDialogName = route.mediaType === 'movie' ? 'Rate this movie' : 'Rate this TV show';
      await user.click(screen.getByRole('button', { name: ratingDialogName }));
      const ratingDialog = screen.getByRole('dialog', { name: ratingDialogName });
      fireEvent.click(screen.getByRole('button', { name: '8 stars' }), { detail: 0 });
      await waitFor(() => expect(tmdbService.rateMedia).toHaveBeenCalledWith(
        route.mediaType,
        route.mediaId,
        8,
      ));
      expect(await screen.findByText('Rated 8.0')).toBeInTheDocument();
      expect(ratingDialog).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Your rating is 8.0. Change rating.' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Add to list' }));
      const listDialog = screen.getByRole('dialog', { name: 'Add to list' });
      expect(await within(listDialog).findByRole('button', { name: 'Add to Detail Actions List' })).toBeInTheDocument();
      await user.click(within(listDialog).getByRole('button', { name: 'Add to Detail Actions List' }));
      expect(await screen.findByText('Added to Detail Actions List')).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Added to list' })).toBeInTheDocument();

      expect(tmdbService.getMediaAccountState).toHaveBeenCalledWith(
        route.mediaType,
        route.mediaId,
        expect.any(AbortSignal),
      );
      expect(tmdbService.getAccountUserListMemberships).toHaveBeenCalledWith(expect.any(AbortSignal));
      expect(tmdbService.getAccountLists).toHaveBeenCalledWith(1, expect.any(AbortSignal));
      expect(actions).toBeInTheDocument();
    },
    30_000,
  );

  it.each(experiences.flatMap((experience) =>
    detailRoutes.map((route) => ({ ...experience, mediaType: route.mediaType, route })),
  ))(
    'creates a custom list and adds the $mediaType title from details in $name',
    async ({ id, route }) => {
      localStorage.setItem('ui_experience', id);
      let isInList = false;
      vi.spyOn(tmdbService, 'getAccountUserListMemberships').mockImplementation(async () => isInList
        ? [{
          listId: 902,
          mediaIds: {
            movie: route.mediaType === 'movie' ? [route.mediaId] : [],
            tv: route.mediaType === 'tv' ? [route.mediaId] : [],
          },
        }]
        : []);
      vi.spyOn(tmdbService, 'getAccountLists').mockResolvedValue(response([]));
      vi.spyOn(tmdbService, 'createUserList').mockResolvedValue({ id: 902, success: true });
      vi.spyOn(tmdbService, 'addMediaToUserList').mockImplementation(async (listId, mediaType, mediaId) => {
        expect(listId).toBe(902);
        expect(mediaType).toBe(route.mediaType);
        expect(mediaId).toBe(route.mediaId);
        isInList = true;
      });

      window.history.replaceState({}, '', `/#${route.path}`);
      const user = userEvent.setup();
      render(<App />);

      await screen.findByText(route.overview, {}, { timeout: 5000 });
      await user.click(await screen.findByRole('button', { name: 'Add to list' }));
      const listDialog = screen.getByRole('dialog', { name: 'Add to list' });
      await user.click(within(listDialog).getByRole('button', { name: 'Create a new list' }));
      await user.type(within(listDialog).getByLabelText('List name'), 'My detail list');
      await user.type(within(listDialog).getByLabelText('Description (optional)'), 'Saved from a detail page');
      await user.click(within(listDialog).getByRole('checkbox', { name: 'Make this list public' }));
      await user.click(within(listDialog).getByRole('button', { name: 'Create and add' }));

      await waitFor(() => expect(tmdbService.createUserList).toHaveBeenCalledWith(
        'My detail list',
        'Saved from a detail page',
        true,
        'IN',
      ));
      expect(tmdbService.addMediaToUserList).toHaveBeenCalledWith(902, route.mediaType, route.mediaId);
      expect(await screen.findByText('Created My detail list and added title')).toBeInTheDocument();
      expect(screen.queryByRole('dialog', { name: 'Add to list' })).not.toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Added to list' })).toBeInTheDocument();
    },
    30_000,
  );

  it.each(experiences.flatMap((experience) =>
    detailRoutes.map((route) => ({ ...experience, mediaType: route.mediaType, route })),
  ))(
    'shows connected-action errors on $mediaType details in $name',
    async ({ id, route }) => {
      localStorage.setItem('ui_experience', id);
      vi.spyOn(tmdbService, 'getAccountUserListMemberships').mockResolvedValue([]);
      vi.spyOn(tmdbService, 'setAccountWatchlist').mockRejectedValue(new Error('Watchlist unavailable'));
      vi.spyOn(tmdbService, 'setAccountFavorite').mockRejectedValue(new Error('Favorites unavailable'));
      vi.spyOn(tmdbService, 'rateMedia').mockRejectedValue(new Error('Ratings unavailable'));
      vi.spyOn(tmdbService, 'addMediaToUserList').mockRejectedValue(new Error('Lists unavailable'));
      const createUserList = vi.spyOn(tmdbService, 'createUserList')
        .mockRejectedValue(new Error('Creation unavailable'));

      window.history.replaceState({}, '', `/#${route.path}`);
      const user = userEvent.setup();
      render(<App />);

      await screen.findByText(route.overview, {}, { timeout: 5000 });
      await user.click(await screen.findByRole('button', { name: 'Add to watchlist' }));
      expect(await screen.findByText('Could not update your TMDB account')).toBeInTheDocument();
      expect(await screen.findByText('Watchlist unavailable')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add to watchlist' })).toHaveAttribute('aria-pressed', 'false');

      await user.click(screen.getByRole('button', { name: 'Add to favorites' }));
      expect(await screen.findByText('Favorites unavailable')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add to favorites' })).toHaveAttribute('aria-pressed', 'false');

      const ratingDialogName = route.mediaType === 'movie' ? 'Rate this movie' : 'Rate this TV show';
      await user.click(screen.getByRole('button', { name: ratingDialogName }));
      const ratingDialog = screen.getByRole('dialog', { name: ratingDialogName });
      fireEvent.click(screen.getByRole('button', { name: '8 stars' }), { detail: 0 });
      expect(await screen.findByText('Could not save your rating')).toBeInTheDocument();
      expect(await screen.findByText('Ratings unavailable')).toBeInTheDocument();
      expect(ratingDialog).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Close rating dialog' }));
      await user.click(screen.getByRole('button', { name: 'Add to list' }));
      const listDialog = screen.getByRole('dialog', { name: 'Add to list' });
      await user.click(await within(listDialog).findByRole('button', { name: 'Add to Detail Actions List' }));
      expect(await screen.findByText('Could not add title to list')).toBeInTheDocument();
      expect(await screen.findByText('Lists unavailable')).toBeInTheDocument();
      expect(listDialog).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add to list' })).toBeInTheDocument();

      await user.click(within(listDialog).getByRole('button', { name: 'Create a new list' }));
      await user.type(within(listDialog).getByLabelText('List name'), 'Failure test list');
      await user.click(within(listDialog).getByRole('button', { name: 'Create and add' }));
      expect(await screen.findByText('Could not create list')).toBeInTheDocument();
      expect(await screen.findByText('Creation unavailable')).toBeInTheDocument();
      expect(listDialog).toBeInTheDocument();

      createUserList.mockResolvedValue({ id: 903, success: true });
      await user.click(within(listDialog).getByRole('button', { name: 'Create and add' }));
      expect(await screen.findByText('List created, but could not add title')).toBeInTheDocument();
      expect(await screen.findByText('Lists unavailable')).toBeInTheDocument();
      expect(listDialog).toBeInTheDocument();
    },
    30_000,
  );
});
