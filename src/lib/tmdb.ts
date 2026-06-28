const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

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
}

export interface Genre {
  id: number;
  name: string;
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

  async getTrendingMovies(): Promise<Movie[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<Movie>>('/trending/movie/day');
    return data.results;
  }

  async getTrendingTVShows(): Promise<TVShow[]> {
    const data = await this.fetchFromTMDB<TrendingResponse<TVShow>>('/trending/tv/day');
    return data.results;
  }

  async getMovieDetails(id: number): Promise<Movie> {
    return this.fetchFromTMDB<Movie>(`/movie/${id}`);
  }

  async getTVShowDetails(id: number): Promise<TVShow> {
    return this.fetchFromTMDB<TVShow>(`/tv/${id}`);
  }

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
