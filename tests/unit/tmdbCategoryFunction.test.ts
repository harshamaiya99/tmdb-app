import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/tmdb/category';

declare const process: {
  env: Record<string, string | undefined>;
};

function createResponseMock() {
  const response = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };

  return response;
}

describe('TMDB category function', () => {
  const originalApiKey = process.env.TMDB_API_KEY;

  beforeEach(() => {
    process.env.TMDB_API_KEY = 'server-api-key';
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.TMDB_API_KEY;
    } else {
      process.env.TMDB_API_KEY = originalApiKey;
    }
    vi.unstubAllGlobals();
  });

  it('only accepts GET requests', async () => {
    const response = createResponseMock();

    await handler({ method: 'POST' }, response);

    expect(response.statusCode).toBe(405);
    expect(response.headers.Allow).toBe('GET');
  });

  it.each([
    [{ category: 'anything' }, 'Invalid category'],
    [{ category: 'popular-movies', page: '0' }, 'Invalid page'],
    [{ category: 'popular-movies', page: '501' }, 'Invalid page'],
    [{ category: 'popular-movies', language: 'en-US&api_key=bad' }, 'Invalid language'],
    [{ category: 'popular-movies', region: 'USA' }, 'Invalid region'],
    [{ category: 'popular-movies', sortBy: 'popularity.desc&api_key=bad' }, 'Invalid sort order'],
    [{ category: ['popular-movies', 'top-rated-movies'] }, 'Invalid category'],
  ])('rejects invalid query parameters %o', async (query, error) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({ method: 'GET', query }, response);

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a popular TV category to its fixed TMDB endpoint and excludes talk shows', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ page: 2, results: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({
      method: 'GET',
      query: {
        category: 'popular-tv',
        page: '2',
        language: 'en-US',
        sortBy: 'popularity.desc',
      },
    }, response);

    const requestUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestUrl.origin).toBe('https://api.themoviedb.org');
    expect(requestUrl.pathname).toBe('/3/tv/popular');
    expect(requestUrl.searchParams.get('api_key')).toBe('server-api-key');
    expect(requestUrl.searchParams.get('page')).toBe('2');
    expect(requestUrl.searchParams.get('language')).toBe('en-US');
    expect(requestUrl.searchParams.get('without_genres')).toBe('10767');
    expect(response.statusCode).toBe(200);
  });

  it('keeps trending categories on their daily endpoints without adding filters', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ page: 1, results: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({
      method: 'GET',
      query: { category: 'trending-tv', language: 'en-US', region: 'IN' },
    }, response);

    const requestUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestUrl.pathname).toBe('/3/trending/tv/day');
    expect(requestUrl.searchParams.has('language')).toBe(false);
    expect(requestUrl.searchParams.has('region')).toBe(false);
    expect(requestUrl.searchParams.has('without_genres')).toBe(false);
  });

  it('applies region and sort constraints to the streaming discovery category', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ page: 1, results: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({
      method: 'GET',
      query: {
        category: 'trending-streaming-movies',
        region: 'IN',
        sortBy: 'vote_average.desc',
      },
    }, response);

    const requestUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestUrl.pathname).toBe('/3/discover/movie');
    expect(requestUrl.searchParams.get('with_watch_monetization_types')).toBe('flatrate');
    expect(requestUrl.searchParams.get('watch_region')).toBe('IN');
    expect(requestUrl.searchParams.get('sort_by')).toBe('vote_average.desc');
  });

  it('does not expose TMDB error details to the browser', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({ method: 'GET', query: { category: 'popular-movies' } }, response);

    expect(response.statusCode).toBe(502);
    expect(response.body).toEqual({ error: 'TMDB category request failed' });
  });
});
