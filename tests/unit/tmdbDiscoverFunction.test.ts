import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/tmdb/discover';

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

function request(query: Record<string, string | string[]> = {}, method = 'GET') {
  return { method, query };
}

describe('TMDB discovery Vercel function', () => {
  beforeEach(() => {
    vi.stubEnv('TMDB_API_KEY', 'server-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ page: 1, results: [] })),
    ));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('combines allowlisted discovery filters into a fixed movie route', async () => {
    const response = new MockResponse();
    await handler(request({
      mediaType: 'movie',
      page: '3',
      sort_by: 'vote_average.desc',
      with_genres: '18',
      with_original_language: 'en',
      with_companies: '420',
      with_watch_providers: '8',
      watch_region: 'US',
      region: 'IN',
    }), response);

    expect(response.statusCode).toBe(200);
    expect(response.headers['Cache-Control']).toBe('no-store');
    const [url] = vi.mocked(fetch).mock.calls[0];
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.pathname).toBe('/3/discover/movie');
    expect(parsedUrl.searchParams.get('api_key')).toBe('server-key');
    expect(parsedUrl.searchParams.get('page')).toBe('3');
    expect(parsedUrl.searchParams.get('with_genres')).toBe('18');
    expect(parsedUrl.searchParams.get('with_companies')).toBe('420');
    expect(parsedUrl.searchParams.get('with_watch_providers')).toBe('8');
    expect(parsedUrl.searchParams.get('sort_by')).toBe('vote_average.desc');
  });

  it('maps release-date ranges to paginated movie discovery', async () => {
    const response = new MockResponse();
    await handler(request({
      mode: 'release-date-range',
      mediaType: 'movie',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      page: '2',
      region: 'IN',
    }), response);

    const [url] = vi.mocked(fetch).mock.calls[0];
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.pathname).toBe('/3/discover/movie');
    expect(parsedUrl.searchParams.get('primary_release_date.gte')).toBe('2026-10-01');
    expect(parsedUrl.searchParams.get('primary_release_date.lte')).toBe('2026-10-31');
    expect(parsedUrl.searchParams.get('sort_by')).toBe('popularity.desc');
    expect(parsedUrl.searchParams.get('region')).toBe('IN');
    expect(parsedUrl.searchParams.get('page')).toBe('2');
  });

  it.each([
    [{ mediaType: 'person' }],
    [{ mediaType: 'movie', page: '501' }],
    [{ mediaType: 'tv', with_companies: '1&api_key=bad' }],
    [{ mediaType: 'movie', sort_by: 'arbitrary.desc' }],
    [{ mediaType: 'movie', arbitrary: '/account' }],
    [{ mode: 'release-date-range', mediaType: 'movie', startDate: '2026-02-30', endDate: '2026-03-01' }],
    [{ mode: 'release-date-range', mediaType: 'movie', startDate: '2026-03-02', endDate: '2026-03-01' }],
  ])('rejects invalid discovery input %o', async (query) => {
    const response = new MockResponse();
    await handler(request(query), response);
    expect(response.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects methods other than GET', async () => {
    const response = new MockResponse();
    await handler(request({}, 'POST'), response);
    expect(response.statusCode).toBe(405);
    expect(response.headers.Allow).toBe('GET');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports an unconfigured server credential without making a TMDB request', async () => {
    vi.stubEnv('TMDB_API_KEY', '');
    const response = new MockResponse();
    await handler(request({ mediaType: 'movie' }), response);
    expect(response.statusCode).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns a gateway error when TMDB fails', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 500 }));
    const response = new MockResponse();
    await handler(request({ mediaType: 'movie' }), response);
    expect(response.statusCode).toBe(502);
  });
});
