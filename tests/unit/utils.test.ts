import { describe, expect, it } from 'vitest';
import { buildEmbedUrl, formatDate } from '@/lib/utils';

describe('formatDate', () => {
  it('formats valid dates using the shared display format', () => {
    expect(formatDate('2024-09-27T12:00:00')).toBe('27 Sep 2024');
  });

  it('returns an empty string for missing or invalid dates', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('not-a-date')).toBe('');
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
