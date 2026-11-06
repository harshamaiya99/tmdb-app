import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmbedSettingsProvider } from '@/contexts/EmbedSettingsContext';
import { TitleProvider } from '@/contexts/TitleContext';
import { SettingsPage } from '@/pages/SettingsPage';
import { ThemeProvider } from '@/hooks/useTheme';
import { tmdbService } from '@/lib/tmdb';
import { Toaster } from '@/components/ui/toaster';

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(tmdbService, 'getCountries').mockResolvedValue([
      { iso_3166_1: 'IN', english_name: 'India', native_name: 'India' },
      { iso_3166_1: 'US', english_name: 'United States', native_name: 'United States' },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves regional and embed preferences and applies theme changes globally', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TitleProvider>
          <MemoryRouter>
            <EmbedSettingsProvider>
              <SettingsPage />
              <Toaster />
            </EmbedSettingsProvider>
          </MemoryRouter>
        </TitleProvider>
      </ThemeProvider>,
    );

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Content country' }), 'IN');
    const movieLinkInput = screen.getByRole('textbox', { name: 'Movie link URL template 1' });
    await user.clear(movieLinkInput);
    await user.type(movieLinkInput, 'https://example.com/movie/123');
    const themeSwitch = screen.getByRole('switch', { name: 'Dark mode' });
    await user.click(themeSwitch);

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(themeSwitch).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('button', { name: 'Save content settings' }));

    expect(localStorage.getItem('tmdb_content_region')).toBe('IN');
    expect(JSON.parse(localStorage.getItem('tmdb_movie_embed_links') ?? '[]')).toEqual([
      { name: 'example.com', urlTemplate: 'https://example.com/movie/123' },
    ]);
    expect(await screen.findByText('Settings saved')).toBeInTheDocument();
  });
});
