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

const ALLOWED_SORTS = new Set([
  'popularity.asc',
  'popularity.desc',
  'primary_release_date.asc',
  'primary_release_date.desc',
  'release_date.asc',
  'release_date.desc',
  'revenue.asc',
  'revenue.desc',
  'original_title.asc',
  'original_title.desc',
  'vote_average.asc',
  'vote_average.desc',
  'vote_count.asc',
  'vote_count.desc',
]);

const DISCOVER_PARAMETERS = [
  'sort_by',
  'with_genres',
  'with_original_language',
  'with_companies',
  'with_watch_providers',
  'watch_region',
  'primary_release_date.gte',
  'primary_release_date.lte',
  'with_release_type',
  'vote_count.gte',
  'with_watch_monetization_types',
  'region',
  'without_genres',
] as const;

const RELEASE_RANGE_PARAMETERS = new Set([
  'mode',
  'mediaType',
  'page',
  'startDate',
  'endDate',
  'region',
]);

const DISCOVER_REQUEST_PARAMETERS = new Set([
  'mode',
  'mediaType',
  'page',
  ...DISCOVER_PARAMETERS,
]);

function getSingleQueryValue(
  query: VercelRequest['query'],
  key: string,
): string | undefined | null {
  const value = query?.[key];
  return Array.isArray(value) ? null : value;
}

function isValidDate(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidIdList(value: string): boolean {
  return /^\d+(?:\|\d+)*$/.test(value) && value.split('|').every((id) => Number(id) > 0);
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

  const query = request.query ?? {};
  const modeValue = getSingleQueryValue(query, 'mode');
  if (modeValue === null) {
    response.status(400).json({ error: 'Invalid discovery mode' });
    return;
  }
  const mode = modeValue ?? 'discover';
  const allowedParameters = mode === 'release-date-range'
    ? RELEASE_RANGE_PARAMETERS
    : DISCOVER_REQUEST_PARAMETERS;
  if (Object.keys(query).some((key) => !allowedParameters.has(key))) {
    response.status(400).json({ error: 'Unsupported discovery parameter' });
    return;
  }

  const mediaType = getSingleQueryValue(query, 'mediaType');
  if (mediaType !== 'movie' && mediaType !== 'tv') {
    response.status(400).json({ error: 'Invalid media type' });
    return;
  }

  const pageValue = getSingleQueryValue(query, 'page');
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

  const params = new URLSearchParams({ page: String(page) });
  let path: string;

  if (mode === 'release-date-range') {
    const startDate = getSingleQueryValue(query, 'startDate');
    const endDate = getSingleQueryValue(query, 'endDate');
    if (
      !isValidDate(startDate) ||
      !isValidDate(endDate) ||
      startDate > endDate ||
      mediaType !== 'movie'
    ) {
      response.status(400).json({ error: 'Invalid release date range' });
      return;
    }

    params.set('primary_release_date.gte', startDate);
    params.set('primary_release_date.lte', endDate);
    params.set('sort_by', 'popularity.desc');
    const region = getSingleQueryValue(query, 'region');
    if (region === null || (region && !/^[A-Z]{2}$/.test(region))) {
      response.status(400).json({ error: 'Invalid region' });
      return;
    }
    if (region) params.set('region', region);
    path = '/discover/movie';
  } else if (mode === 'discover') {
    path = `/discover/${mediaType}`;

    for (const key of DISCOVER_PARAMETERS) {
      const value = getSingleQueryValue(query, key);
      if (value === null) {
        response.status(400).json({ error: `Invalid ${key}` });
        return;
      }
      if (value !== undefined) params.set(key, value);
    }

    const sortBy = params.get('sort_by');
    if (sortBy && !ALLOWED_SORTS.has(sortBy)) {
      response.status(400).json({ error: 'Invalid sort order' });
      return;
    }

    for (const key of [
      'with_genres',
      'with_companies',
      'with_watch_providers',
      'without_genres',
    ] as const) {
      const value = params.get(key);
      if (value && !isValidIdList(value)) {
        response.status(400).json({ error: `Invalid ${key}` });
        return;
      }
    }

    const language = params.get('with_original_language');
    if (language && !/^[a-z]{2,3}$/.test(language)) {
      response.status(400).json({ error: 'Invalid language' });
      return;
    }

    for (const key of ['region', 'watch_region'] as const) {
      const value = params.get(key);
      if (value && !/^[A-Z]{2}$/.test(value)) {
        response.status(400).json({ error: `Invalid ${key}` });
        return;
      }
    }

    for (const key of ['primary_release_date.gte', 'primary_release_date.lte'] as const) {
      const value = params.get(key);
      if (value && !isValidDate(value)) {
        response.status(400).json({ error: 'Invalid release date' });
        return;
      }
    }

    const releaseType = params.get('with_release_type');
    if (releaseType && !/^[1-6](?:\|[1-6])*$/.test(releaseType)) {
      response.status(400).json({ error: 'Invalid release type' });
      return;
    }

    const voteCount = params.get('vote_count.gte');
    if (voteCount && (!/^\d+$/.test(voteCount) || !Number.isSafeInteger(Number(voteCount)))) {
      response.status(400).json({ error: 'Invalid vote count' });
      return;
    }

    const monetization = params.get('with_watch_monetization_types');
    if (monetization && monetization !== 'flatrate') {
      response.status(400).json({ error: 'Invalid monetization type' });
      return;
    }
  } else {
    response.status(400).json({ error: 'Invalid discovery mode' });
    return;
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: 'TMDB server credential is not configured' });
    return;
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`);
  params.set('api_key', apiKey);
  url.search = params.toString();

  try {
    const tmdbResponse = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!tmdbResponse.ok) {
      response.status(502).json({ error: 'TMDB discovery request failed' });
      return;
    }

    response.status(200).json(await tmdbResponse.json());
  } catch {
    response.status(502).json({ error: 'TMDB discovery request failed' });
  }
}
