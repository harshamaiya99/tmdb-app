import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/tmdb/configuration';

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

describe('TMDB configuration function', () => {
  const originalApiKey = process.env.TMDB_API_KEY;

  beforeEach(() => {
    delete process.env.TMDB_API_KEY;
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
    expect(response.headers['Cache-Control']).toBe('no-store');
    expect(response.body).toEqual({ error: 'Method not allowed' });
  });

  it('reports a missing server API key without making a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({ method: 'GET' }, response);

    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({ error: 'TMDB server credential is not configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests only TMDB configuration using the server-side API key', async () => {
    process.env.TMDB_API_KEY = 'server-api-key';
    const configuration = { images: { secure_base_url: 'https://image.tmdb.org/t/p/' } };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => configuration,
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponseMock();

    await handler({ method: 'GET' }, response);

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://api.themoviedb.org/3/configuration?api_key=server-api-key'),
      { headers: { Accept: 'application/json' } },
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(configuration);
  });

  it('does not expose TMDB error details to the browser', async () => {
    process.env.TMDB_API_KEY = 'server-api-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ status_message: 'sensitive upstream detail' }),
    }));
    const response = createResponseMock();

    await handler({ method: 'GET' }, response);

    expect(response.statusCode).toBe(502);
    expect(response.body).toEqual({ error: 'TMDB configuration request failed' });
    expect(JSON.stringify(response.body)).not.toContain('sensitive upstream detail');
  });
});
