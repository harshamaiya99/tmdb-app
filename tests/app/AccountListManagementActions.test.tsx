import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { clearRequestCache } from '@/lib/requestCache';
import {
  tmdbService,
  type Movie,
  type TMDBUserList,
  type TMDBUserListDetails,
  type TMDBUserListItem,
  type TrendingResponse,
  type TVShow,
} from '@/lib/tmdb';

const experiences = [
  { id: 'cinema', name: 'Studio', brand: 'Studio home' },
  { id: 'expressive', name: 'Midnight Matinee', brand: 'Midnight Matinee home' },
  { id: 'screenroom', name: 'Screenroom', brand: 'Screenroom home' },
] as const;

const userList: TMDBUserList = {
  id: 920,
  name: 'My new collection',
  description: 'Created from account lists',
  favorite_count: 0,
  poster_path: null,
  iso_639_1: 'en',
  public: true,
};

const movieResult: Movie = {
  id: 921,
  title: 'Searchable Sample Movie',
  poster_path: null,
  backdrop_path: null,
  overview: '',
  release_date: '2024-04-01',
  vote_count: 12,
  vote_average: 7.5,
};

const tvResult: TVShow = {
  id: 922,
  name: 'Searchable Sample Series',
  poster_path: null,
  backdrop_path: null,
  overview: '',
  first_air_date: '2023-04-01',
  vote_count: 15,
  vote_average: 8,
};

function response<T>(results: T[]): TrendingResponse<T> {
  return { page: 1, results, total_pages: 1, total_results: results.length };
}

describe('account list management actions across web experiences', () => {
  beforeEach(() => {
    clearRequestCache();
    localStorage.clear();
    localStorage.setItem('tmdb_content_region', 'CA');
    vi.stubGlobal('__TMDB_DEV_API_KEY__', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isConnected: true,
        account: { id: 910, name: 'Test Viewer', username: 'test-viewer' },
        isListAccountConnected: true,
        listAccountId: 'list-account-910',
        canConnectLists: true,
      }),
    }));

    vi.spyOn(tmdbService, 'getAccountLists').mockResolvedValue(response([userList]));
    vi.spyOn(tmdbService, 'getAccountListPreviews').mockResolvedValue({});
    vi.spyOn(tmdbService, 'getUserList').mockResolvedValue({
      ...userList,
      results: [],
      object_ids: { movie: [], tv: [] },
      page: 1,
      total_pages: 1,
      total_results: 0,
    } satisfies TMDBUserListDetails);
    vi.spyOn(tmdbService, 'searchMovies').mockResolvedValue(response([movieResult]));
    vi.spyOn(tmdbService, 'searchTVShows').mockResolvedValue(response([tvResult]));
    vi.spyOn(tmdbService, 'addMediaToUserList').mockResolvedValue();
    vi.spyOn(tmdbService, 'deleteUserList').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it.each(experiences)(
    'creates a list and adds movie and TV titles from account lists in $name',
    async ({ id, brand }) => {
      localStorage.setItem('ui_experience', id);
      const storedItems: TMDBUserListItem[] = [];
      vi.spyOn(tmdbService, 'createUserList').mockResolvedValue({ id: userList.id, success: true });
      vi.spyOn(tmdbService, 'getAccountLists').mockResolvedValue(response([]));
      vi.spyOn(tmdbService, 'getUserList').mockImplementation(async () => ({
        ...userList,
        results: [...storedItems],
        object_ids: {
          movie: storedItems.filter((item) => item.media_type === 'movie').map((item) => item.id),
          tv: storedItems.filter((item) => item.media_type === 'tv').map((item) => item.id),
        },
        page: 1,
        total_pages: 1,
        total_results: storedItems.length,
      }));
      vi.spyOn(tmdbService, 'addMediaToUserList').mockImplementation(async (listId, mediaType, mediaId) => {
        expect(listId).toBe(userList.id);
        const item = mediaType === 'movie'
          ? { ...movieResult, media_type: 'movie' as const }
          : { ...tvResult, media_type: 'tv' as const };
        expect(item.id).toBe(mediaId);
        storedItems.push(item);
      });

      window.history.replaceState({}, '', '/#/account/lists');
      const user = userEvent.setup();
      render(<App />);

      expect(await screen.findByRole('heading', { name: 'Your Lists' })).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: brand }).length).toBeGreaterThan(0);
      await user.click(screen.getByRole('button', { name: 'Create a list' }));
      await user.type(screen.getByLabelText('List name'), 'My new collection');
      await user.type(screen.getByLabelText('Description (optional)'), 'Created from account lists');
      await user.click(screen.getByRole('checkbox', { name: 'Make this list public' }));
      await user.click(screen.getByRole('button', { name: 'Create list' }));

      await waitFor(() => expect(tmdbService.createUserList).toHaveBeenCalledWith(
        'My new collection',
        'Created from account lists',
        true,
        'CA',
      ));
      expect(await screen.findByRole('heading', { name: /My new collection/ })).toBeInTheDocument();
      expect(await screen.findByText('Created My new collection')).toBeInTheDocument();

      const addSection = screen.getByRole('region', { name: 'Add titles to this list' });
      const searchInput = within(addSection).getByLabelText('Search titles');
      await user.type(searchInput, 'Sample Movie');
      await user.click(within(addSection).getByRole('button', { name: 'Search' }));
      const addMovieButton = await within(addSection).findByRole('button', { name: 'Add to list' });
      expect(within(addSection).getByText(movieResult.title)).toBeInTheDocument();
      await user.click(addMovieButton);
      await waitFor(() => expect(tmdbService.addMediaToUserList).toHaveBeenCalledWith(
        userList.id,
        'movie',
        movieResult.id,
      ));
      expect(await screen.findByText(`Added ${movieResult.title} to list`)).toBeInTheDocument();
      await waitFor(() => expect(within(addSection).getByRole('button', { name: 'Added' })).toBeDisabled());

      await user.click(within(addSection).getByRole('combobox', { name: 'Title type' }));
      await user.click(screen.getByRole('option', { name: 'TV shows' }));
      await user.clear(searchInput);
      await user.type(searchInput, 'Sample Series');
      await user.click(within(addSection).getByRole('button', { name: 'Search' }));
      expect(await within(addSection).findByText(tvResult.name)).toBeInTheDocument();
      await user.click(within(addSection).getByRole('button', { name: 'Add to list' }));
      await waitFor(() => expect(tmdbService.addMediaToUserList).toHaveBeenCalledWith(
        userList.id,
        'tv',
        tvResult.id,
      ));
      expect(await screen.findByText(`Added ${tvResult.name} to list`)).toBeInTheDocument();
      expect(tmdbService.searchMovies).toHaveBeenCalledWith('Sample Movie', 1, { signal: expect.any(AbortSignal) }, 'CA');
      expect(tmdbService.searchTVShows).toHaveBeenCalledWith('Sample Series', 1, { signal: expect.any(AbortSignal) });
    },
    30_000,
  );

  it.each(experiences)(
    'keeps list creation and item addition retryable after failures in $name',
    async ({ id }) => {
      localStorage.setItem('ui_experience', id);
      const createList = vi.spyOn(tmdbService, 'createUserList')
        .mockRejectedValueOnce(new Error('List service unavailable'))
        .mockResolvedValue({ id: userList.id, success: true });
      const addItem = vi.spyOn(tmdbService, 'addMediaToUserList')
        .mockRejectedValueOnce(new Error('Could not save this title'))
        .mockResolvedValue();
      vi.spyOn(tmdbService, 'getAccountLists').mockResolvedValue(response([]));

      window.history.replaceState({}, '', '/#/account/lists');
      const user = userEvent.setup();
      render(<App />);

      await screen.findByRole('heading', { name: 'Your Lists' });
      await user.click(screen.getByRole('button', { name: 'Create a list' }));
      await user.type(screen.getByLabelText('List name'), 'Retry collection');
      await user.click(screen.getByRole('button', { name: 'Create list' }));
      expect(await screen.findByText('Could not create list')).toBeInTheDocument();
      expect(await screen.findByText('List service unavailable')).toBeInTheDocument();
      expect(screen.getByLabelText('List name')).toHaveValue('Retry collection');

      await user.click(screen.getByRole('button', { name: 'Create list' }));
      expect(await screen.findByRole('heading', { name: /My new collection/ })).toBeInTheDocument();

      const addSection = screen.getByRole('region', { name: 'Add titles to this list' });
      await user.type(within(addSection).getByLabelText('Search titles'), 'Sample Movie');
      await user.click(within(addSection).getByRole('button', { name: 'Search' }));
      await user.click(await within(addSection).findByRole('button', { name: 'Add to list' }));
      expect(await screen.findByText('Could not add title to list')).toBeInTheDocument();
      expect(await screen.findByText('Could not save this title')).toBeInTheDocument();
      expect(within(addSection).getByRole('button', { name: 'Add to list' })).toBeEnabled();

      await user.click(within(addSection).getByRole('button', { name: 'Add to list' }));
      await waitFor(() => expect(addItem).toHaveBeenCalledTimes(2));
      expect(await screen.findByText(`Added ${movieResult.title} to list`)).toBeInTheDocument();
      expect(createList).toHaveBeenCalledTimes(2);
    },
    30_000,
  );

  it.each(experiences)(
    'keeps list deletion confirmed and retryable after failure in $name',
    async ({ id }) => {
      localStorage.setItem('ui_experience', id);
      const deleteList = vi.spyOn(tmdbService, 'deleteUserList')
        .mockRejectedValueOnce(new Error('Delete service unavailable'))
        .mockResolvedValue();

      window.history.replaceState({}, '', `/#/account/lists/${userList.id}`);
      const user = userEvent.setup();
      render(<App />);

      expect(await screen.findByRole('heading', { name: /My new collection/ })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Delete list' }));
      const confirmation = screen.getByRole('alertdialog', { name: 'Delete list?' });
      expect(within(confirmation).getByText(/Delete “My new collection”\? This cannot be undone\./)).toBeInTheDocument();
      await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(deleteList).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Delete list' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete list' }));
      expect(await screen.findByText('Could not delete list')).toBeInTheDocument();
      expect(await screen.findByText('Delete service unavailable')).toBeInTheDocument();
      expect(screen.getByRole('alertdialog', { name: 'Delete list?' })).toBeInTheDocument();
      expect(deleteList).toHaveBeenCalledWith(userList.id);

      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete list' }));
      expect(await screen.findByText('List deleted')).toBeInTheDocument();
      expect(await screen.findByRole('heading', { name: 'Your Lists' })).toBeInTheDocument();
      expect(deleteList).toHaveBeenCalledTimes(2);
    },
    30_000,
  );

  it.each(experiences)(
    'shows search failures and allows retrying in $name',
    async ({ id }) => {
      localStorage.setItem('ui_experience', id);
      const searchMovies = vi.spyOn(tmdbService, 'searchMovies')
        .mockRejectedValueOnce(new Error('Movie search unavailable'))
        .mockResolvedValue(response([movieResult]));

      window.history.replaceState({}, '', `/#/account/lists/${userList.id}`);
      const user = userEvent.setup();
      render(<App />);

      expect(await screen.findByRole('heading', { name: /My new collection/ })).toBeInTheDocument();
      const addSection = screen.getByRole('region', { name: 'Add titles to this list' });
      const searchInput = within(addSection).getByRole('searchbox', { name: 'Search titles' });
      await user.type(searchInput, 'Unavailable');
      await user.click(within(addSection).getByRole('button', { name: 'Search' }));
      expect(await within(addSection).findByText('Movie search unavailable')).toBeInTheDocument();

      await user.click(within(addSection).getByRole('button', { name: 'Search' }));
      expect(await within(addSection).findByText(movieResult.title)).toBeInTheDocument();
      expect(searchMovies).toHaveBeenNthCalledWith(
        1,
        'Unavailable',
        1,
        { signal: expect.any(AbortSignal) },
        'CA',
      );
      expect(searchMovies).toHaveBeenNthCalledWith(
        2,
        'Unavailable',
        1,
        { signal: expect.any(AbortSignal) },
        'CA',
      );
    },
    30_000,
  );
});
