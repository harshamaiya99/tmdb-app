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
