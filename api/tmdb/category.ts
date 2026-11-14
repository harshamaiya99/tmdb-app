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

const CATEGORY_PATHS: Record<string, string> = {
  'trending-movies': '/trending/movie/day',
  'trending-tv': '/trending/tv/day',
  'popular-movies': '/movie/popular',
  'now-playing-movies': '/movie/now_playing',
  'top-rated-movies': '/movie/top_rated',
  'upcoming-movies': '/movie/upcoming',
  'popular-tv': '/tv/popular',
  'top-rated-tv': '/tv/top_rated',
  'trending-streaming-movies': '/discover/movie',
  'imdb-top-rated-movies': '/discover/movie',
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

  const category = getSingleQueryValue(request.query, 'category');
  if (
    typeof category !== 'string' ||
    !Object.prototype.hasOwnProperty.call(CATEGORY_PATHS, category)
  ) {
    response.status(400).json({ error: 'Invalid category' });
    return;
  }
  const categoryPath = CATEGORY_PATHS[category];

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

  const language = getSingleQueryValue(request.query, 'language');
  if (language === null || (language && !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(language))) {
    response.status(400).json({ error: 'Invalid language' });
    return;
  }

  const region = getSingleQueryValue(request.query, 'region');
  if (region === null || (region && !/^[A-Z]{2}$/.test(region))) {
    response.status(400).json({ error: 'Invalid region' });
    return;
  }

  const sortValue = getSingleQueryValue(request.query, 'sortBy');
  const sortBy = sortValue ?? 'popularity.desc';
  if (sortValue === null || !ALLOWED_SORTS.has(sortBy)) {
    response.status(400).json({ error: 'Invalid sort order' });
    return;
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: 'TMDB server credential is not configured' });
    return;
  }

  const isTVCategory = category.endsWith('-tv');
  const isDiscoverCategory = categoryPath === '/discover/movie';
  const url = new URL(`https://api.themoviedb.org/3${categoryPath}`);
  const params = url.searchParams;
  params.set('api_key', apiKey);
  params.set('page', String(page));

  const isTrendingCategory = category === 'trending-movies' || category === 'trending-tv';
  if (language && !isTrendingCategory) {
    params.set(isDiscoverCategory ? 'with_original_language' : 'language', language);
  }
  if (isTVCategory && !isTrendingCategory) {
    params.set('without_genres', '10767');
  }
  if (
    region &&
    ['popular-movies', 'now-playing-movies', 'top-rated-movies', 'upcoming-movies', 'imdb-top-rated-movies'].includes(category)
  ) {
    params.set('region', region);
  }
  if (category === 'trending-streaming-movies') {
    params.set('with_watch_monetization_types', 'flatrate');
    params.set('watch_region', region || 'US');
    params.set('sort_by', sortBy);
  } else if (category === 'imdb-top-rated-movies') {
    params.set('vote_count.gte', '10000');
    params.set('sort_by', sortBy);
  }
  if (isDiscoverCategory && sortBy === 'primary_release_date.desc') {
    params.set('primary_release_date.lte', new Date().toISOString().slice(0, 10));
  }

  try {
    const tmdbResponse = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!tmdbResponse.ok) {
      response.status(502).json({ error: 'TMDB category request failed' });
      return;
    }

    response.status(200).json(await tmdbResponse.json());
  } catch {
    response.status(502).json({ error: 'TMDB category request failed' });
  }
}
