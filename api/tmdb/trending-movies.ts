interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  json(body: unknown): VercelResponse;
}

declare const process: {
  env: Record<string, string | undefined>;
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawPage = request.query?.page ?? '1';
  if (Array.isArray(rawPage) || !/^\d+$/.test(rawPage)) {
    response.status(400).json({ error: 'Invalid page' });
    return;
  }

  const page = Number(rawPage);
  if (!Number.isSafeInteger(page) || page < 1 || page > 500) {
    response.status(400).json({ error: 'Invalid page' });
    return;
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: 'TMDB server credential is not configured' });
    return;
  }

  try {
    const url = new URL('https://api.themoviedb.org/3/trending/movie/day');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('page', String(page));

    const tmdbResponse = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!tmdbResponse.ok) {
      response.status(502).json({ error: 'TMDB trending movies request failed' });
      return;
    }

    response.status(200).json(await tmdbResponse.json());
  } catch {
    response.status(502).json({ error: 'TMDB trending movies request failed' });
  }
}
