import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmbedSettingsProvider } from '@/contexts/EmbedSettingsContext';
import { ExperienceProvider } from '@/contexts/ExperienceContext';
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

  it('saves the selected country without changing embed links', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TitleProvider>
          <MemoryRouter>
            <ExperienceProvider>
              <EmbedSettingsProvider>
                <SettingsPage />
                <Toaster />
              </EmbedSettingsProvider>
            </ExperienceProvider>
          </MemoryRouter>
        </TitleProvider>
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Content country' }));
    await user.click(await screen.findByRole('combobox', { name: 'Content country' }));
    await user.click(await screen.findByRole('option', { name: 'India' }));
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    expect(localStorage.getItem('tmdb_content_region')).toBe('IN');
    expect(localStorage.getItem('tmdb_movie_embed_links')).toBeNull();
    expect(await screen.findByText('Country saved')).toBeInTheDocument();
  });

  it('saves regional and embed preferences and applies theme changes globally', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TitleProvider>
          <MemoryRouter>
            <ExperienceProvider>
              <EmbedSettingsProvider>
                <SettingsPage />
                <Toaster />
              </EmbedSettingsProvider>
            </ExperienceProvider>
          </MemoryRouter>
        </TitleProvider>
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Content country' }));
    await user.click(await screen.findByRole('combobox', { name: 'Content country' }));
    await user.click(await screen.findByRole('option', { name: 'India' }));
    await user.click(screen.getByRole('button', { name: 'Embed links' }));
    const movieLinkInput = screen.getByRole('textbox', { name: 'Movie link URL template 1' });
    await user.clear(movieLinkInput);
    await user.type(movieLinkInput, 'https://example.com/movie/123');

    await user.click(screen.getByRole('button', { name: 'Save content settings' }));

    expect(localStorage.getItem('tmdb_content_region')).toBe('IN');
    expect(JSON.parse(localStorage.getItem('tmdb_movie_embed_links') ?? '[]')).toEqual([
      { name: 'example.com', urlTemplate: 'https://example.com/movie/123' },
    ]);
    expect(await screen.findByText('Settings saved')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Appearance' }));
    const themeSwitch = screen.getByRole('switch', { name: 'Dark mode' });
    await user.click(themeSwitch);

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(themeSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('switches web experience immediately without changing the saved color mode', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TitleProvider>
          <MemoryRouter>
            <ExperienceProvider>
              <EmbedSettingsProvider>
                <SettingsPage />
                <Toaster />
              </EmbedSettingsProvider>
            </ExperienceProvider>
          </MemoryRouter>
        </TitleProvider>
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Appearance' }));
    expect(screen.getByRole('radio', { name: /studio/i })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /midnight matinee/i }));
    expect(screen.getByRole('radio', { name: /midnight matinee/i })).toBeChecked();
    await user.click(screen.getByRole('switch', { name: 'Dark mode' }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-experience', 'expressive');
      expect(document.documentElement).toHaveClass('dark');
    });
    expect(localStorage.getItem('ui_experience')).toBe('expressive');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByRole('heading', { name: 'Web experience' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Web experience' })).not.toBeInTheDocument();
  });

  it('offers Screenroom as an independently selectable experience', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TitleProvider>
          <MemoryRouter>
            <ExperienceProvider>
              <EmbedSettingsProvider>
                <SettingsPage />
              </EmbedSettingsProvider>
            </ExperienceProvider>
          </MemoryRouter>
        </TitleProvider>
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Appearance' }));
    await user.click(screen.getByRole('radio', { name: /screenroom/i }));

    expect(screen.getByRole('radio', { name: /screenroom/i })).toBeChecked();
    expect(localStorage.getItem('ui_experience')).toBe('screenroom');
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-experience', 'screenroom'));
  });

  it('shows only the chosen settings section and marks its navigation item current', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TitleProvider>
          <MemoryRouter>
            <ExperienceProvider>
              <EmbedSettingsProvider>
                <SettingsPage />
              </EmbedSettingsProvider>
            </ExperienceProvider>
          </MemoryRouter>
        </TitleProvider>
      </ThemeProvider>,
    );

    expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByText('Manage your regional content, appearance, and playback links.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Appearance' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Embed links' })).not.toBeInTheDocument();

    expect(screen.getAllByRole('button', { name: /^(Appearance|Embed links|Content country)$/ })
      .map((button) => button.getAttribute('aria-label')))
      .toEqual(['Appearance', 'Embed links', 'Content country']);

    await user.click(screen.getByRole('button', { name: 'Embed links' }));

    expect(screen.getByRole('button', { name: 'Embed links' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Embed links' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Content country' })).not.toBeInTheDocument();
  });

  it('only adds another embed link after the current draft has a value', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TitleProvider>
          <MemoryRouter>
            <ExperienceProvider>
              <EmbedSettingsProvider>
                <SettingsPage />
              </EmbedSettingsProvider>
            </ExperienceProvider>
          </MemoryRouter>
        </TitleProvider>
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Embed links' }));
    const firstMovieLink = screen.getByRole('textbox', { name: 'Movie link URL template 1' });
    const addFirstMovieLink = screen.getByRole('button', { name: 'Add movie link after link 1' });
    expect(addFirstMovieLink).toBeDisabled();
    await user.type(firstMovieLink, 'https://example.com/movie/{TMDB_ID}');
    expect(addFirstMovieLink).toBeEnabled();
    await user.click(addFirstMovieLink);

    const addSecondMovieLink = screen.getByRole('button', { name: 'Add movie link after link 2' });
    expect(addSecondMovieLink).toBeDisabled();
    await user.click(addSecondMovieLink);

    expect(screen.getByRole('textbox', { name: 'Movie link URL template 1' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Movie link URL template 2' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Movie link URL template 3' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add movie link' })).not.toBeInTheDocument();
  });
});
