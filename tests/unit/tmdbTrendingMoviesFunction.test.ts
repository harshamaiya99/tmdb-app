import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/tmdb/trending-movies';

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

describe('TMDB trending movies function', () => {
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
    expect(response.body).toEqual({ error: 'Method not allowed' });
  });

  it.each([
    ['not-a-page', 'Invalid page'],
    ['0', 'Invalid page'],
    ['501', 'Invalid page'],
  ])('rejects invalid page %s before calling TMDB', async (page, message) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({ method: 'GET', query: { page } }, response);

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error: message });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests the fixed trending endpoint with the requested page', async () => {
    const trending = { page: 2, results: [{ id: 12, title: 'Example Movie' }] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => trending,
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({ method: 'GET', query: { page: '2' } }, response);

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://api.themoviedb.org/3/trending/movie/day?api_key=server-api-key&page=2'),
      { headers: { Accept: 'application/json' } },
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(trending);
  });

  it('defaults to the first page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ page: 1, results: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({ method: 'GET' }, response);

    expect(fetchMock.mock.calls[0][0]).toEqual(
      new URL('https://api.themoviedb.org/3/trending/movie/day?api_key=server-api-key&page=1'),
    );
  });

  it('returns a generic error when TMDB rejects the request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({ method: 'GET' }, response);

    expect(response.statusCode).toBe(502);
    expect(response.body).toEqual({ error: 'TMDB trending movies request failed' });
  });
});
