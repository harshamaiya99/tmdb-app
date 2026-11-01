import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tmdbService } from '@/lib/tmdb';

function responseWith(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('TMDB Talk-show filtering', () => {
  beforeEach(() => {
    tmdbService.setApiKey('test-api-key');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('filters Talk shows from trending TV results', async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith({
      page: 1,
      results: [
        { id: 1, name: 'Drama Series', genre_ids: [18] },
        { id: 2, name: 'Talk Show', genre_ids: [10767] },
      ],
      total_pages: 1,
      total_results: 2,
    }));

    await expect(tmdbService.getTrendingTVShows()).resolves.toEqual([
      { id: 1, name: 'Drama Series', genre_ids: [18] },
    ]);
  });

  it('requests filtered TV categories and excludes Talk shows defensively', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 1,
      results: [{ id: 2, name: 'Talk Show', genre_ids: [10767] }],
      total_pages: 1,
      total_results: 1,
    }));

    await expect(tmdbService.getCategoryList('trending-tv')).resolves.toMatchObject({
      results: [],
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.searchParams.get('without_genres')).toBe('10767');
  });

  it('excludes Talk shows from TV genre browsing', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 1,
      results: [{ id: 2, name: 'Talk Show', genre_ids: [10767] }],
      total_pages: 1,
      total_results: 1,
    }));

    await expect(tmdbService.getGenreMediaList('tv', 35)).resolves.toMatchObject({
      results: [],
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.searchParams.get('without_genres')).toBe('10767');
  });

  it('keeps Talk shows in TV search results', async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith({
      page: 1,
      results: [{ id: 2, name: 'Talk Show', genre_ids: [10767] }],
      total_pages: 1,
      total_results: 1,
    }));

    await expect(tmdbService.searchTVShows('Talk Show')).resolves.toMatchObject({
      results: [{ id: 2, name: 'Talk Show', genre_ids: [10767] }],
    });

    const requestUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/search/tv');
    expect(requestUrl.searchParams.has('without_genres')).toBe(false);
  });

  it('filters Talk shows from person TV credits without filtering movie credits', async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith({
      page: 1,
      cast: [
        { id: 1, name: 'Drama Series', character: 'Alex', poster_path: '/drama.jpg', vote_average: 8, genre_ids: [18] },
        { id: 2, name: 'Talk Show', character: 'Host', poster_path: '/talk.jpg', vote_average: 8, genre_ids: [10767] },
        { id: 3, name: 'Another Talk Show', character: 'Himself', poster_path: '/self.jpg', vote_average: 8, genre_ids: [10767] },
        { id: 4, name: 'Guest Talk Show', character: 'Guest', poster_path: '/guest.jpg', vote_average: 8, genre_ids: [10767] },
      ],
      total_pages: 1,
    }));

    await expect(tmdbService.getPersonCredits(10, 'tv')).resolves.toMatchObject({
      results: [
        { id: 1, name: 'Drama Series' },
        { id: 2, name: 'Talk Show' },
        { id: 3, name: 'Another Talk Show' },
      ],
      total_results: 3,
    });
  });

  describe('TMDB account integration', () => {
    beforeEach(() => {
      tmdbService.setApiKey('test-api-key');
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('creates a request token and exchanges approved tokens for sessions', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(responseWith({ request_token: 'request-token' }))
        .mockResolvedValueOnce(responseWith({ session_id: 'session-id' }));

      await expect(tmdbService.createAccountRequestToken()).resolves.toBe('request-token');
      await expect(tmdbService.createAccountSession('request-token')).resolves.toBe('session-id');

      const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
      expect(requestUrl.pathname).toBe('/3/authentication/token/new');
      expect(requestUrl.searchParams.get('api_key')).toBe('test-api-key');

      const sessionRequest = fetchMock.mock.calls[1][1];
      expect(sessionRequest?.method).toBe('POST');
      expect(JSON.parse(String(sessionRequest?.body))).toEqual({ request_token: 'request-token' });
    });

    it('requests account lists with session credentials and correct endpoint paths', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValue(responseWith({
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      }));

      await tmdbService.getAccountList(42, 'watchlist', 'movie', 2, 'session-id');

      const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
      expect(requestUrl.pathname).toBe('/3/account/42/watchlist/movies');
      expect(requestUrl.searchParams.get('session_id')).toBe('session-id');
      expect(requestUrl.searchParams.get('page')).toBe('2');
      expect(requestUrl.searchParams.get('api_key')).toBe('test-api-key');
    });

    it('finds every custom list containing a movie across account-list pages', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(responseWith({
          page: 1,
          results: [{ id: 73, name: 'Favorites' }],
          total_pages: 2,
          total_results: 2,
        }))
        .mockResolvedValueOnce(responseWith({
          page: 2,
          results: [{ id: 74, name: 'Watch later' }],
          total_pages: 2,
          total_results: 2,
        }))
        .mockResolvedValueOnce(responseWith({
          id: 73,
          items: [{ id: 200, title: 'Example movie' }],
        }))
        .mockResolvedValueOnce(responseWith({
          id: 74,
          items: [{ id: 200, title: 'Example movie' }],
        }));

      await expect(tmdbService.getAccountUserListMemberships(42, 'session-id')).resolves.toEqual([
        { listId: 73, mediaIds: [200] },
        { listId: 74, mediaIds: [200] },
      ]);

      const requestUrls = fetchMock.mock.calls.map(([url]) => new URL(String(url)));
      expect(requestUrls.map((url) => url.pathname)).toEqual([
        '/3/account/42/lists',
        '/3/account/42/lists',
        '/3/list/73',
        '/3/list/74',
      ]);
      expect(requestUrls[1].searchParams.get('page')).toBe('2');
      expect(requestUrls.every((url) => url.searchParams.get('session_id') === 'session-id')).toBe(true);
    });

    it('loads the connected account and revokes its session when disconnected', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(responseWith({ id: 42, name: 'Example', username: 'example-user' }))
        .mockResolvedValueOnce(responseWith({ success: true }));

      await expect(tmdbService.getCurrentAccount('session-id')).resolves.toEqual({
        id: 42,
        name: 'Example',
        username: 'example-user',
      });
      await tmdbService.deleteAccountSession('session-id');

      const accountUrl = new URL(String(fetchMock.mock.calls[0][0]));
      expect(accountUrl.pathname).toBe('/3/account');
      expect(accountUrl.searchParams.get('session_id')).toBe('session-id');

      const revokeRequest = fetchMock.mock.calls[1][1];
      expect(revokeRequest?.method).toBe('DELETE');
      expect(JSON.parse(String(revokeRequest?.body))).toEqual({ session_id: 'session-id' });
    });

    it('manages private custom lists and their movie items', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(responseWith({ page: 1, results: [], total_pages: 1, total_results: 0 }))
        .mockResolvedValueOnce(responseWith({ list_id: 73, success: true }))
        .mockResolvedValueOnce(responseWith({ status_code: 1, status_message: 'Success.' }))
        .mockResolvedValueOnce(responseWith({ status_code: 1, status_message: 'Success.' }))
        .mockResolvedValueOnce(responseWith({ status_code: 13, status_message: 'The item/record was deleted successfully.' }));

      await tmdbService.getAccountLists(42, 1, 'session-id');
      await tmdbService.createUserList('Favorites', 'A private list', false, 'session-id');
      await tmdbService.addMediaToUserList(73, 200, 'session-id');
      await tmdbService.removeMediaFromUserList(73, 200, 'session-id');
      await tmdbService.deleteUserList(73, 'session-id');

      const listUrl = new URL(String(fetchMock.mock.calls[0][0]));
      expect(listUrl.pathname).toBe('/3/account/42/lists');
      expect(listUrl.searchParams.get('page')).toBe('1');
      expect(listUrl.searchParams.get('session_id')).toBe('session-id');

      const createRequest = fetchMock.mock.calls[1][1];
      expect(new URL(String(fetchMock.mock.calls[1][0])).pathname).toBe('/3/list');
      expect(JSON.parse(String(createRequest?.body))).toEqual({
        name: 'Favorites',
        description: 'A private list',
        language: 'en',
        public: false,
      });

      expect(new URL(String(fetchMock.mock.calls[2][0])).pathname).toBe('/3/list/73/add_item');
      expect(fetchMock.mock.calls[2][1]?.method).toBe('POST');
      expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({ media_id: 200 });
      expect(new URL(String(fetchMock.mock.calls[3][0])).pathname).toBe('/3/list/73/remove_item');
      expect(fetchMock.mock.calls[3][1]?.method).toBe('POST');
      expect(JSON.parse(String(fetchMock.mock.calls[3][1]?.body))).toEqual({ media_id: 200 });
      expect(new URL(String(fetchMock.mock.calls[4][0])).pathname).toBe('/3/list/73');
      expect(fetchMock.mock.calls[4][1]?.method).toBe('DELETE');
    });

    it('loads custom list details with the connected account session', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValue(responseWith({
        id: 73,
        name: 'Favorites',
        description: '',
        item_count: 1,
        favorite_count: 0,
        poster_path: null,
        iso_639_1: 'en',
        items: [{
          id: 200,
          title: 'Example movie',
          poster_path: '/example.jpg',
          backdrop_path: null,
          overview: 'Example overview',
          release_date: '2024-01-01',
          vote_average: 7.5,
          vote_count: 100,
        }],
      }));

      await expect(tmdbService.getUserList(73, 'session-id')).resolves.toMatchObject({
        item_count: 1,
        items: [{ id: 200, title: 'Example movie' }],
      });

      const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
      expect(requestUrl.pathname).toBe('/3/list/73');
      expect(requestUrl.searchParams.get('session_id')).toBe('session-id');
    });

    it('loads a media title account state for favorite, watchlist, and rating feedback', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValue(responseWith({
        favorite: true,
        watchlist: false,
        rated: { value: 8.5 },
      }));

      await expect(tmdbService.getMediaAccountState('movie', 200, 'session-id')).resolves.toEqual({
        favorite: true,
        watchlist: false,
        rated: { value: 8.5 },
      });

      const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
      expect(requestUrl.pathname).toBe('/3/movie/200/account_states');
      expect(requestUrl.searchParams.get('session_id')).toBe('session-id');
    });

    it('sends favorite and rating changes through TMDB account endpoints', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(responseWith({ status_code: 1, status_message: 'Success.' }))
        .mockResolvedValueOnce(responseWith({ status_code: 1, status_message: 'Success.' }));

      await tmdbService.setAccountFavorite(42, 'tv', 100, true, 'session-id');
      await tmdbService.rateMedia('movie', 200, 8.5, 'session-id');

      const favoriteUrl = new URL(String(fetchMock.mock.calls[0][0]));
      expect(favoriteUrl.pathname).toBe('/3/account/42/favorite');
      expect(favoriteUrl.searchParams.get('session_id')).toBe('session-id');
      expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
        media_type: 'tv',
        media_id: 100,
        favorite: true,
      });

      const ratingUrl = new URL(String(fetchMock.mock.calls[1][0]));
      expect(ratingUrl.pathname).toBe('/3/movie/200/rating');
      expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ value: 8.5 });
    });

    it('rejects invalid ratings before making a request', async () => {
      const fetchMock = vi.mocked(fetch);

      await expect(tmdbService.rateMedia('movie', 200, 8.25, 'session-id')).rejects.toThrow(RangeError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('filters Talk shows from combined person credits', async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith({
      id: 10,
      name: 'Person',
      biography: '',
      birthday: null,
      deathday: null,
      place_of_birth: null,
      profile_path: null,
      known_for_department: 'Acting',
      combined_credits: {
        cast: [
          { id: 1, name: 'Drama Series', media_type: 'tv', character: 'Alex', popularity: 1, poster_path: '/drama.jpg', vote_average: 8, genre_ids: [18] },
          { id: 2, name: 'Talk Show', media_type: 'tv', character: 'Host', popularity: 1, poster_path: '/talk.jpg', vote_average: 8, genre_ids: [10767] },
          { id: 3, name: 'Guest Talk Show', media_type: 'tv', character: 'Guest', popularity: 1, poster_path: '/guest.jpg', vote_average: 8, genre_ids: [10767] },
          { id: 4, title: 'Movie', media_type: 'movie', character: 'Alex', popularity: 1, poster_path: '/movie.jpg', vote_average: 8 },
        ],
      },
    }));

    await expect(tmdbService.getPersonDetails(10)).resolves.toMatchObject({
      combined_credits: {
        cast: [
          { id: 1, name: 'Drama Series' },
          { id: 2, name: 'Talk Show' },
          { id: 4, title: 'Movie' },
        ],
      },
    });
  });

  it('filters Talk shows from TV recommendations and similar titles', async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith({
      id: 10,
      name: 'Drama Series',
      poster_path: null,
      backdrop_path: null,
      overview: '',
      first_air_date: '',
      vote_count: 0,
      recommendations: {
        results: [
          { id: 1, name: 'Drama Series', genre_ids: [18] },
          { id: 2, name: 'Talk Show', genre_ids: [10767] },
        ],
      },
      similar: {
        results: [{ id: 3, name: 'Similar Talk Show', genre_ids: [10767] }],
      },
    }));

    await expect(tmdbService.getTVShowDetails(10)).resolves.toMatchObject({
      recommendations: { results: [{ id: 1, name: 'Drama Series' }] },
      similar: { results: [] },
    });
  });
});
