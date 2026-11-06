import { describe, expect, it } from 'vitest';
import {
  createEmbedSettingsFile,
  isValidEmbedUrlTemplate,
  parseEmbedSettingsFile,
} from '@/lib/embedSettings';

describe('embed settings file', () => {
  it('exports and imports movie, TV, and country settings', () => {
    const contents = createEmbedSettingsFile(
      [{ name: 'movie.example', urlTemplate: 'https://movie.example/{TMDB_ID}' }],
      [{ name: 'tv.example', urlTemplate: 'https://tv.example/{TMDB_ID}/{SEASON}/{EPISODE}' }],
      'IN',
    );

    expect(JSON.parse(contents)).toEqual({
      version: 1,
      movieLinks: ['https://movie.example/{TMDB_ID}'],
      tvLinks: ['https://tv.example/{TMDB_ID}/{SEASON}/{EPISODE}'],
      region: 'IN',
    });
    expect(parseEmbedSettingsFile(contents)).toEqual({
      movieLinks: [{ name: 'movie.example', urlTemplate: 'https://movie.example/{TMDB_ID}' }],
      tvLinks: [{ name: 'tv.example', urlTemplate: 'https://tv.example/{TMDB_ID}/{SEASON}/{EPISODE}' }],
      region: 'IN',
    });
  });

  it('rejects invalid JSON, unsupported formats, and non-http URLs', () => {
    expect(() => parseEmbedSettingsFile('not json')).toThrow('not valid JSON');
    expect(() => parseEmbedSettingsFile(JSON.stringify({ version: 2, movieLinks: [], tvLinks: [] })))
      .toThrow('not a supported embed settings export');
    expect(() => parseEmbedSettingsFile(JSON.stringify({
      version: 1,
      movieLinks: ['javascript:alert(1)'],
      tvLinks: [],
    }))).toThrow('invalid URL template');
  });

  it('allows blank draft fields during normal settings validation', () => {
    expect(isValidEmbedUrlTemplate('')).toBe(true);
    expect(isValidEmbedUrlTemplate('https://example.com/{TMDB_ID}')).toBe(true);
    expect(isValidEmbedUrlTemplate('javascript:alert(1)')).toBe(false);
  });
});
