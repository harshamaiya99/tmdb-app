import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/tmdb/search';

declare const process: {
  env: Record<string, string | undefined>;
};

function createResponseMock() {
  return {
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
}

describe('TMDB search function', () => {
  const originalApiKey = process.env.TMDB_API_KEY;

  beforeEach(() => {
    process.env.TMDB_API_KEY = 'server-api-key';
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
  });

  it('only accepts GET requests', async () => {
    const response = createResponseMock();
    await handler({ method: 'POST' }, response);
    expect(response.statusCode).toBe(405);
    expect(response.headers.Allow).toBe('GET');
  });

  it.each([
    [{ type: 'other', query: 'hello' }, 'Invalid search type'],
    [{ type: ['movie', 'tv'], query: 'hello' }, 'Invalid search type'],
    [{ type: 'movie', query: '  ' }, 'Invalid search query'],
    [{ type: 'movie', query: 'x'.repeat(201) }, 'Invalid search query'],
    [{ type: 'movie', query: 'hello', page: '0' }, 'Invalid page'],
    [{ type: 'movie', query: 'hello', page: '501' }, 'Invalid page'],
    [{ type: 'movie', query: 'hello', region: 'USA' }, 'Invalid region'],
    [{ type: 'person', query: 'hello', region: 'US' }, 'Region is supported for movie search only'],
  ])('rejects invalid query input %o', async (query, error) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();
    await handler({ method: 'GET', query }, response);
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps the requested search type to a fixed TMDB route', async () => {
    const payload = { page: 2, results: [{ id: 8, title: 'Result' }] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({
      method: 'GET',
      query: { type: 'movie', query: 'A & B', page: '2', region: 'IN' },
    }, response);

    const requestUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestUrl.origin).toBe('https://api.themoviedb.org');
    expect(requestUrl.pathname).toBe('/3/search/movie');
    expect(requestUrl.searchParams.get('api_key')).toBe('server-api-key');
    expect(requestUrl.searchParams.get('query')).toBe('A & B');
    expect(requestUrl.searchParams.get('page')).toBe('2');
    expect(requestUrl.searchParams.get('region')).toBe('IN');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(payload);
  });
});
