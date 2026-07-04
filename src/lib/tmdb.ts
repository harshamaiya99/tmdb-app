// src/lib/tmdb.ts

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
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
  credits?: { cast: Cast[] };
  videos?: { results: Video[] };
  similar?: { results: Movie[] };
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
  seasons?: Season[];
  credits?: { cast: Cast[] };
  videos?: { results: Video[] };
  similar?: { results: TVShow[] };
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

class TMDBService {
  private apiKey: string = '';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  private async fetchFromTMDB<T>(endpoint: string): Promise<T> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const url = `${TMDB_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${this.apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key');
      }
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    return response.json();
  }

  // --- HOME PAGE ENDPOINTS ---
  async getTrendingMovies(): Promise<Movie[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/trending/movie/day');
    return data.results;
  }

  async getNowPlayingMovies(): Promise<Movie[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/movie/now_playing');
    return data.results;
  }

  async getTopRatedMovies(): Promise<Movie[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/movie/top_rated');
    return data.results;
  }

  async getUpcomingMovies(): Promise<Movie[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/movie/upcoming');
    return data.results;
  }

  async getTrendingTVShows(): Promise<TVShow[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>('/trending/tv/day');
    return data.results;
  }

  async getPopularTVShows(): Promise<TVShow[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>('/tv/popular');
    return data.results;
  }

  async getTopRatedTVShows(): Promise<TVShow[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>('/tv/top_rated');
    return data.results;
  }

  // --- PAGINATED CATEGORY ENDPOINT ---
  async getCategoryList(category: string, page: number = 1): Promise<TrendingResponse<any>> {
    const endpoints: Record<string, string> = {
      'trending-movies': '/trending/movie/day',
      'now-playing-movies': '/movie/now_playing',
      'top-rated-movies': '/movie/top_rated',
      'upcoming-movies': '/movie/upcoming',
      'trending-tv': '/trending/tv/day',
      'popular-tv': '/tv/popular',
      'top-rated-tv': '/tv/top_rated'
    };
    
    const endpoint = endpoints[category];
    if (!endpoint) throw new Error('Invalid category');
    
    return this.fetchFromTMDB<TrendingResponse<any>>(`${endpoint}?page=${page}`);
  }

  async getGenreMediaList(mediaType: 'movie' | 'tv', genreId: number, page: number = 1): Promise<TrendingResponse<any>> {
    const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv';
    return this.fetchFromTMDB<TrendingResponse<any>>(`${endpoint}?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`);
  }

  // --- DETAILS ENDPOINTS (RESTORED append_to_response!) ---
  async getMovieDetails(id: number): Promise<Movie> {
    return this.fetchFromTMDB<Movie>(`/movie/${id}?append_to_response=credits,videos,similar`);
  }

  async getTVShowDetails(id: number): Promise<TVShow> {
    return this.fetchFromTMDB<TVShow>(`/tv/${id}?append_to_response=credits,videos,similar`);
  }

  // RESTORED Seasons and Episodes fetcher!
  async getTVSeasonDetails(tvId: number, seasonNumber: number): Promise<TVSeasonDetails> {
    return this.fetchFromTMDB<TVSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
  }

  // RESTORED Person Details fetcher!
  async getPersonDetails(id: number): Promise<Person> {
    return this.fetchFromTMDB<Person>(`/person/${id}?append_to_response=combined_credits,images`);
  }

  async getPersonCredits(personId: number, mediaType: 'movie' | 'tv', page: number = 1): Promise<TrendingResponse<PersonCredit>> {
    const endpoint = mediaType === 'movie' ? `/person/${personId}/movie_credits` : `/person/${personId}/tv_credits`;
    const data = await this.fetchFromTMDB<any>(`${endpoint}?page=${page}`);

    const results = (data.cast || [])
      .filter((item: any) => isActingCredit(item.character, item.name || item.title))
      .map((item: any) => ({
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
  async searchMovies(query: string, page: number = 1): Promise<TrendingResponse<Movie>> {
    return this.fetchFromTMDB<TrendingResponse<Movie>>(`/search/movie?query=${encodeURIComponent(query)}&page=${page}`);
  }

  async searchTVShows(query: string, page: number = 1): Promise<TrendingResponse<TVShow>> {
    return this.fetchFromTMDB<TrendingResponse<TVShow>>(`/search/tv?query=${encodeURIComponent(query)}&page=${page}`);
  }

  getImageUrl(path: string | null, size: 'w500' | 'w780' | 'original' = 'w500'): string {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  }

  async validateApiKey(key: string): Promise<boolean> {
    try {
      const url = `${TMDB_BASE_URL}/configuration?api_key=${key}`;
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const tmdbService = new TMDBService();