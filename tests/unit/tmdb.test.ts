import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  filterPersonCredits,
  interleaveAccountMedia,
  sortPersonCredits,
  tmdbService,
  type Movie,
  type PersonCredit,
  type TVShow,
} from '@/lib/tmdb';

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
    vi.unstubAllEnvs();
  });

  it('loads home trending movies through the Vercel API outside development', async () => {
    vi.stubEnv('DEV', false);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 1,
      results: [{ id: 1, title: 'Trending Movie' }],
      total_pages: 1,
      total_results: 1,
    }));

    await expect(tmdbService.getTrendingMovies()).resolves.toEqual([
      { id: 1, title: 'Trending Movie' },
    ]);

    expect(fetchMock).toHaveBeenCalledWith('/api/tmdb/trending-movies', {
      signal: undefined,
    });
  });

  it('loads paginated category results through the Vercel API outside development', async () => {
    vi.stubEnv('DEV', false);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 2,
      results: [{ id: 1, name: 'Popular show', genre_ids: [18] }],
      total_pages: 3,
      total_results: 60,
    }));

    await expect(tmdbService.getCategoryList(
      'popular-tv',
      2,
      undefined,
      'en-US',
      'popularity.desc',
      'IN',
    )).resolves.toMatchObject({
      page: 2,
      results: [{ id: 1, name: 'Popular show', genre_ids: [18] }],
    });

    const [requestUrl] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe(
      '/api/tmdb/category?category=popular-tv&page=2&sortBy=popularity.desc&language=en-US&region=IN',
    );
  });

  it('filters talk shows from Vercel TV category responses', async () => {
    vi.stubEnv('DEV', false);
    vi.mocked(fetch).mockResolvedValue(responseWith({
      page: 1,
      results: [
        { id: 1, name: 'Drama', genre_ids: [18] },
        { id: 2, name: 'Talk Show', genre_ids: [10767] },
      ],
      total_pages: 1,
      total_results: 2,
    }));

    await expect(tmdbService.getCategoryList('popular-tv')).resolves.toMatchObject({
      results: [{ id: 1, name: 'Drama', genre_ids: [18] }],
      total_results: 2,
    });
  });

  it('routes movie and multi-search through the Vercel API in deployed builds', async () => {
    vi.stubEnv('DEV', false);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async () => responseWith({
      page: 1,
      results: [{ id: 1, title: 'Example' }],
    }));

    await tmdbService.searchMovies('Example', 2, undefined, 'IN');
    await tmdbService.searchMulti('Example show', 1);

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/tmdb/search?type=movie&query=Example&page=2&region=IN',
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      '/api/tmdb/search?type=multi&query=Example+show&page=1',
    );
  });

  it('preserves search spacing fallback through the Vercel API', async () => {
    vi.stubEnv('DEV', false);
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(responseWith({ page: 1, results: [] }))
      .mockResolvedValueOnce(responseWith({
        page: 1,
        results: [{ id: 1, title: 'Ice Age' }],
      }));

    await expect(tmdbService.searchMovies('iceage')).resolves.toMatchObject({
      results: [{ id: 1, title: 'Ice Age' }],
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/tmdb/search?type=movie&query=iceage&page=1',
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      '/api/tmdb/search?type=movie&query=ice+age&page=1',
    );
  });

  it('routes movie and TV detail requests through the Vercel media API', async () => {
    vi.stubEnv('DEV', false);
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(responseWith({ id: 10, title: 'Movie' }))
      .mockResolvedValueOnce(responseWith({
        id: 11,
        name: 'Show',
        recommendations: { results: [{ id: 12, genre_ids: [18] }] },
        similar: { results: [{ id: 13, genre_ids: [10767] }] },
      }));

    await tmdbService.getMovieDetails(10);
    await expect(tmdbService.getTVShowDetails(11)).resolves.toMatchObject({
      recommendations: { results: [{ id: 12 }] },
      similar: { results: [] },
    });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/tmdb/media?resource=movie&id=10');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/tmdb/media?resource=tv&id=11');
  });

  it('passes cancellation signals to the Vercel trending movies API', async () => {
    vi.stubEnv('DEV', false);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({ page: 1, results: [] }));
    const controller = new AbortController();

    await tmdbService.getTrendingMovies({ signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith('/api/tmdb/trending-movies', {
      signal: controller.signal,
    });
  });

  it('normalizes failed Vercel trending movies responses', async () => {
    vi.stubEnv('DEV', false);
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 502 }));

    await expect(tmdbService.getTrendingMovies()).rejects.toMatchObject({
      name: 'TMDBError',
      code: 'API_ERROR',
      status: 502,
    });
  });

  it('interleaves separately newest-first account media results', () => {
    const movies = [
      { id: 1, title: 'Movie 1', poster_path: null, backdrop_path: null, overview: '', release_date: '', vote_count: 0 },
      { id: 2, title: 'Movie 2', poster_path: null, backdrop_path: null, overview: '', release_date: '', vote_count: 0 },
      { id: 3, title: 'Movie 3', poster_path: null, backdrop_path: null, overview: '', release_date: '', vote_count: 0 },
    ] satisfies Movie[];
    const shows = [
      { id: 10, name: 'Show 1', poster_path: null, backdrop_path: null, overview: '', first_air_date: '', vote_count: 0 },
      { id: 20, name: 'Show 2', poster_path: null, backdrop_path: null, overview: '', first_air_date: '', vote_count: 0 },
    ] satisfies TVShow[];

    expect(interleaveAccountMedia(movies, shows).map(({ item, mediaType }) => [
      item.id,
      mediaType,
    ])).toEqual([
      [1, 'movie'],
      [10, 'tv'],
      [2, 'movie'],
      [20, 'tv'],
      [3, 'movie'],
    ]);
  });

  it('loads country choices from TMDB configuration', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith([
      { iso_3166_1: 'IN', english_name: 'India', native_name: 'भारत' },
    ]));

    await expect(tmdbService.getCountries()).resolves.toEqual([
      { iso_3166_1: 'IN', english_name: 'India', native_name: 'भारत' },
    ]);
    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe('/3/configuration/countries');
  });

  it('includes release dates in movie details for certification display', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      id: 200,
      title: 'Example movie',
      release_dates: {
        results: [{
          iso_3166_1: 'US',
          release_dates: [{ certification: 'PG-13', type: 3 }],
        }],
      },
    }));

    await expect(tmdbService.getMovieDetails(200)).resolves.toMatchObject({
      release_dates: {
        results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'PG-13', type: 3 }] }],
      },
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/movie/200');
    expect(requestUrl.searchParams.get('append_to_response')).toContain('release_dates');
    expect(requestUrl.searchParams.get('append_to_response')).toContain('images');
  });

  it('includes content ratings in TV details for certification display', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      id: 1399,
      name: 'Example show',
      content_ratings: {
        results: [{ iso_3166_1: 'US', rating: 'TV-MA' }],
      },
    }));

    await expect(tmdbService.getTVShowDetails(1399)).resolves.toMatchObject({
      content_ratings: {
        results: [{ iso_3166_1: 'US', rating: 'TV-MA' }],
      },
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/tv/1399');
    expect(requestUrl.searchParams.get('append_to_response')).toContain('content_ratings');
    expect(requestUrl.searchParams.get('append_to_response')).toContain('images');
  });

  it('uses the selected region for movie searches', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 1,
      results: [{ id: 200, title: 'Example movie' }],
      total_pages: 1,
      total_results: 1,
    }));

    await tmdbService.searchMovies('Example', 1, undefined, 'IN');

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/search/movie');
    expect(requestUrl.searchParams.get('region')).toBe('IN');
  });

  it('fetches paginated movie releases within a date range and region', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 2,
      results: [{ id: 200, title: 'Example movie', release_date: '2026-11-07' }],
      total_pages: 3,
      total_results: 45,
    }));

    await expect(tmdbService.getMoviesByReleaseDateRange('2026-11-01', '2026-11-30', 2, undefined, 'IN'))
      .resolves.toMatchObject({ page: 2, total_pages: 3, total_results: 45 });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/discover/movie');
    expect(requestUrl.searchParams.get('primary_release_date.gte')).toBe('2026-11-01');
    expect(requestUrl.searchParams.get('primary_release_date.lte')).toBe('2026-11-30');
    expect(requestUrl.searchParams.get('sort_by')).toBe('popularity.desc');
    expect(requestUrl.searchParams.get('page')).toBe('2');
    expect(requestUrl.searchParams.get('region')).toBe('IN');
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

  it('loads the paginated daily trending TV endpoint and excludes Talk shows', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 2,
      results: [{ id: 2, name: 'Talk Show', genre_ids: [10767] }],
      total_pages: 1,
      total_results: 1,
    }));

    await expect(tmdbService.getCategoryList('trending-tv', 2)).resolves.toMatchObject({
      page: 2,
      results: [],
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/trending/tv/day');
    expect(requestUrl.searchParams.get('page')).toBe('2');
    expect(requestUrl.searchParams.has('without_genres')).toBe(false);
  });

  it('loads the same daily trending movie endpoint for the paginated category', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 2,
      results: [{ id: 1, title: 'Trending Movie' }],
      total_pages: 5,
      total_results: 100,
    }));

    await expect(tmdbService.getCategoryList('trending-movies', 2)).resolves.toMatchObject({
      page: 2,
      results: [{ id: 1, title: 'Trending Movie' }],
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/trending/movie/day');
    expect(requestUrl.searchParams.get('page')).toBe('2');
  });

  it('combines discovery filters for company and provider lists', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 2,
      results: [{ id: 1, title: 'Filtered movie' }],
      total_pages: 4,
      total_results: 70,
    }));

    await tmdbService.getFilteredMediaList({
      mediaType: 'movie',
      page: 2,
      companyId: 12,
      providerId: 8,
      genreId: 28,
      language: 'ja',
      sortBy: 'vote_average.desc',
      region: 'JP',
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/discover/movie');
    expect(requestUrl.searchParams.get('with_companies')).toBe('12');
    expect(requestUrl.searchParams.get('with_watch_providers')).toBe('8');
    expect(requestUrl.searchParams.get('watch_region')).toBe('JP');
    expect(requestUrl.searchParams.get('with_genres')).toBe('28');
    expect(requestUrl.searchParams.get('with_original_language')).toBe('ja');
    expect(requestUrl.searchParams.get('sort_by')).toBe('vote_average.desc');
    expect(requestUrl.searchParams.get('page')).toBe('2');
  });

  it('keeps category constraints when discovering filtered now-playing and upcoming movies', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(responseWith({
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      }))
      .mockResolvedValueOnce(responseWith({
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      }));

    await tmdbService.getFilteredMediaList({
      mediaType: 'movie',
      page: 1,
      category: 'now-playing-movies',
      genreId: 28,
      region: 'IN',
    });
    await tmdbService.getFilteredMediaList({
      mediaType: 'movie',
      page: 1,
      category: 'upcoming-movies',
      language: 'hi',
    });

    const nowPlayingUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(nowPlayingUrl.searchParams.get('with_genres')).toBe('28');
    expect(nowPlayingUrl.searchParams.get('with_release_type')).toBe('2|3');
    expect(nowPlayingUrl.searchParams.get('region')).toBe('IN');
    expect(nowPlayingUrl.searchParams.get('primary_release_date.gte')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(nowPlayingUrl.searchParams.get('primary_release_date.lte')).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const upcomingUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(upcomingUrl.searchParams.get('with_original_language')).toBe('hi');
    expect(upcomingUrl.searchParams.get('primary_release_date.gte')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('applies discovery sort and Talk-show exclusion to filtered Trending TV', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 1,
      results: [{ id: 1, name: 'Drama', genre_ids: [18] }],
      total_pages: 1,
      total_results: 1,
    }));

    await tmdbService.getFilteredMediaList({
      mediaType: 'tv',
      page: 1,
      genreId: 18,
      language: 'ko',
      sortBy: 'first_air_date.desc',
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/discover/tv');
    expect(requestUrl.searchParams.get('with_genres')).toBe('18');
    expect(requestUrl.searchParams.get('with_original_language')).toBe('ko');
    expect(requestUrl.searchParams.get('without_genres')).toBe('10767');
    expect(requestUrl.searchParams.get('sort_by')).toBe('first_air_date.desc');
  });

  it('discovers paginated movies by original language', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 2,
      results: [{ id: 1, title: 'French Movie' }],
      total_pages: 3,
      total_results: 45,
    }));

    await expect(tmdbService.getMediaByOriginalLanguage('movie', 'fr', 2, undefined, 'vote_average.desc'))
      .resolves.toMatchObject({ page: 2, total_pages: 3, total_results: 45 });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/discover/movie');
    expect(requestUrl.searchParams.get('with_original_language')).toBe('fr');
    expect(requestUrl.searchParams.get('sort_by')).toBe('vote_average.desc');
    expect(requestUrl.searchParams.get('page')).toBe('2');
  });

  it('excludes Talk shows from TV results discovered by original language', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 1,
      results: [
        { id: 1, name: 'French Series', genre_ids: [18] },
        { id: 2, name: 'French Talk Show', genre_ids: [10767] },
      ],
      total_pages: 1,
      total_results: 2,
    }));

    await expect(tmdbService.getMediaByOriginalLanguage('tv', 'fr')).resolves.toMatchObject({
      results: [{ id: 1, name: 'French Series', genre_ids: [18] }],
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/discover/tv');
    expect(requestUrl.searchParams.get('with_original_language')).toBe('fr');
    expect(requestUrl.searchParams.get('without_genres')).toBe('10767');
  });

  it('loads paginated daily trending people', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 2,
      results: [{ id: 1, name: 'Trending Person' }],
      total_pages: 5,
      total_results: 100,
    }));

    await expect(tmdbService.getTrendingPersons(2)).resolves.toMatchObject({
      page: 2,
      results: [{ id: 1, name: 'Trending Person' }],
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/trending/person/day');
    expect(requestUrl.searchParams.get('page')).toBe('2');
  });

  it('loads the selected popular and in-theaters category endpoints', async () => {
    const fetchMock = vi.mocked(fetch);
    const response = {
      page: 1,
      results: [],
      total_pages: 1,
      total_results: 0,
    };
    fetchMock
      .mockResolvedValueOnce(responseWith(response))
      .mockResolvedValueOnce(responseWith(response))
      .mockResolvedValueOnce(responseWith(response))
      .mockResolvedValueOnce(responseWith(response));

    await tmdbService.getCategoryList('popular-movies');
    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe('/3/movie/popular');

    await tmdbService.getCategoryList('now-playing-movies');
    expect(new URL(String(fetchMock.mock.calls[1][0])).pathname).toBe('/3/movie/now_playing');

    await tmdbService.getCategoryList('now-playing-movies', 1, undefined, undefined, undefined, 'IN');
    expect(new URL(String(fetchMock.mock.calls[2][0])).searchParams.get('region')).toBe('IN');

    await tmdbService.getCategoryList('trending-streaming-movies', 1, undefined, undefined, undefined, 'IN');
    expect(new URL(String(fetchMock.mock.calls[3][0])).searchParams.get('watch_region')).toBe('IN');
  });

  it('loads the popular TV endpoint and filters Talk shows', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(responseWith({
      page: 1,
      results: [{ id: 2, name: 'Talk Show', genre_ids: [10767] }],
      total_pages: 1,
      total_results: 1,
    }));

    await expect(tmdbService.getCategoryList('popular-tv')).resolves.toMatchObject({ results: [] });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/tv/popular');
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

  it('discovers TV shows by company and provider while excluding Talk shows', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(responseWith({
        page: 1,
        results: [
          { id: 1, name: 'Drama Series', genre_ids: [18] },
          { id: 2, name: 'Talk Show', genre_ids: [10767] },
        ],
        total_pages: 1,
        total_results: 2,
      }))
      .mockResolvedValueOnce(responseWith({
        page: 1,
        results: [{ id: 3, name: 'Another Series', genre_ids: [18] }],
        total_pages: 1,
        total_results: 1,
      }));

    await expect(tmdbService.getTVShowsByCompany(42, 2, undefined, 'en')).resolves.toMatchObject({
      results: [{ id: 1, name: 'Drama Series' }],
    });
    await expect(tmdbService.getTVShowsByProvider(8, 3, undefined, undefined, undefined, 'IN')).resolves.toMatchObject({
      results: [{ id: 3, name: 'Another Series' }],
    });

    const companyUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(companyUrl.pathname).toBe('/3/discover/tv');
    expect(companyUrl.searchParams.get('with_companies')).toBe('42');
    expect(companyUrl.searchParams.get('with_original_language')).toBe('en');
    expect(companyUrl.searchParams.get('without_genres')).toBe('10767');
    expect(companyUrl.searchParams.get('page')).toBe('2');

    const providerUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(providerUrl.pathname).toBe('/3/discover/tv');
    expect(providerUrl.searchParams.get('with_watch_providers')).toBe('8');
    expect(providerUrl.searchParams.get('watch_region')).toBe('IN');
    expect(providerUrl.searchParams.get('without_genres')).toBe('10767');
    expect(providerUrl.searchParams.get('page')).toBe('3');
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

  it('loads paginated movie recommendations and similar titles', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async () => responseWith({
      page: 2,
      results: [{ id: 20, title: 'Related Movie' }],
      total_pages: 4,
      total_results: 80,
    }));

    await expect(tmdbService.getMovieRecommendations(10, 2)).resolves.toMatchObject({
      page: 2,
      total_pages: 4,
      total_results: 80,
      results: [{ id: 20, title: 'Related Movie' }],
    });
    await tmdbService.getSimilarMovies(10, 3);

    const recommendationsUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(recommendationsUrl.pathname).toBe('/3/movie/10/recommendations');
    expect(recommendationsUrl.searchParams.get('page')).toBe('2');
    const similarUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(similarUrl.pathname).toBe('/3/movie/10/similar');
    expect(similarUrl.searchParams.get('page')).toBe('3');
  });

  it('loads paginated TV recommendations and similar titles without Talk shows', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async () => responseWith({
      page: 2,
      results: [
        { id: 20, name: 'Drama Series', genre_ids: [18] },
        { id: 21, name: 'Talk Show', genre_ids: [10767] },
      ],
      total_pages: 4,
      total_results: 80,
    }));

    await expect(tmdbService.getTVShowRecommendations(10, 2)).resolves.toMatchObject({
      page: 2,
      total_pages: 4,
      total_results: 80,
      results: [{ id: 20, name: 'Drama Series' }],
    });
    await tmdbService.getSimilarTVShows(10, 3);

    const recommendationsUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(recommendationsUrl.pathname).toBe('/3/tv/10/recommendations');
    expect(recommendationsUrl.searchParams.get('page')).toBe('2');
    const similarUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(similarUrl.pathname).toBe('/3/tv/10/similar');
    expect(similarUrl.searchParams.get('page')).toBe('3');
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
      crew: [
        { id: 5, name: 'Talk Show Producer', job: 'Producer', poster_path: '/producer.jpg', vote_average: 8, genre_ids: [10767] },
        { id: 6, name: 'Talk Show Host', job: 'Host', poster_path: '/host.jpg', vote_average: 8, genre_ids: [10767] },
      ],
      total_pages: 1,
    }));

    await expect(tmdbService.getPersonCredits(10, 'tv')).resolves.toMatchObject({
      results: [
        { id: 1, name: 'Drama Series' },
        { id: 2, name: 'Talk Show' },
        { id: 3, name: 'Another Talk Show' },
        { id: 6, name: 'Talk Show Host', job: 'Host' },
      ],
      total_results: 4,
    });
  });

  it('combines cast and crew credits in person media lists', async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith({
      page: 1,
      cast: [
        { id: 1, title: 'Movie Cast', character: 'Alex', poster_path: '/cast.jpg', vote_average: 8, popularity: 2 },
        { id: 3, title: 'Movie Both', character: 'Sam', poster_path: '/both.jpg', vote_average: 8, popularity: 3 },
      ],
      crew: [
        { id: 2, title: 'Movie Crew', job: 'Director', department: 'Directing', poster_path: '/crew.jpg', vote_average: 8, popularity: 1 },
        { id: 3, title: 'Movie Both', job: 'Writer', department: 'Writing', poster_path: '/both.jpg', vote_average: 8, popularity: 3 },
      ],
    }));

    await expect(tmdbService.getPersonCredits(10, 'movie')).resolves.toMatchObject({
      page: 1,
      total_pages: 1,
      results: [
        { id: 1, character: 'Alex' },
        { id: 3, character: 'Sam', job: 'Writer' },
        { id: 2, job: 'Director' },
      ],
      total_results: 3,
    });

    const requestUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/3/person/10/movie_credits');
    expect(requestUrl.searchParams.has('page')).toBe(false);
  });

  it('orders person credits by known-for department, retaining popularity within each group', () => {
    const credits: PersonCredit[] = [
      { id: 1, title: 'Crew low', media_type: 'movie', poster_path: '/1.jpg', vote_average: 0, popularity: 1, job: 'Director' },
      { id: 2, title: 'Cast low', media_type: 'movie', poster_path: '/2.jpg', vote_average: 0, popularity: 1, character: 'Alex' },
      { id: 3, title: 'Crew high', media_type: 'movie', poster_path: '/3.jpg', vote_average: 0, popularity: 3, job: 'Writer' },
      { id: 4, title: 'Cast high', media_type: 'movie', poster_path: '/4.jpg', vote_average: 0, popularity: 3, character: 'Sam' },
    ];

    expect(sortPersonCredits(credits, 'Acting').map(({ id }) => id)).toEqual([4, 2, 3, 1]);
    expect(sortPersonCredits(credits, 'Directing').map(({ id }) => id)).toEqual([3, 1, 4, 2]);
  });

  it('filters person credits by genre and language and sorts within known-for groups', () => {
    const credits: PersonCredit[] = [
      { id: 1, title: 'English Cast', media_type: 'movie', poster_path: '/1.jpg', vote_average: 7, popularity: 1, character: 'Alex', genre_ids: [18], original_language: 'en' },
      { id: 2, title: 'French Cast', media_type: 'movie', poster_path: '/2.jpg', vote_average: 9, popularity: 3, character: 'Sam', genre_ids: [35], original_language: 'fr' },
      { id: 3, title: 'English Crew', media_type: 'movie', poster_path: '/3.jpg', vote_average: 8, popularity: 2, job: 'Director', genre_ids: [18], original_language: 'en' },
    ];

    const filtered = filterPersonCredits(credits, 18, 'en');
    expect(filtered.map(({ id }) => id)).toEqual([1, 3]);
    expect(sortPersonCredits(filtered, 'Acting', 'vote_average.desc').map(({ id }) => id)).toEqual([1, 3]);
    expect(sortPersonCredits(filtered, 'Directing', 'vote_average.desc').map(({ id }) => id)).toEqual([3, 1]);
  });

  describe('server-side TMDB account requests', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('sends account-list requests through the same-origin server without user credentials', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValue(responseWith({
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      }));

      await tmdbService.getAccountList('watchlist', 'movie', 2);

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toBe('/api/account/action');
      const request = fetchMock.mock.calls[0][1];
      expect(request?.method).toBe('POST');
      expect(request?.credentials).toBe('same-origin');
      expect(JSON.parse(String(request?.body))).toEqual({
        operation: 'get-account-list',
        section: 'watchlist',
        mediaType: 'movie',
        page: 2,
      });
    });

    it('sends custom-list actions through the server and excludes bearer tokens', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValue(responseWith({ id: 73, success: true }));

      await tmdbService.createUserList('Favorites', 'Private', false, 'US');

      expect(fetchMock.mock.calls[0][0]).toBe('/api/account/action');
      expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
        operation: 'create-user-list',
        name: 'Favorites',
        description: 'Private',
        isPublic: false,
        region: 'US',
      });
    });

    it('rejects invalid ratings before contacting the account service', async () => {
      const fetchMock = vi.mocked(fetch);
      await expect(tmdbService.rateMedia('movie', 200, 8.25)).rejects.toThrow(RangeError);
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
        crew: [
          { id: 5, name: 'Talk Show', media_type: 'tv', job: 'Producer', department: 'Production', popularity: 1, poster_path: '/talk.jpg', vote_average: 8, genre_ids: [10767] },
          { id: 6, name: 'Hosted Talk Show', media_type: 'tv', job: 'Host', department: 'Crew', popularity: 1, poster_path: '/host.jpg', vote_average: 8, genre_ids: [10767] },
          { id: 7, title: 'Movie', media_type: 'movie', job: 'Director', department: 'Directing', popularity: 1, poster_path: '/movie.jpg', vote_average: 8 },
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
        crew: [
          { id: 6, name: 'Hosted Talk Show', job: 'Host' },
          { id: 7, title: 'Movie', job: 'Director' },
        ],
      },
    });
  });

  it('loads TV production and provider details and filters Talk shows from recommendations', async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith({
      id: 10,
      name: 'Drama Series',
      poster_path: null,
      backdrop_path: null,
      overview: '',
      first_air_date: '',
      vote_count: 0,
      production_companies: [{ id: 5, name: 'Studio', logo_path: '/studio.png', origin_country: 'US' }],
      images: {
        backdrops: [{ file_path: '/backdrop.jpg', aspect_ratio: 1.78, height: 1080, width: 1920 }],
        posters: [{ file_path: '/poster.jpg', aspect_ratio: 0.67, height: 1500, width: 1000 }],
        logos: [{ file_path: '/logo.png', aspect_ratio: 2, height: 500, width: 1000 }],
      },
      'watch/providers': {
        results: {
          US: {
            link: 'https://www.themoviedb.org/tv/10/watch',
            flatrate: [{ provider_id: 8, provider_name: 'Stream', logo_path: '/stream.png' }],
          },
        },
      },
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
      production_companies: [{ id: 5, name: 'Studio' }],
      images: {
        backdrops: [{ file_path: '/backdrop.jpg' }],
        posters: [{ file_path: '/poster.jpg' }],
        logos: [{ file_path: '/logo.png' }],
      },
      'watch/providers': {
        results: { US: { flatrate: [{ provider_id: 8, provider_name: 'Stream' }] } },
      },
      recommendations: { results: [{ id: 1, name: 'Drama Series' }] },
      similar: { results: [] },
    });
    const requestUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(requestUrl.searchParams.get('append_to_response')).toContain('watch/providers');
    expect(requestUrl.searchParams.get('append_to_response')).toContain('similar');
  });
});
