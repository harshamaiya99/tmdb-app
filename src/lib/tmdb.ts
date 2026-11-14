const TMDB_BASE_URL = 'https://api.themoviedb.org';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const TV_TALK_GENRE_ID = 10767;

function addQueryParam(endpoint: string, key: string, value: string): string {
  const [path, query = ''] = endpoint.split('?');
  const params = new URLSearchParams(query);
  params.set(key, value);
  return `${path}?${params.toString()}`;
}

function isTalkShow(show: { genre_ids?: number[] } | null | undefined): boolean {
  return show?.genre_ids?.includes(TV_TALK_GENRE_ID) ?? false;
}

function withoutTalkShows<T extends { genre_ids?: number[] }>(shows: T[]): T[] {
  return shows.filter((show) => !isTalkShow(show));
}

const SELF_OR_HOST_ROLES = new Set(['himself', 'herself', 'themselves', 'themself', 'self', 'host']);

function shouldIncludePersonCredit(credit: Pick<PersonCredit, 'genre_ids' | 'character' | 'job'>): boolean {
  const creditedRole = credit.character ?? credit.job ?? '';
  return !isTalkShow(credit) || SELF_OR_HOST_ROLES.has(creditedRole.trim().toLowerCase());
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface AggregateCast extends Omit<Cast, 'character'> {
  roles: {
    character: string;
    episode_count: number;
  }[];
  total_episode_count: number;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface MediaImage {
  file_path: string;
  aspect_ratio: number;
  height: number;
  width: number;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  runtime: number | null;
  vote_average?: number;
  vote_count?: number;
}

export interface TVEpisodeDetails extends Episode {
  production_code?: string;
  crew: Crew[];
  guest_stars: Cast[];
  images?: { stills: PersonImage[] };
  videos?: { results: Video[] };
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  overview: string;
  air_date: string;
}

export interface TVSeasonDetails extends Season {
  episodes: Episode[];
  credits?: { cast: Cast[]; crew: Crew[] };
}

export interface Movie {
  id: number;
  title: string;
  budget?: number;
  revenue?: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  original_language?: string;
  release_date: string;
  vote_average?: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: Genre[];
  runtime?: number;
  status?: string;
  tagline?: string;
  credits?: { cast: Cast[]; crew: Crew[] };
  videos?: { results: Video[] };
  images?: { backdrops: MediaImage[]; posters: MediaImage[]; logos?: MediaImage[] };
  recommendations?: MediaResults<Movie>;
  similar?: MediaResults<Movie>;
  external_ids?: { imdb_id: string | null };
  reviews?: ReviewResponse;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  };
  production_companies?: ProductionCompany[]; 
  'watch/providers'?: WatchProviders;
  release_dates?: {
    results: {
      iso_3166_1: string;
      release_dates: {
        certification: string;
        type: number;
      }[];
    }[];
  };
}

export interface TMDBCountry {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

export interface Creator {
  id: number;
  name: string;
  profile_path: string | null;
}

export interface TVShow {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  original_language?: string;
  first_air_date: string;
  vote_average?: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: Genre[];
  episode_run_time?: number[];
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  created_by?: Creator[];
  seasons?: Season[];
  credits?: { cast: Cast[]; crew: Crew[] };
  videos?: { results: Video[] };
  images?: {
    backdrops: MediaImage[];
    posters: MediaImage[];
    logos?: MediaImage[];
  };
  recommendations?: MediaResults<TVShow>;
  similar?: MediaResults<TVShow>;
  external_ids?: { imdb_id: string | null };
  reviews?: ReviewResponse;
  aggregate_credits?: { cast: AggregateCast[]; crew: Crew[] };
  production_companies?: ProductionCompany[];
  'watch/providers'?: WatchProviders;
  content_ratings?: {
    results: {
      iso_3166_1: string;
      rating: string;
    }[];
  };
}

export interface Crew {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Genre {
  id: number;
  name: string;
}

export interface PersonImage {
  file_path: string | null;
  aspect_ratio: number;
  height: number;
  width: number;
  vote_average: number;
  vote_count: number;
}

export interface Person {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  external_ids?: {
    imdb_id?: string | null;
    facebook_id?: string | null;
    instagram_id?: string | null;
    twitter_id?: string | null;
    youtube_id?: string | null;
    tiktok_id?: string | null;
  };
  combined_credits?: {
    cast: PersonCredit[];
    crew?: PersonCredit[];
  };
  images?: {
    profiles: PersonImage[];
  };
}

export interface PersonCredit {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  genre_ids?: number[];
  original_language?: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
  character?: string;
  job?: string;
  department?: string;
  popularity: number;
}

export function mergePersonCredits(credits: PersonCredit[]): PersonCredit[] {
  const groupedCredits = new Map<string, {
    credit: PersonCredit;
    characters: Map<string, string>;
    jobs: Map<string, string>;
  }>();

  credits.forEach((credit) => {
    const key = `${credit.media_type}:${credit.id}`;
    let group = groupedCredits.get(key);
    if (!group) {
      group = { credit, characters: new Map(), jobs: new Map() };
      groupedCredits.set(key, group);
    }

    const character = credit.character?.trim() ?? '';
    if (character) {
      group.characters.set(character.toLowerCase(), character);
    }
    const job = credit.job?.trim() ?? '';
    if (job) {
      group.jobs.set(job.toLowerCase(), job);
    }
  });

  return [...groupedCredits.values()].map(({ credit, characters, jobs }) => ({
    ...credit,
    character: [...characters.values()].join(', '),
    job: [...jobs.values()].join(', '),
  }));
}

export function filterPersonCredits(
  credits: PersonCredit[],
  genreId?: number,
  language?: string,
): PersonCredit[] {
  return credits.filter((credit) => (
    (genreId === undefined || credit.genre_ids?.includes(genreId))
    && (!language || credit.original_language === language)
  ));
}

export function sortPersonCredits(
  credits: PersonCredit[],
  knownForDepartment?: string,
  sortBy = 'popularity.desc',
): PersonCredit[] {
  const castFirst = !knownForDepartment || knownForDepartment.toLowerCase() === 'acting';

  return [...credits].sort((a, b) => {
    const aHasCastCredit = Boolean(a.character);
    const bHasCastCredit = Boolean(b.character);
    const aHasCrewCredit = Boolean(a.job);
    const bHasCrewCredit = Boolean(b.job);
    const aPriority = castFirst
      ? aHasCastCredit ? 0 : aHasCrewCredit ? 1 : 2
      : aHasCrewCredit ? 0 : aHasCastCredit ? 1 : 2;
    const bPriority = castFirst
      ? bHasCastCredit ? 0 : bHasCrewCredit ? 1 : 2
      : bHasCrewCredit ? 0 : bHasCastCredit ? 1 : 2;

    if (aPriority !== bPriority) return aPriority - bPriority;

    switch (sortBy) {
      case 'vote_average.desc':
        return b.vote_average - a.vote_average || b.popularity - a.popularity;
      case 'primary_release_date.asc':
      case 'first_air_date.asc': {
        const aDate = a.release_date ?? a.first_air_date ?? '';
        const bDate = b.release_date ?? b.first_air_date ?? '';
        return aDate.localeCompare(bDate) || b.popularity - a.popularity;
      }
      case 'primary_release_date.desc':
      case 'first_air_date.desc': {
        const aDate = a.release_date ?? a.first_air_date ?? '';
        const bDate = b.release_date ?? b.first_air_date ?? '';
        return bDate.localeCompare(aDate) || b.popularity - a.popularity;
      }
      case 'original_title.asc':
      case 'name.asc':
        return (a.title ?? a.name ?? '').localeCompare(b.title ?? b.name ?? '') || b.popularity - a.popularity;
      default:
        return b.popularity - a.popularity;
    }
  });
}

export interface Review {
  id: string;
  author: string;
  content: string;
  created_at: string;
  author_details?: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
}

export interface ReviewResponse {
  page: number;
  results: Review[];
  total_pages: number;
  total_results: number;
}

export interface PersonListResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
}

export interface Collection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: Movie[];
}

export interface ProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviders {
  results: {
    [country: string]: {
      link?: string;
      flatrate?: WatchProvider[];
      rent?: WatchProvider[];
      buy?: WatchProvider[];
    };
  };
}

export interface TrendingResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

interface MediaResults<T> {
  results: T[];
  total_pages?: number;
  total_results?: number;
}

export interface MediaListDiscoveryFilters {
  mediaType: 'movie' | 'tv';
  page: number;
  category?: string;
  genreId?: number;
  language?: string;
  sortBy?: string;
  companyId?: number;
  providerId?: number;
  region?: string;
}

export type MultiSearchResult =
  | (Movie & { media_type: 'movie' })
  | (TVShow & { media_type: 'tv' })
  | (PersonListResult & { media_type: 'person' });

const MAX_SEARCH_SPACING_CANDIDATES = 8;

function getSearchSpacingCandidates(query: string): string[] {
  if (!/^[a-z\d]{5,24}$/i.test(query)) return [];

  const middle = Math.floor(query.length / 2);
  const splitPoints: number[] = [];

  for (let offset = 0; splitPoints.length < MAX_SEARCH_SPACING_CANDIDATES; offset += 1) {
    const points = offset === 0 ? [middle] : [middle - offset, middle + offset];
    for (const point of points) {
      if (point >= 2 && point <= query.length - 2) splitPoints.push(point);
      if (splitPoints.length === MAX_SEARCH_SPACING_CANDIDATES) break;
    }
    if (middle - offset < 2 && middle + offset > query.length - 2) break;
  }

  return splitPoints.map((point) => `${query.slice(0, point)} ${query.slice(point)}`);
}

interface PersonCreditsResponse {
  page?: number;
  cast?: Omit<PersonCredit, 'media_type'>[];
  crew?: Omit<PersonCredit, 'media_type'>[];
  total_pages?: number;
}

interface TMDBErrorResponse {
  status_code?: number;
  status_message?: string;
}

export interface TMDBRequestOptions {
  signal?: AbortSignal;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  sessionId?: string;
  accessToken?: string;
  apiVersion?: '3' | '4';
}

export interface TMDBAccount {
  id: number;
  name: string;
  username: string;
  avatar?: {
    tmdb?: {
      avatar_path: string | null;
    } | null;
  } | null;
}

export type TMDBAccountSection = 'watchlist' | 'favorites' | 'ratings';
export type TMDBAccountMedia = (Movie | TVShow) & { rating?: number };
export type TMDBAccountMediaEntry = {
  item: TMDBAccountMedia;
  mediaType: 'movie' | 'tv';
};

export function interleaveAccountMedia(
  movies: TMDBAccountMedia[],
  tvShows: TMDBAccountMedia[],
): TMDBAccountMediaEntry[] {
  const entries: TMDBAccountMediaEntry[] = [];
  const itemCount = Math.max(movies.length, tvShows.length);
  for (let index = 0; index < itemCount; index += 1) {
    if (movies[index]) entries.push({ item: movies[index], mediaType: 'movie' });
    if (tvShows[index]) entries.push({ item: tvShows[index], mediaType: 'tv' });
  }
  return entries;
}

export interface TMDBUserList {
  id: number;
  name: string;
  description: string;
  item_count?: number;
  favorite_count: number;
  poster_path: string | null;
  iso_639_1: string;
  public?: boolean;
  total_results?: number;
}

export type TMDBUserListItem =
  | (Movie & { media_type: 'movie' })
  | (TVShow & { media_type: 'tv' });

export interface TMDBUserListDetails extends TMDBUserList {
  results: TMDBUserListItem[];
  object_ids?: { movie?: Array<number | string>; tv?: Array<number | string> };
  page: number;
  total_pages: number;
  total_results: number;
}
export interface TMDBMediaAccountState {
  favorite: boolean;
  watchlist: boolean;
  rated: false | { value: number };
}

export type TMDBErrorCode =
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'API_ERROR'
  | 'NETWORK_ERROR';

export class TMDBError extends Error {
  constructor(
    message: string,
    public readonly code: TMDBErrorCode,
    public readonly status?: number,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'TMDBError';
  }
}

class TMDBService {
  private apiKey: string = '';
  private configuredAccessToken = '';

  private get accessToken(): string {
    return this.configuredAccessToken || import.meta.env.VITE_TMDB_ACCESS_TOKEN || '';
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  setAccessToken(token: string) {
    this.configuredAccessToken = token.trim();
  }

  hasV4AppAccessToken(): boolean {
    return Boolean(this.accessToken);
  }

  private async fetchFromTMDB<T>(endpoint: string, options: TMDBRequestOptions = {}): Promise<T> {
    if (!this.apiKey && !this.accessToken && !options.accessToken) {
      throw new TMDBError('TMDB credentials are not configured', 'AUTHENTICATION_ERROR');
    }

    const url = new URL(`${TMDB_BASE_URL}/${options.apiVersion ?? '3'}${endpoint}`);
    const headers: HeadersInit = {};

    if (options.sessionId) {
      url.searchParams.set('session_id', options.sessionId);
    }
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const accessToken = options.accessToken ?? this.accessToken;
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      url.searchParams.set('api_key', this.apiKey);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers,
        signal: options.signal,
        method: options.method,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      throw new TMDBError('Unable to reach TMDB. Check your network connection.', 'NETWORK_ERROR');
    }

    if (!response.ok) {
      let errorBody: TMDBErrorResponse = {};
      try {
        errorBody = await response.json() as TMDBErrorResponse;
      } catch {
        // Use the HTTP status when TMDB does not return JSON.
      }

      if (response.status === 401) {
        throw new TMDBError('Invalid TMDB credentials', 'AUTHENTICATION_ERROR', response.status);
      }
      if (response.status === 429) {
        const retryAfterValue = response.headers.get('Retry-After');
        const retryAfter = retryAfterValue ? Number(retryAfterValue) : undefined;
        throw new TMDBError(
          'TMDB rate limit reached. Please try again shortly.',
          'RATE_LIMIT_ERROR',
          response.status,
          Number.isNaN(retryAfter) ? undefined : retryAfter,
        );
      }
      throw new TMDBError(
        errorBody.status_message || `TMDB request failed (${response.status})`,
        'API_ERROR',
        response.status,
      );
    }

    return await response.json() as T;
  }

  private async fetchFromAppApi<T>(endpoint: string, options: TMDBRequestOptions = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(endpoint, { signal: options.signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      throw new TMDBError('Unable to reach the TMDB service. Check your network connection.', 'NETWORK_ERROR');
    }

    if (!response.ok) {
      throw new TMDBError(
        `TMDB request failed (${response.status})`,
        'API_ERROR',
        response.status,
      );
    }

    return await response.json() as T;
  }

  private async searchWithSpacingFallback<T>(
    endpoint: string,
    query: string,
    page: number,
    options?: TMDBRequestOptions,
    fallbackLimit = MAX_SEARCH_SPACING_CANDIDATES,
    region?: string,
  ): Promise<TrendingResponse<T>> {
    const search = (term: string) => {
      const path = `${endpoint}?query=${encodeURIComponent(term)}&page=${page}`;
      const regionalPath = region ? addQueryParam(path, 'region', region) : path;
      return this.fetchFromTMDB<TrendingResponse<T>>(
        regionalPath,
        options,
      );
    };

    const results = await search(query);
    if (results.results.length > 0) return results;

    for (const candidate of getSearchSpacingCandidates(query).slice(0, fallbackLimit)) {
      const candidateResults = await search(candidate);
      if (candidateResults.results.length > 0) return candidateResults;
    }

    return results;
  }

  // --- HOME PAGE ENDPOINTS ---
  async getTrendingMovies(options?: TMDBRequestOptions): Promise<Movie[]> {
    if (import.meta.env.DEV) {
      const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/trending/movie/day', options);
      return data.results;
    }

    const data = await this.fetchFromAppApi<TrendingResponse<Movie>>('/api/tmdb/trending-movies', options);
    return data.results;
  }

  async getMoviesByReleaseDateRange(
    startDate: string,
    endDate: string,
    page: number = 1,
    options?: TMDBRequestOptions,
    region?: string,
  ): Promise<TrendingResponse<Movie>> {
    const params = new URLSearchParams({
      'primary_release_date.gte': startDate,
      'primary_release_date.lte': endDate,
      sort_by: 'popularity.desc',
      page: String(page),
    });
    if (region) params.set('region', region);
    return this.fetchFromTMDB<TrendingResponse<Movie>>(`/discover/movie?${params.toString()}`, options);
  }

  async getTrendingTVShows(options?: TMDBRequestOptions): Promise<TVShow[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>('/trending/tv/day', options);
    return withoutTalkShows(data.results);
  }

  async getPopularPersons(page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<PersonListResult>> {
    return this.fetchFromTMDB<TrendingResponse<PersonListResult>>(`/person/popular?page=${page}`, options);
  }

  async getTrendingPersons(page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<PersonListResult>> {
    return this.fetchFromTMDB<TrendingResponse<PersonListResult>>(`/trending/person/day?page=${page}`, options);
  }

  // Fetch collection (franchise/series) details
  async getCollectionDetails(id: number, options?: TMDBRequestOptions): Promise<Collection> {
    return this.fetchFromTMDB<Collection>(`/collection/${id}`, options);
  }

  // --- DISCOVER ENDPOINTS (NEW) ---
  
  async getTVShowsByCompany(companyId: number, page: number = 1, options?: TMDBRequestOptions, language?: string, sortBy: string = 'popularity.desc'): Promise<TrendingResponse<TVShow>> {
    const languageFilter = language ? `&with_original_language=${encodeURIComponent(language)}` : '';
    const path = `/discover/tv?with_companies=${companyId}${languageFilter}&without_genres=${TV_TALK_GENRE_ID}&page=${page}`;
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>(`${applySortParam(path, sortBy)}`, options);
    return { ...data, results: withoutTalkShows(data.results) };
  }

  async getTVShowsByProvider(providerId: number, page: number = 1, options?: TMDBRequestOptions, language?: string, sortBy: string = 'popularity.desc', region = 'US'): Promise<TrendingResponse<TVShow>> {
    const languageFilter = language ? `&with_original_language=${encodeURIComponent(language)}` : '';
    const path = `/discover/tv?with_watch_providers=${providerId}&watch_region=${encodeURIComponent(region || 'US')}${languageFilter}&without_genres=${TV_TALK_GENRE_ID}&page=${page}`;
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>(`${applySortParam(path, sortBy)}`, options);
    return { ...data, results: withoutTalkShows(data.results) };
  }

  // --- PAGINATED CATEGORY ENDPOINT ---
  async getCategoryList(category: string, page: number = 1, options?: TMDBRequestOptions, language?: string, sortBy: string = 'popularity.desc', region?: string): Promise<TrendingResponse<Movie | TVShow>> {
    if (!import.meta.env.DEV) {
      const params = new URLSearchParams({
        category,
        page: String(page),
        sortBy,
      });
      if (language) params.set('language', language);
      if (region) params.set('region', region);

      const data = await this.fetchFromAppApi<TrendingResponse<Movie | TVShow>>(
        `/api/tmdb/category?${params.toString()}`,
        options,
      );
      return category.endsWith('-tv')
        ? { ...data, results: withoutTalkShows(data.results) }
        : data;
    }

    if (category === 'trending-movies' || category === 'trending-tv') {
      const mediaType = category === 'trending-movies' ? 'movie' : 'tv';
      const data = await this.fetchFromTMDB<TrendingResponse<Movie | TVShow>>(
        `/trending/${mediaType}/day?page=${page}`,
        options,
      );
      return mediaType === 'tv'
        ? { ...data, results: withoutTalkShows(data.results) }
        : data;
    }

    const endpoints: Record<string, string> = {
      'popular-movies': '/movie/popular',
      'now-playing-movies': '/movie/now_playing',
      'top-rated-movies': '/movie/top_rated',
      'upcoming-movies': '/movie/upcoming',
      'popular-tv': '/tv/popular',
      'top-rated-tv': '/tv/top_rated',
      'trending-streaming-movies': '/discover/movie?with_watch_monetization_types=flatrate&sort_by=popularity.desc',
      'imdb-top-rated-movies': '/discover/movie?sort_by=vote_average.desc&vote_count.gte=10000'
    };
    
    const endpoint = endpoints[category];
    if (!endpoint) throw new Error('Invalid category');

    const isTVCategory = category.endsWith('-tv');
    const isDiscoverEndpoint = endpoint.startsWith('/discover/');
    const languageFilter = language
      ? `${isDiscoverEndpoint ? 'with_original_language' : 'language'}=${encodeURIComponent(language)}`
      : '';
    const talkFilter = isTVCategory ? `without_genres=${TV_TALK_GENRE_ID}` : '';
    const queryParams = [languageFilter, talkFilter, `page=${page}`].filter(Boolean).join('&');
    let path = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryParams}`;
    if (region && ['popular-movies', 'now-playing-movies', 'top-rated-movies', 'upcoming-movies', 'imdb-top-rated-movies'].includes(category)) {
      path = addQueryParam(path, 'region', region);
    }
    if (category === 'trending-streaming-movies') {
      path = addQueryParam(path, 'watch_region', region || 'US');
    }
    const requestPath = isDiscoverEndpoint ? applySortParam(path, sortBy) : path;
    const data = await this.fetchFromTMDB<TrendingResponse<Movie | TVShow>>(requestPath, options);
    return isTVCategory
      ? { ...data, results: withoutTalkShows(data.results) }
      : data;
  }

  async getFilteredMediaList(
    filters: MediaListDiscoveryFilters,
    options?: TMDBRequestOptions,
  ): Promise<TrendingResponse<Movie | TVShow>> {
    const {
      mediaType,
      page,
      category,
      genreId,
      language,
      sortBy = 'popularity.desc',
      companyId,
      providerId,
      region,
    } = filters;
    const params = new URLSearchParams({ page: String(page), sort_by: sortBy });
    const today = new Date();
    const todayString = today.toISOString().slice(0, 10);

    if (genreId !== undefined) params.set('with_genres', String(genreId));
    if (language) params.set('with_original_language', language);
    if (companyId !== undefined) params.set('with_companies', String(companyId));
    if (providerId !== undefined) {
      params.set('with_watch_providers', String(providerId));
      params.set('watch_region', region || 'US');
    }

    switch (category) {
      case 'now-playing-movies': {
        const startDate = new Date(today);
        startDate.setUTCDate(startDate.getUTCDate() - 90);
        params.set('primary_release_date.gte', startDate.toISOString().slice(0, 10));
        params.set('primary_release_date.lte', todayString);
        params.set('with_release_type', '2|3');
        if (region) params.set('region', region);
        break;
      }
      case 'upcoming-movies':
        params.set('primary_release_date.gte', todayString);
        if (region) params.set('region', region);
        break;
      case 'top-rated-movies':
      case 'top-rated-tv':
        params.set('vote_count.gte', '1');
        if (category === 'top-rated-movies' && region) params.set('region', region);
        break;
      case 'imdb-top-rated-movies':
        params.set('vote_count.gte', '10000');
        if (region) params.set('region', region);
        break;
      case 'trending-streaming-movies':
        params.set('with_watch_monetization_types', 'flatrate');
        params.set('watch_region', region || 'US');
        break;
      case 'popular-movies':
        if (region) params.set('region', region);
        break;
      default:
        break;
    }

    if (mediaType === 'tv') {
      params.set('without_genres', String(TV_TALK_GENRE_ID));
    }

    const data = await this.fetchFromTMDB<TrendingResponse<Movie | TVShow>>(
      `/discover/${mediaType}?${params.toString()}`,
      options,
    );
    return mediaType === 'tv'
      ? { ...data, results: withoutTalkShows(data.results) }
      : data;
  }

  async getGenreMediaList(mediaType: 'movie' | 'tv', genreId: number, page: number = 1, options?: TMDBRequestOptions, language?: string, sortBy: string = 'popularity.desc'): Promise<TrendingResponse<Movie | TVShow>> {
    const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv';
    const languageFilter = language ? `&with_original_language=${encodeURIComponent(language)}` : '';
    const talkFilter = mediaType === 'tv' ? `&without_genres=${TV_TALK_GENRE_ID}` : '';
    const path = `${endpoint}?with_genres=${genreId}${languageFilter}${talkFilter}`;
    const data = await this.fetchFromTMDB<TrendingResponse<Movie | TVShow>>(`${applySortParam(path, sortBy)}&page=${page}`, options);
    return mediaType === 'tv'
      ? { ...data, results: withoutTalkShows(data.results) }
      : data;
  }

  async getMediaByOriginalLanguage(mediaType: 'movie' | 'tv', language: string, page: number = 1, options?: TMDBRequestOptions, sortBy: string = 'popularity.desc'): Promise<TrendingResponse<Movie | TVShow>> {
    const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv';
    const talkFilter = mediaType === 'tv' ? `&without_genres=${TV_TALK_GENRE_ID}` : '';
    const path = `${endpoint}?with_original_language=${encodeURIComponent(language)}${talkFilter}`;
    const data = await this.fetchFromTMDB<TrendingResponse<Movie | TVShow>>(`${applySortParam(path, sortBy)}&page=${page}`, options);
    return mediaType === 'tv'
      ? { ...data, results: withoutTalkShows(data.results) }
      : data;
  }

  // --- DETAILS ENDPOINTS ---
  async getMovieDetails(id: number, options?: TMDBRequestOptions): Promise<Movie> {
    return this.fetchFromTMDB<Movie>(`/movie/${id}?append_to_response=credits,videos,images,recommendations,similar,external_ids,reviews,watch/providers,release_dates`, options);
  }

  async getMovieRecommendations(id: number, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<Movie>> {
    return this.fetchFromTMDB<TrendingResponse<Movie>>(`/movie/${id}/recommendations?page=${page}`, options);
  }

  async getSimilarMovies(id: number, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<Movie>> {
    return this.fetchFromTMDB<TrendingResponse<Movie>>(`/movie/${id}/similar?page=${page}`, options);
  }

  async getCountries(options?: TMDBRequestOptions): Promise<TMDBCountry[]> {
    return this.fetchFromTMDB<TMDBCountry[]>('/configuration/countries', options);
  }

  async getMovieReviews(id: number, page: number = 1, options?: TMDBRequestOptions): Promise<ReviewResponse> {
    return this.fetchFromTMDB<ReviewResponse>(`/movie/${id}/reviews?page=${page}`, options);
  }

  async getTVShowDetails(id: number, options?: TMDBRequestOptions): Promise<TVShow> {
    const show = await this.fetchFromTMDB<TVShow>(`/tv/${id}?append_to_response=credits,aggregate_credits,videos,images,recommendations,similar,external_ids,reviews,watch/providers,content_ratings`, options);
    return {
      ...show,
      recommendations: show.recommendations
        ? { ...show.recommendations, results: withoutTalkShows(show.recommendations.results) }
        : undefined,
      similar: show.similar
        ? { ...show.similar, results: withoutTalkShows(show.similar.results) }
        : undefined,
    };
  }

  async getTVShowRecommendations(id: number, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<TVShow>> {
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>(`/tv/${id}/recommendations?page=${page}`, options);
    return { ...data, results: withoutTalkShows(data.results) };
  }

  async getSimilarTVShows(id: number, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<TVShow>> {
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>(`/tv/${id}/similar?page=${page}`, options);
    return { ...data, results: withoutTalkShows(data.results) };
  }

  async getTVShowReviews(id: number, page: number = 1, options?: TMDBRequestOptions): Promise<ReviewResponse> {
    return this.fetchFromTMDB<ReviewResponse>(`/tv/${id}/reviews?page=${page}`, options);
  }

  async getTVSeasonDetails(tvId: number, seasonNumber: number, options?: TMDBRequestOptions): Promise<TVSeasonDetails> {
    return this.fetchFromTMDB<TVSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}?append_to_response=credits`, options);
  }

  async getTVEpisodeDetails(tvId: number, seasonNumber: number, episodeNumber: number, options?: TMDBRequestOptions): Promise<TVEpisodeDetails> {
    return this.fetchFromTMDB<TVEpisodeDetails>(
      `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}?append_to_response=credits,images,videos`,
      options,
    );
  }

  async createAccountRequestToken(): Promise<string> {
    const result = await this.fetchFromTMDB<{ request_token: string }>('/authentication/token/new');
    return result.request_token;
  }

  async createAccountSession(requestToken: string): Promise<string> {
    const result = await this.fetchFromTMDB<{ session_id: string }>('/authentication/session/new', {
      method: 'POST',
      body: { request_token: requestToken },
    });
    return result.session_id;
  }

  async deleteAccountSession(sessionId: string): Promise<void> {
    await this.fetchFromTMDB<{ success: boolean }>('/authentication/session', {
      method: 'DELETE',
      body: { session_id: sessionId },
    });
  }

  async getCurrentAccount(sessionId: string): Promise<TMDBAccount> {
    return this.fetchFromTMDB<TMDBAccount>('/account', { sessionId });
  }

  async createV4RequestToken(redirectTo: string): Promise<string> {
    this.requireV4AppAccessToken();
    const result = await this.fetchFromTMDB<{ request_token: string }>('/auth/request_token', {
      apiVersion: '4',
      method: 'POST',
      body: { redirect_to: redirectTo },
    });
    return result.request_token;
  }

  async createV4UserAccessToken(requestToken: string): Promise<{ accessToken: string; accountId: string }> {
    this.requireV4AppAccessToken();
    const result = await this.fetchFromTMDB<{ access_token: string; account_id: string }>('/auth/access_token', {
      apiVersion: '4',
      method: 'POST',
      body: { request_token: requestToken },
    });
    return { accessToken: result.access_token, accountId: result.account_id };
  }

  async revokeV4UserAccessToken(accessToken: string): Promise<void> {
    await this.fetchFromTMDB('/auth/access_token', {
      apiVersion: '4',
      method: 'DELETE',
      accessToken,
      body: { access_token: accessToken },
    });
  }

  private requireV4AppAccessToken() {
    if (!this.accessToken) {
      throw new TMDBError(
        'TMDB custom lists require the app-level v4 access token. Enter it on the login screen or configure VITE_TMDB_ACCESS_TOKEN at build time.',
        'AUTHENTICATION_ERROR',
      );
    }
  }

  async getAccountList(
    accountId: number,
    section: TMDBAccountSection,
    mediaType: 'movie' | 'tv',
    page: number,
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<TrendingResponse<TMDBAccountMedia>> {
    const mediaPath = mediaType === 'movie' ? 'movies' : 'tv';
    const sectionPath = section === 'watchlist'
      ? `watchlist/${mediaPath}`
      : section === 'favorites'
        ? `favorite/${mediaPath}`
        : `rated/${mediaPath}`;
    return this.fetchFromTMDB(
      `/account/${accountId}/${sectionPath}?page=${page}&sort_by=created_at.desc`,
      { sessionId, signal },
    );
  }

  async getAccountLists(
    accountId: string,
    page: number,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<TrendingResponse<TMDBUserList>> {
    return this.fetchFromTMDB<TrendingResponse<TMDBUserList>>(
      `/account/${encodeURIComponent(accountId)}/lists?page=${page}`,
      { apiVersion: '4', accessToken, signal },
    );
  }

  async getAccountListPreviews(
    lists: Array<Pick<TMDBUserList, 'id'>>,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<Record<number, { count: number; items: TMDBUserListItem[]; isPublic?: boolean }>> {
    const previews: Record<number, { count: number; items: TMDBUserListItem[]; isPublic?: boolean }> = {};

    for (let index = 0; index < lists.length; index += 5) {
      const batch = lists.slice(index, index + 5);
      const batchPreviews = await Promise.all(batch.map(async ({ id }) => {
        const details = await this.getUserList(id, accessToken, 1, signal);
        return [id, {
          count: details.total_results ?? details.results.length,
          items: details.results.slice(0, 3),
          ...(typeof details.public === 'boolean' ? { isPublic: details.public } : {}),
        }] as const;
      }));
      batchPreviews.forEach(([id, preview]) => {
        previews[id] = preview;
      });
    }

    return previews;
  }

  async getAccountUserListMemberships(
    accountId: string,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<Array<{ listId: number; mediaIds: { movie: number[]; tv: number[] } }>> {
    const lists: TMDBUserList[] = [];
    let totalPages = 1;

    for (let page = 1; page <= totalPages && page <= 500; page += 1) {
      const response = await this.getAccountLists(accountId, page, accessToken, signal);
      lists.push(...response.results);
      totalPages = Math.min(response.total_pages, 500);
    }

    const memberships: Array<{ listId: number; mediaIds: { movie: number[]; tv: number[] } }> = [];
    for (let index = 0; index < lists.length; index += 5) {
      const batch = lists.slice(index, index + 5);
      const batchMemberships = await Promise.all(batch.map(async (list) => {
        const details = await this.getUserList(list.id, accessToken, 1, signal);
        const mediaIds = {
          movie: new Set((details.object_ids?.movie ?? []).map(Number).filter(Number.isSafeInteger)),
          tv: new Set((details.object_ids?.tv ?? []).map(Number).filter(Number.isSafeInteger)),
        };

        const addPageItems = (pageDetails: TMDBUserListDetails) => {
          pageDetails.results.forEach((item) => mediaIds[item.media_type].add(item.id));
        };
        addPageItems(details);

        const objectIdCount = mediaIds.movie.size + mediaIds.tv.size;
        if (objectIdCount < details.total_results) {
          let listPages = Math.min(details.total_pages, 500);
          for (let page = 2; page <= listPages; page += 1) {
            const pageDetails = await this.getUserList(list.id, accessToken, page, signal);
            addPageItems(pageDetails);
            listPages = Math.min(pageDetails.total_pages, 500);
          }
        }

        return {
          listId: list.id,
          mediaIds: { movie: [...mediaIds.movie], tv: [...mediaIds.tv] },
        };
      }));
      memberships.push(...batchMemberships);
    }

    return memberships;
  }

  async getUserList(
    listId: number,
    accessToken: string,
    page: number,
    signal?: AbortSignal,
  ): Promise<TMDBUserListDetails> {
    return this.fetchFromTMDB<TMDBUserListDetails>(`/list/${listId}?page=${page}`, {
      apiVersion: '4',
      accessToken,
      signal,
    });
  }

  async getAllUserListItems(
    listId: number,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<TMDBUserListItem[]> {
    const firstPage = await this.getUserList(listId, accessToken, 1, signal);
    const items = [...firstPage.results];
    let totalPages = Math.min(firstPage.total_pages, 500);

    for (let page = 2; page <= totalPages; page += 1) {
      const pageDetails = await this.getUserList(listId, accessToken, page, signal);
      items.push(...pageDetails.results);
      totalPages = Math.min(pageDetails.total_pages, 500);
    }

    return items;
  }

  async createUserList(
    name: string,
    description: string,
    isPublic: boolean,
    accessToken: string,
    region = 'US',
  ): Promise<{ id: number; success: boolean }> {
    return this.fetchFromTMDB<{ id: number; success: boolean }>('/list', {
      apiVersion: '4',
      method: 'POST',
      accessToken,
      body: { name, description, iso_3166_1: region, iso_639_1: 'en', public: isPublic },
    });
  }

  async addMediaToUserList(
    listId: number,
    mediaType: 'movie' | 'tv',
    mediaId: number,
    accessToken: string,
  ): Promise<void> {
    await this.updateUserListItem(listId, mediaType, mediaId, accessToken, 'POST');
  }

  async removeMediaFromUserList(
    listId: number,
    mediaType: 'movie' | 'tv',
    mediaId: number,
    accessToken: string,
  ): Promise<void> {
    await this.updateUserListItem(listId, mediaType, mediaId, accessToken, 'DELETE');
  }

  private async updateUserListItem(
    listId: number,
    mediaType: 'movie' | 'tv',
    mediaId: number,
    accessToken: string,
    method: 'POST' | 'DELETE',
  ): Promise<void> {
    const response = await this.fetchFromTMDB<{
      success: boolean;
      status_message?: string;
      results?: Array<{ media_type: string; media_id: number; success: boolean }>;
    }>(`/list/${listId}/items`, {
      apiVersion: '4',
      method,
      accessToken,
      body: { items: [{ media_type: mediaType, media_id: mediaId }] },
    });
    const operationResult = response.results?.find(
      (item) => item.media_type === mediaType && item.media_id === mediaId,
    );
    if (!response.success || operationResult?.success === false) {
      throw new TMDBError(
        response.status_message ?? 'TMDB could not update this list item.',
        'API_ERROR',
      );
    }
  }

  async deleteUserList(listId: number, accessToken: string): Promise<void> {
    await this.fetchFromTMDB(`/list/${listId}`, { apiVersion: '4', method: 'DELETE', accessToken });
  }

  async updateUserList(
    listId: number,
    name: string,
    description: string,
    isPublic: boolean,
    accessToken: string,
    language = 'en',
  ): Promise<void> {
    const response = await this.fetchFromTMDB<{ success: boolean; status_message?: string }>(
      `/list/${listId}`,
      {
        apiVersion: '4',
        method: 'PUT',
        accessToken,
        body: { name, description, iso_639_1: language, public: isPublic },
      },
    );
    if (!response.success) {
      throw new TMDBError(response.status_message ?? 'TMDB could not update this list.', 'API_ERROR');
    }
  }

  async getMediaAccountState(
    mediaType: 'movie' | 'tv',
    mediaId: number,
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<TMDBMediaAccountState> {
    return this.fetchFromTMDB<TMDBMediaAccountState>(
      `/${mediaType}/${mediaId}/account_states`,
      { sessionId, signal },
    );
  }

  async setAccountWatchlist(
    accountId: number,
    mediaType: 'movie' | 'tv',
    mediaId: number,
    watchlist: boolean,
    sessionId: string,
  ): Promise<void> {
    await this.fetchFromTMDB(`/account/${accountId}/watchlist`, {
      method: 'POST',
      sessionId,
      body: { media_type: mediaType, media_id: mediaId, watchlist },
    });
  }

  async setAccountFavorite(
    accountId: number,
    mediaType: 'movie' | 'tv',
    mediaId: number,
    favorite: boolean,
    sessionId: string,
  ): Promise<void> {
    await this.fetchFromTMDB(`/account/${accountId}/favorite`, {
      method: 'POST',
      sessionId,
      body: { media_type: mediaType, media_id: mediaId, favorite },
    });
  }

  async rateMedia(
    mediaType: 'movie' | 'tv',
    mediaId: number,
    rating: number,
    sessionId: string,
  ): Promise<void> {
    if (!Number.isFinite(rating) || rating < 0.5 || rating > 10 || rating * 2 % 1 !== 0) {
      throw new RangeError('TMDB ratings must be between 0.5 and 10 in half-point increments.');
    }
    await this.fetchFromTMDB(`/${mediaType}/${mediaId}/rating`, {
      method: 'POST',
      sessionId,
      body: { value: rating },
    });
  }

  async deleteMediaRating(mediaType: 'movie' | 'tv', mediaId: number, sessionId: string): Promise<void> {
    await this.fetchFromTMDB(`/${mediaType}/${mediaId}/rating`, {
      method: 'DELETE',
      sessionId,
    });
  }

  async getTVEpisodeAccountState(
    tvId: number,
    seasonNumber: number,
    episodeNumber: number,
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<TMDBMediaAccountState> {
    return this.fetchFromTMDB<TMDBMediaAccountState>(
      `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}/account_states`,
      { sessionId, signal },
    );
  }

  async rateTVEpisode(
    tvId: number,
    seasonNumber: number,
    episodeNumber: number,
    rating: number,
    sessionId: string,
  ): Promise<void> {
    if (!Number.isFinite(rating) || rating < 0.5 || rating > 10 || rating * 2 % 1 !== 0) {
      throw new RangeError('TMDB ratings must be between 0.5 and 10 in half-point increments.');
    }
    await this.fetchFromTMDB(
      `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}/rating`,
      { method: 'POST', sessionId, body: { value: rating } },
    );
  }

  async deleteTVEpisodeRating(
    tvId: number,
    seasonNumber: number,
    episodeNumber: number,
    sessionId: string,
  ): Promise<void> {
    await this.fetchFromTMDB(
      `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}/rating`,
      { method: 'DELETE', sessionId },
    );
  }

  async getPersonDetails(id: number, options?: TMDBRequestOptions): Promise<Person> {
    const person = await this.fetchFromTMDB<Person>(`/person/${id}?append_to_response=combined_credits,images,external_ids`, options);
    return {
      ...person,
      combined_credits: person.combined_credits
        ? {
            ...person.combined_credits,
            cast: person.combined_credits.cast.filter(
              (credit) => credit.media_type !== 'tv' || shouldIncludePersonCredit(credit),
            ),
            crew: person.combined_credits.crew?.filter(
              (credit) => credit.media_type !== 'tv' || shouldIncludePersonCredit(credit),
            ),
          }
        : undefined,
    };
  }

  async getPersonCredits(personId: number, mediaType: 'movie' | 'tv', options?: TMDBRequestOptions): Promise<TrendingResponse<PersonCredit>> {
    const endpoint = mediaType === 'movie' ? `/person/${personId}/movie_credits` : `/person/${personId}/tv_credits`;
    const data = await this.fetchFromTMDB<PersonCreditsResponse>(endpoint, options);

    const credits = [
      ...(data.cast || []).map((item) => ({ ...item, media_type: mediaType })),
      ...(data.crew || []).map((item) => ({ ...item, media_type: mediaType })),
    ].filter((item) => mediaType !== 'tv' || shouldIncludePersonCredit(item));
    const results = mergePersonCredits(credits);

    return {
      page: 1,
      results,
      total_pages: 1,
      total_results: results.length,
    };
  }

  // --- SEARCH ---
  async searchMovies(query: string, page: number = 1, options?: TMDBRequestOptions, region?: string): Promise<TrendingResponse<Movie>> {
    return this.searchWithSpacingFallback<Movie>('/search/movie', query, page, options, MAX_SEARCH_SPACING_CANDIDATES, region);
  }

  async searchTVShows(query: string, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<TVShow>> {
    return this.searchWithSpacingFallback<TVShow>('/search/tv', query, page, options);
  }

  async searchPersons(query: string, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<PersonListResult>> {
    return this.searchWithSpacingFallback<PersonListResult>('/search/person', query, page, options);
  }

  async searchMulti(query: string, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<MultiSearchResult>> {
    return this.fetchFromTMDB<TrendingResponse<MultiSearchResult>>(
      `/search/multi?query=${encodeURIComponent(query)}&page=${page}`,
      options,
    );
  }

  getImageUrl(path: string | null, size: 'w500' | 'w780' | 'original' = 'w500'): string {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  }

  getImageSrcSet(path: string | null): string | undefined {
    if (!path) return undefined;
    return ['w185', 'w342', 'w500', 'w780', 'original']
      .map((size) => `${TMDB_IMAGE_BASE_URL}/${size}${path} ${size === 'original' ? 1500 : Number(size.slice(1))}w`)
      .join(', ');
  }

  async validateApiKey(key: string, options?: TMDBRequestOptions): Promise<boolean> {
    try {
      const url = new URL(`${TMDB_BASE_URL}/3/configuration`);
      url.searchParams.set('api_key', key);
      const response = await fetch(url, { signal: options?.signal });
      return response.ok;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      return false;
    }
  }
}

function applySortParam(endpoint: string, sortBy: string = 'popularity.desc'): string {
  const normalizedSort = sortBy || 'popularity.desc';
  const encodedSort = encodeURIComponent(normalizedSort);
  const movieReleaseDateLimit = endpoint.startsWith('/discover/movie?') && normalizedSort === 'primary_release_date.desc'
    ? `&primary_release_date.lte=${new Date().toISOString().slice(0, 10)}`
    : '';

  if (endpoint.includes('sort_by=')) {
    return `${endpoint.replace(/sort_by=[^&]+/, `sort_by=${encodedSort}`)}${movieReleaseDateLimit}`;
  }

  return `${endpoint}${endpoint.includes('?') ? '&' : '?'}sort_by=${encodedSort}${movieReleaseDateLimit}`;
}

export const tmdbService = new TMDBService();