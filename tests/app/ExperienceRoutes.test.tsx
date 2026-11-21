import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';

const experiences = [
  { id: 'cinema', name: 'Studio', brand: 'Studio home' },
  { id: 'expressive', name: 'Midnight Matinee', brand: 'Midnight Matinee home' },
  { id: 'screenroom', name: 'Screenroom', brand: 'Screenroom home' },
] as const;

describe('experience route smoke tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('__TMDB_DEV_API_KEY__', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isConnected: false,
        account: null,
        isListAccountConnected: false,
        listAccountId: '',
        canConnectLists: false,
      }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it.each(experiences)('renders the TMDB callback within the $name shell', async ({ id, brand }) => {
    localStorage.setItem('ui_experience', id);
    window.history.replaceState({}, '', '/#/account/callback?error=denied');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'TMDB access was not approved' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('link', { name: brand }).length).toBeGreaterThan(0));
    expect(screen.getAllByRole('link', { name: 'WATCHTOWER' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Continue to account' })).toHaveAttribute('href', '#/account/watchlist');
  });

  it.each(experiences)('renders account connection state in the $name shell', async ({ id, brand }) => {
    localStorage.setItem('ui_experience', id);
    window.history.replaceState({}, '', '/#/account/watchlist');

    render(<App />);

    expect(await screen.findByRole(
      'heading',
      { name: 'Connect your TMDB account' },
      { timeout: 5000 },
    )).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('link', { name: brand }).length).toBeGreaterThan(0));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/account/session',
      expect.objectContaining({ credentials: 'same-origin' }),
    ));
  });

  it.each(experiences)('renders the About route in the $name shell', async ({ id, brand }) => {
    localStorage.setItem('ui_experience', id);
    window.history.replaceState({}, '', '/#/about');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'About' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('link', { name: brand }).length).toBeGreaterThan(0));
    expect(screen.getByRole('heading', { name: 'TMDB attribution' })).toBeInTheDocument();
  });
});
