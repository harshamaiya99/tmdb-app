const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

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
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: Genre[];
  runtime?: number;
  status?: string;
  tagline?: string;
  credits?: { cast: Cast[]; crew: Crew[] };
  videos?: { results: Video[] };
  similar?: { results: Movie[] };
  external_ids?: { imdb_id: string | null };
  reviews?: { results: Review[] };
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  };
  production_companies?: ProductionCompany[]; 
  'watch/providers'?: WatchProviders;
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
  first_air_date: string;
  vote_average: number;
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
  similar?: { results: TVShow[] };
  external_ids?: { imdb_id: string | null };
  reviews?: { results: Review[] };
  aggregate_credits?: { cast: AggregateCast[]; crew: Crew[] };
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
  combined_credits?: {
    cast: PersonCredit[];
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
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
  character: string;
  popularity: number;
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

export function isActingCredit(character: string | undefined, title?: string): boolean {
  const rawCharacter = String(character ?? '').trim().toLowerCase();
  if (!rawCharacter) return true;

  const genericCharacterPatterns = [
    'himself',
    'herself',
    'themselves',
    'self',
    'guest',
    'host',
    'presenter',
    'panelist',
    'anchor',
    'commentator',
    'moderator',
    'contestant',
    'judge',
    'narrator',
    'interviewee',
    'guest star',
  ];

  const talkShowPatterns = /(talk|late|tonight|show|view|today|jimmy|conan|ellen|kimmel|fallon|oprah|daily|watch what happens|award|tony|emmy|golden globe|saturday night live|snl|jimmy kimmel live|the late show|late night)/i;
  const rawTitle = String(title ?? '').trim().toLowerCase();

  const matchesGenericRole = genericCharacterPatterns.some((pattern) => rawCharacter.includes(pattern));
  if (!matchesGenericRole) {
    return true;
  }

  if (!rawTitle) {
    return false;
  }

  return !talkShowPatterns.test(rawTitle);
}

export interface TrendingResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

interface PersonCreditsResponse {
  page?: number;
  cast: Omit<PersonCredit, 'media_type'>[];
  total_pages?: number;
}

interface TMDBErrorResponse {
  status_code?: number;
  status_message?: string;
}

export interface TMDBRequestOptions {
  signal?: AbortSignal;
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
  private readonly accessToken = import.meta.env.VITE_TMDB_ACCESS_TOKEN ?? '';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  private async fetchFromTMDB<T>(endpoint: string, options: TMDBRequestOptions = {}): Promise<T> {
    if (!this.apiKey && !this.accessToken) {
      throw new TMDBError('TMDB credentials are not configured', 'AUTHENTICATION_ERROR');
    }

    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    const headers: HeadersInit = {};

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    } else {
      url.searchParams.set('api_key', this.apiKey);
    }

    let response: Response;
    try {
      response = await fetch(url, { headers, signal: options.signal });
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

  // --- HOME PAGE ENDPOINTS ---
  async getTrendingMovies(options?: TMDBRequestOptions): Promise<Movie[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/trending/movie/day', options);
    return data.results;
  }

  async getNowPlayingMovies(options?: TMDBRequestOptions): Promise<Movie[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/movie/now_playing', options);
    return data.results;
  }

  async getTopRatedMovies(options?: TMDBRequestOptions): Promise<Movie[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/movie/top_rated', options);
    return data.results;
  }

  async getUpcomingMovies(options?: TMDBRequestOptions): Promise<Movie[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/movie/upcoming', options);
    return data.results;
  }

  async getTrendingTVShows(options?: TMDBRequestOptions): Promise<TVShow[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>('/trending/tv/day', options);
    return data.results;
  }

  async getPopularTVShows(options?: TMDBRequestOptions): Promise<TVShow[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>('/tv/popular', options);
    return data.results;
  }

  async getTopRatedTVShows(options?: TMDBRequestOptions): Promise<TVShow[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>('/tv/top_rated', options);
    return data.results;
  }

  async getPopularPersons(page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<PersonListResult>> {
    return this.fetchFromTMDB<TrendingResponse<PersonListResult>>(`/person/popular?page=${page}`, options);
  }

  async getTrendingStreamingMovies(options?: TMDBRequestOptions): Promise<Movie[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/discover/movie?watch_region=IN&with_watch_monetization_types=flatrate&sort_by=popularity.desc', options);
    return data.results;
  }

  async getIMDbTopRatedMovies(options?: TMDBRequestOptions): Promise<Movie[]> {
    // Mimics IMDb Top 250 by getting highest rated movies with at least 10,000 votes
    const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/discover/movie?sort_by=vote_average.desc&vote_count.gte=10000', options);
    return data.results;
  }

  // Fetch collection (franchise/series) details
  async getCollectionDetails(id: number, options?: TMDBRequestOptions): Promise<Collection> {
    return this.fetchFromTMDB<Collection>(`/collection/${id}`, options);
  }

  // --- DISCOVER ENDPOINTS (NEW) ---
  
  // Fetch movies by production company
  async getMoviesByCompany(companyId: number, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<Movie>> {
    return this.fetchFromTMDB<TrendingResponse<Movie>>(`/discover/movie?with_companies=${companyId}&page=${page}&sort_by=popularity.desc`, options);
  }

  // Fetch movies by streaming provider (defaulting to US region)
  async getMoviesByProvider(providerId: number, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<Movie>> {
    return this.fetchFromTMDB<TrendingResponse<Movie>>(`/discover/movie?with_watch_providers=${providerId}&watch_region=US&page=${page}&sort_by=popularity.desc`, options);
  }

  // --- PAGINATED CATEGORY ENDPOINT ---
  async getCategoryList(category: string, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<Movie | TVShow>> {
    const endpoints: Record<string, string> = {
      'trending-movies': '/trending/movie/day',
      'now-playing-movies': '/movie/now_playing',
      'top-rated-movies': '/movie/top_rated',
      'upcoming-movies': '/movie/upcoming',
      'trending-tv': '/trending/tv/day',
      'popular-tv': '/tv/popular',
      'top-rated-tv': '/tv/top_rated',
      'trending-streaming-movies': '/discover/movie?watch_region=IN&with_watch_monetization_types=flatrate&sort_by=popularity.desc',
      'imdb-top-rated-movies': '/discover/movie?sort_by=vote_average.desc&vote_count.gte=10000'
    };
    
    const endpoint = endpoints[category];
    if (!endpoint) throw new Error('Invalid category');
    
    const separator = endpoint.includes('?') ? '&' : '?';
    return this.fetchFromTMDB<TrendingResponse<Movie | TVShow>>(`${endpoint}${separator}page=${page}`, options);
  }

  async getGenreMediaList(mediaType: 'movie' | 'tv', genreId: number, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<Movie | TVShow>> {
    const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv';
    return this.fetchFromTMDB<TrendingResponse<Movie | TVShow>>(`${endpoint}?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`, options);
  }

  // --- DETAILS ENDPOINTS ---
  async getMovieDetails(id: number, options?: TMDBRequestOptions): Promise<Movie> {
    return this.fetchFromTMDB<Movie>(`/movie/${id}?append_to_response=credits,videos,similar,external_ids,reviews,watch/providers`, options);
  }

  async getTVShowDetails(id: number, options?: TMDBRequestOptions): Promise<TVShow> {
    return this.fetchFromTMDB<TVShow>(`/tv/${id}?append_to_response=credits,aggregate_credits,videos,similar,external_ids,reviews`, options);
  }

  async getTVSeasonDetails(tvId: number, seasonNumber: number, options?: TMDBRequestOptions): Promise<TVSeasonDetails> {
    return this.fetchFromTMDB<TVSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}?append_to_response=credits`, options);
  }

  async getPersonDetails(id: number, options?: TMDBRequestOptions): Promise<Person> {
    return this.fetchFromTMDB<Person>(`/person/${id}?append_to_response=combined_credits,images`, options);
  }

  async getPersonCredits(personId: number, mediaType: 'movie' | 'tv', page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<PersonCredit>> {
    const endpoint = mediaType === 'movie' ? `/person/${personId}/movie_credits` : `/person/${personId}/tv_credits`;
    const data = await this.fetchFromTMDB<PersonCreditsResponse>(`${endpoint}?page=${page}`, options);

    const results = (data.cast || [])
      .filter((item) => isActingCredit(item.character, item.name || item.title))
      .map((item) => ({
        ...item,
        media_type: mediaType,
      })) as PersonCredit[];

    return {
      page: data.page ?? page,
      results,
      total_pages: data.total_pages ?? 1,
      total_results: data.cast?.length ?? 0,
    };
  }

  // --- SEARCH ---
  async searchMovies(query: string, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<Movie>> {
    return this.fetchFromTMDB<TrendingResponse<Movie>>(`/search/movie?query=${encodeURIComponent(query)}&page=${page}`, options);
  }

  async searchTVShows(query: string, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<TVShow>> {
    return this.fetchFromTMDB<TrendingResponse<TVShow>>(`/search/tv?query=${encodeURIComponent(query)}&page=${page}`, options);
  }

  async searchPersons(query: string, page: number = 1, options?: TMDBRequestOptions): Promise<TrendingResponse<PersonListResult>> {
    return this.fetchFromTMDB<TrendingResponse<PersonListResult>>(`/search/person?query=${encodeURIComponent(query)}&page=${page}`, options);
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
      const url = new URL(`${TMDB_BASE_URL}/configuration`);
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

export const tmdbService = new TMDBService();