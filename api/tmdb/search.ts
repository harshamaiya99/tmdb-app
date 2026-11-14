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

const SEARCH_PATHS: Record<string, string> = {
  movie: '/search/movie',
  tv: '/search/tv',
  person: '/search/person',
  multi: '/search/multi',
};

function getSingleQueryValue(
  query: VercelRequest['query'],
  key: string,
): string | undefined | null {
  const value = query?.[key];
  return Array.isArray(value) ? null : value;
}

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

  const type = getSingleQueryValue(request.query, 'type');
  if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(SEARCH_PATHS, type)) {
    response.status(400).json({ error: 'Invalid search type' });
    return;
  }

  const query = getSingleQueryValue(request.query, 'query');
  if (typeof query !== 'string' || !query.trim() || query.length > 200) {
    response.status(400).json({ error: 'Invalid search query' });
    return;
  }

  const pageValue = getSingleQueryValue(request.query, 'page');
  const rawPage = pageValue ?? '1';
  if (pageValue === null || !/^\d+$/.test(rawPage)) {
    response.status(400).json({ error: 'Invalid page' });
    return;
  }
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page) || page < 1 || page > 500) {
    response.status(400).json({ error: 'Invalid page' });
    return;
  }

  const region = getSingleQueryValue(request.query, 'region');
  if (region === null || (region && !/^[A-Z]{2}$/.test(region))) {
    response.status(400).json({ error: 'Invalid region' });
    return;
  }
  if (region && type !== 'movie') {
    response.status(400).json({ error: 'Region is supported for movie search only' });
    return;
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: 'TMDB server credential is not configured' });
    return;
  }

  const url = new URL(`https://api.themoviedb.org/3${SEARCH_PATHS[type]}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));
  if (region) url.searchParams.set('region', region);

  try {
    const tmdbResponse = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!tmdbResponse.ok) {
      response.status(502).json({ error: 'TMDB search request failed' });
      return;
    }

    response.status(200).json(await tmdbResponse.json());
  } catch {
    response.status(502).json({ error: 'TMDB search request failed' });
  }
}
