import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/tmdb/media';

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

describe('TMDB media function', () => {
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
    [{ resource: 'unknown', id: '3' }, 'Invalid media resource'],
    [{ resource: ['movie', 'tv'], id: '3' }, 'Invalid media resource'],
    [{ resource: 'movie', id: '3/../person/4' }, 'Invalid media ID'],
    [{ resource: 'movie-reviews', id: '3', page: '0' }, 'Invalid page'],
    [{ resource: 'movie-reviews', id: '3', page: '501' }, 'Invalid page'],
    [{ resource: 'season', id: '3', season: '-1' }, 'Invalid season number'],
    [{ resource: 'episode', id: '3', season: '1', episode: '0' }, 'Invalid episode number'],
  ])('rejects invalid resource input %o', async (query, error) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();
    await handler({ method: 'GET', query }, response);
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests movie details with a fixed append-to-response set', async () => {
    const payload = { id: 10, title: 'Example' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({ method: 'GET', query: { resource: 'movie', id: '10' } }, response);

    const requestUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestUrl.pathname).toBe('/3/movie/10');
    expect(requestUrl.searchParams.get('api_key')).toBe('server-api-key');
    expect(requestUrl.searchParams.get('append_to_response')).toBe(
      'credits,videos,images,recommendations,similar,external_ids,reviews,watch/providers,release_dates',
    );
    expect(response.body).toEqual(payload);
  });

  it('maps TV episode requests without accepting caller-provided TMDB paths', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 45, episode_number: 4 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({
      method: 'GET',
      query: { resource: 'episode', id: '1399', season: '2', episode: '4' },
    }, response);

    const requestUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestUrl.pathname).toBe('/3/tv/1399/season/2/episode/4');
    expect(requestUrl.searchParams.get('append_to_response')).toBe('credits,images,videos');
  });

  it('returns generic upstream errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const response = createResponseMock();
    await handler({ method: 'GET', query: { resource: 'tv', id: '1399' } }, response);
    expect(response.statusCode).toBe(502);
    expect(response.body).toEqual({ error: 'TMDB media request failed' });
  });
});
