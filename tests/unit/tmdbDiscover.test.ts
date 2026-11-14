import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tmdbService } from '../../src/lib/tmdb';

describe('TMDB discovery app API routing', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', false);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      page: 1,
      results: [
        { id: 1, title: 'Result', genre_ids: [18] },
        { id: 2, name: 'Talk Show', genre_ids: [10767] },
      ],
      total_pages: 1,
      total_results: 2,
    }))));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('routes genre and original-language lists through validated discovery', async () => {
    await tmdbService.getGenreMediaList('tv', 18, 2, undefined, 'en', 'vote_average.desc');
    await tmdbService.getMediaByOriginalLanguage('movie', 'fr', 3, undefined, 'popularity.asc');

    const calls = vi.mocked(fetch).mock.calls;
    const genreUrl = new URL(String(calls[0][0]), 'https://app.test');
    expect(genreUrl.pathname).toBe('/api/tmdb/discover');
    expect(genreUrl.searchParams.get('mediaType')).toBe('tv');
    expect(genreUrl.searchParams.get('with_genres')).toBe('18');
    expect(genreUrl.searchParams.get('with_original_language')).toBe('en');
    expect(genreUrl.searchParams.get('without_genres')).toBe('10767');
    expect(genreUrl.searchParams.get('page')).toBe('2');
    expect(genreUrl.searchParams.get('sort_by')).toBe('vote_average.desc');

    const languageUrl = new URL(String(calls[1][0]), 'https://app.test');
    expect(languageUrl.searchParams.get('mediaType')).toBe('movie');
    expect(languageUrl.searchParams.get('with_original_language')).toBe('fr');
    expect(languageUrl.searchParams.get('page')).toBe('3');
    expect(languageUrl.searchParams.get('sort_by')).toBe('popularity.asc');
  });

  it('routes company and provider TV lists and retains Talk-show filtering', async () => {
    const companyResult = await tmdbService.getTVShowsByCompany(420, 2, undefined, 'ja', 'vote_count.desc');
    const providerResult = await tmdbService.getTVShowsByProvider(8, 3, undefined, 'en', 'popularity.asc', 'IN');

    expect(companyResult.results).toHaveLength(1);
    expect(providerResult.results).toHaveLength(1);
    const calls = vi.mocked(fetch).mock.calls;
    const companyUrl = new URL(String(calls[0][0]), 'https://app.test');
    expect(companyUrl.searchParams.get('with_companies')).toBe('420');
    expect(companyUrl.searchParams.get('with_original_language')).toBe('ja');
    expect(companyUrl.searchParams.get('without_genres')).toBe('10767');

    const providerUrl = new URL(String(calls[1][0]), 'https://app.test');
    expect(providerUrl.searchParams.get('with_watch_providers')).toBe('8');
    expect(providerUrl.searchParams.get('watch_region')).toBe('IN');
    expect(providerUrl.searchParams.get('with_original_language')).toBe('en');
  });

  it('routes composed category filters through discovery without dropping constraints', async () => {
    await tmdbService.getFilteredMediaList({
      mediaType: 'movie',
      page: 4,
      category: 'upcoming-movies',
      genreId: 18,
      language: 'en',
      sortBy: 'release_date.asc',
      companyId: 420,
      providerId: 8,
      region: 'IN',
    });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]), 'https://app.test');
    expect(url.pathname).toBe('/api/tmdb/discover');
    expect(url.searchParams.get('mediaType')).toBe('movie');
    expect(url.searchParams.get('page')).toBe('4');
    expect(url.searchParams.get('with_genres')).toBe('18');
    expect(url.searchParams.get('with_original_language')).toBe('en');
    expect(url.searchParams.get('with_companies')).toBe('420');
    expect(url.searchParams.get('with_watch_providers')).toBe('8');
    expect(url.searchParams.get('watch_region')).toBe('IN');
    expect(url.searchParams.get('primary_release_date.gte')).toBeTruthy();
  });

  it('routes paginated release-calendar results through the release-range mode', async () => {
    await tmdbService.getMoviesByReleaseDateRange('2026-10-01', '2026-10-31', 2, undefined, 'IN');

    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]), 'https://app.test');
    expect(url.pathname).toBe('/api/tmdb/discover');
    expect(url.searchParams.get('mode')).toBe('release-date-range');
    expect(url.searchParams.get('mediaType')).toBe('movie');
    expect(url.searchParams.get('startDate')).toBe('2026-10-01');
    expect(url.searchParams.get('endDate')).toBe('2026-10-31');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('region')).toBe('IN');
  });
});
