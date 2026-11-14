import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import categoryHandler from '../../api/tmdb/category';
import { tmdbService } from '../../src/lib/tmdb';

class MockResponse {
  statusCode = 200;
  headers: Record<string, string> = {};
  body: unknown;

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string): this {
    this.headers[name] = value;
    return this;
  }

  json(body: unknown): this {
    this.body = body;
    return this;
  }
}

describe('TMDB public list routing', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('TMDB_API_KEY', 'server-key');
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      page: 1,
      results: [
        { id: 1, name: 'Drama', genre_ids: [18] },
        { id: 2, name: 'Talk Show', genre_ids: [10767] },
      ],
      total_pages: 1,
      total_results: 2,
    }))));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('routes trending TV and people lists through the category API', async () => {
    const tvShows = await tmdbService.getTrendingTVShows();
    const popularPeople = await tmdbService.getPopularPersons(2);
    const trendingPeople = await tmdbService.getTrendingPersons(3);

    expect(tvShows).toHaveLength(1);
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.map(([url]) => url)).toEqual([
      '/api/tmdb/category?category=trending-tv&page=1',
      '/api/tmdb/category?category=popular-people&page=2',
      '/api/tmdb/category?category=trending-people&page=3',
    ]);
    expect(popularPeople.page).toBe(1);
    expect(trendingPeople.page).toBe(1);
  });

  it.each([
    ['popular-people', '/3/person/popular'],
    ['trending-people', '/3/trending/person/day'],
  ])('maps %s to the fixed TMDB list route', async (category, expectedPath) => {
    const response = new MockResponse();
    await categoryHandler({
      method: 'GET',
      query: { category, page: '2' },
    }, response);

    expect(response.statusCode).toBe(200);
    const [url] = vi.mocked(fetch).mock.calls[0];
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.pathname).toBe(expectedPath);
    expect(parsedUrl.searchParams.get('page')).toBe('2');
    expect(parsedUrl.searchParams.get('api_key')).toBe('server-key');
  });
});
