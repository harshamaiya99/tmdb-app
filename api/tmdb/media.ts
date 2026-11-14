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

const MEDIA_RESOURCES = new Set([
  'movie',
  'tv',
  'person',
  'collection',
  'movie-recommendations',
  'movie-similar',
  'movie-reviews',
  'tv-recommendations',
  'tv-similar',
  'tv-reviews',
  'season',
  'episode',
  'person-movie-credits',
  'person-tv-credits',
  'countries',
]);

const APPEND_TO_RESPONSE: Record<string, string> = {
  movie: 'credits,videos,images,recommendations,similar,external_ids,reviews,watch/providers,release_dates',
  tv: 'credits,aggregate_credits,videos,images,recommendations,similar,external_ids,reviews,watch/providers,content_ratings',
  person: 'combined_credits,images,external_ids',
  season: 'credits',
  episode: 'credits,images,videos',
};

function getSingleQueryValue(
  query: VercelRequest['query'],
  key: string,
): string | undefined | null {
  const value = query?.[key];
  return Array.isArray(value) ? null : value;
}

function parseInteger(value: string | undefined | null, minimum = 1): number | undefined {
  if (value === undefined || value === null || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : undefined;
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

  const resource = getSingleQueryValue(request.query, 'resource');
  if (typeof resource !== 'string' || !MEDIA_RESOURCES.has(resource)) {
    response.status(400).json({ error: 'Invalid media resource' });
    return;
  }

  if (resource === 'countries') {
    // No entity identifiers are required for TMDB's country configuration.
  } else {
    const id = parseInteger(getSingleQueryValue(request.query, 'id'));
    if (!id) {
      response.status(400).json({ error: 'Invalid media ID' });
      return;
    }
  }

  const id = parseInteger(getSingleQueryValue(request.query, 'id'));
  const pageResources = new Set([
    'movie-recommendations',
    'movie-similar',
    'movie-reviews',
    'tv-recommendations',
    'tv-similar',
    'tv-reviews',
  ]);
  let page = 1;
  if (pageResources.has(resource)) {
    const pageValue = getSingleQueryValue(request.query, 'page');
    const parsedPage = pageValue === undefined ? 1 : parseInteger(pageValue);
    if (!parsedPage || parsedPage > 500) {
      response.status(400).json({ error: 'Invalid page' });
      return;
    }
    page = parsedPage;
  }

  let path: string;
  if (resource === 'countries') {
    path = '/configuration/countries';
  } else if (resource === 'movie' || resource === 'tv' || resource === 'person' || resource === 'collection') {
    path = `/${resource}/${id}`;
  } else if (resource === 'season' || resource === 'episode') {
    const season = parseInteger(getSingleQueryValue(request.query, 'season'), 0);
    if (season === undefined) {
      response.status(400).json({ error: 'Invalid season number' });
      return;
    }
    path = `/tv/${id}/season/${season}`;
    if (resource === 'episode') {
      const episode = parseInteger(getSingleQueryValue(request.query, 'episode'));
      if (!episode) {
        response.status(400).json({ error: 'Invalid episode number' });
        return;
      }
      path += `/episode/${episode}`;
    }
  } else if (resource === 'person-movie-credits' || resource === 'person-tv-credits') {
    path = `/person/${id}/${resource === 'person-movie-credits' ? 'movie_credits' : 'tv_credits'}`;
  } else {
    const mediaType = resource.startsWith('movie-') ? 'movie' : 'tv';
    const suffix = resource.slice(mediaType.length + 1);
    path = `/${mediaType}/${id}/${suffix}`;
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: 'TMDB server credential is not configured' });
    return;
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set('api_key', apiKey);
  if (pageResources.has(resource)) url.searchParams.set('page', String(page));
  if (APPEND_TO_RESPONSE[resource]) {
    url.searchParams.set('append_to_response', APPEND_TO_RESPONSE[resource]);
  }

  try {
    const tmdbResponse = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!tmdbResponse.ok) {
      response.status(502).json({ error: 'TMDB media request failed' });
      return;
    }

    response.status(200).json(await tmdbResponse.json());
  } catch {
    response.status(502).json({ error: 'TMDB media request failed' });
  }
}
