import { describe, expect, it } from 'vitest';
import { buildEmbedUrl, formatDate, formatLanguage, getEmbedLinkName } from '@/lib/utils';

describe('formatDate', () => {
  it('formats valid dates using the shared display format', () => {
    expect(formatDate('2024-09-27T12:00:00')).toBe('27 Sep 2024');
    expect(formatDate('2024-09-27')).toBe('27 Sep 2024');
  });

  it('returns an empty string for missing or invalid dates', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('formatLanguage', () => {
  it('formats TMDB language codes as English display names', () => {
    expect(formatLanguage('en')).toBe('English');
    expect(formatLanguage('ja')).toBe('Japanese');
  });

  it('returns an uppercase code for missing display names', () => {
    expect(formatLanguage('')).toBe('');
    expect(formatLanguage('xx')).toBe('XX');
  });
});

describe('buildEmbedUrl', () => {
  it('replaces all supported placeholders', () => {
    expect(buildEmbedUrl('/movie/{TMDB_ID}/{IMDB_ID}/{TMDB_ID}', 42, 'tt123'))
      .toBe('/movie/42/tt123/42');
  });

  it('returns a placeholder URL when no template is configured', () => {
    expect(buildEmbedUrl(undefined, 42)).toBe('#');
  });
});

describe('getEmbedLinkName', () => {
  it('uses the URL hostname, without a leading www, as the link name', () => {
    expect(getEmbedLinkName('https://www.example.com/movie/{TMDB_ID}')).toBe('example.com');
  });

  it('returns an empty name for invalid URLs', () => {
    expect(getEmbedLinkName('not a URL')).toBe('');
  });
});
