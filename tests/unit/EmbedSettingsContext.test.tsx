import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EmbedSettingsProvider, useEmbedSettings } from '@/contexts/EmbedSettingsContext';

function SettingsProbe() {
  const { movieLinks, tvLinks, saveSettings, resetSettings } = useEmbedSettings();

  return (
    <div>
      <output data-testid="movie-links">{JSON.stringify(movieLinks)}</output>
      <output data-testid="tv-links">{JSON.stringify(tvLinks)}</output>
      <button
        type="button"
        onClick={() => saveSettings({
          movieLinks: [
            { name: 'Primary', urlTemplate: 'https://example.com/movie/{TMDB_ID}' },
            { name: 'Backup', urlTemplate: 'https://backup.example.com/movie/{TMDB_ID}' },
          ],
          tvLinks: [],
        })}
      >
        Save
      </button>
      <button type="button" onClick={resetSettings}>Reset</button>
    </div>
  );
}

describe('EmbedSettingsProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads legacy single-template settings with a hostname-derived name', () => {
    localStorage.setItem('tmdb_movie_embed_url', 'https://legacy.example.com/{TMDB_ID}');

    render(
      <EmbedSettingsProvider>
        <SettingsProbe />
      </EmbedSettingsProvider>,
    );

    expect(screen.getByTestId('movie-links')).toHaveTextContent(
      JSON.stringify([{ name: 'legacy.example.com', urlTemplate: 'https://legacy.example.com/{TMDB_ID}' }]),
    );
  });

  it('persists links with hostname-derived names and reset restores the configured defaults', () => {
    render(
      <EmbedSettingsProvider>
        <SettingsProbe />
      </EmbedSettingsProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(JSON.parse(localStorage.getItem('tmdb_movie_embed_links') ?? '[]')).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem('tmdb_movie_embed_links') ?? '[]').map(
      (link: { name: string }) => link.name,
    )).toEqual(['example.com', 'backup.example.com']);
    expect(localStorage.getItem('tmdb_movie_embed_url')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    const defaultMovieUrl = import.meta.env.VITE_MOVIE_EMBED_URL ?? '';
    expect(screen.getByTestId('movie-links')).toHaveTextContent(
      JSON.stringify(defaultMovieUrl
        ? [{
          name: new URL(defaultMovieUrl.replace(/\{(TMDB_ID|IMDB_ID|SEASON|EPISODE)\}/g, '1')).hostname.replace(/^www\./, ''),
          urlTemplate: defaultMovieUrl,
        }]
        : []),
    );
    expect(localStorage.getItem('tmdb_movie_embed_links')).toBeNull();
  });
});
