import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/pages/LoginPage';
import { tmdbService } from '@/lib/tmdb';

const accountMocks = {
  configureV4AccessToken: vi.fn(),
};

vi.mock('@/lib/tmdb', () => ({
  tmdbService: {
    validateApiKey: vi.fn(),
    setApiKey: vi.fn(),
    setAccessToken: vi.fn(),
  },
}));

vi.mock('@/contexts/TMDBAccountContext', () => ({
  useTMDBAccount: () => accountMocks,
}));

function CurrentPath() {
  const location = useLocation();
  return <output aria-label="Current path">{location.pathname}</output>;
}

function renderLoginPage(initialEntry: string | { pathname: string; state?: unknown } = '/login') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LoginPage />
      <CurrentPath />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(tmdbService.validateApiKey).mockReset();
    vi.mocked(tmdbService.setApiKey).mockReset();
    accountMocks.configureV4AccessToken.mockReset();
  });

  it('allows browsing without an API key', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Continue browsing without an API key' }));

    expect(screen.getByLabelText('Current path')).toHaveTextContent('/');
    expect(tmdbService.validateApiKey).not.toHaveBeenCalled();
  });

  it('requires a key only when saving account credentials', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Save key and continue' }));

    expect(screen.getByText(/Add a TMDB API key to configure account features/)).toBeInTheDocument();
    expect(tmdbService.validateApiKey).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/login');
  });

  it('stores a valid key and navigates into the app', async () => {
    const user = userEvent.setup();
    vi.mocked(tmdbService.validateApiKey).mockResolvedValue(true);
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('API key'), 'valid-key');
    await user.click(screen.getByRole('button', { name: 'Save key and continue' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Current path')).toHaveTextContent('/');
    });

    expect(tmdbService.setApiKey).toHaveBeenCalledWith('valid-key');
    expect(window.localStorage.getItem('tmdb_api_key')).toBe('valid-key');
    expect(accountMocks.configureV4AccessToken).toHaveBeenCalledWith('');
    expect(window.localStorage.getItem('tmdb_v4_access_token')).toBeNull();
  });

  it('returns to the account page that requested API-key setup', async () => {
    const user = userEvent.setup();
    vi.mocked(tmdbService.validateApiKey).mockResolvedValue(true);
    renderLoginPage({ pathname: '/login', state: { from: '/account/watchlist' } });

    await user.type(screen.getByPlaceholderText('API key'), 'valid-key');
    await user.click(screen.getByRole('button', { name: 'Save key and continue' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Current path')).toHaveTextContent('/account/watchlist');
    });
  });

  it('stores an optional v4 access token for custom lists', async () => {
    const user = userEvent.setup();
    vi.mocked(tmdbService.validateApiKey).mockResolvedValue(true);
    renderLoginPage();

    await user.type(screen.getByLabelText('TMDB API key (optional)'), 'valid-key');
    await user.type(screen.getByLabelText('TMDB v4 access token'), ' v4-token ');
    await user.click(screen.getByRole('button', { name: 'Save key and continue' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Current path')).toHaveTextContent('/');
    });
    expect(accountMocks.configureV4AccessToken).toHaveBeenCalledWith(' v4-token ');
    expect(window.localStorage.getItem('tmdb_v4_access_token')).toBe('v4-token');
  });

  it('shows an error and does not store an invalid key', async () => {
    const user = userEvent.setup();
    vi.mocked(tmdbService.validateApiKey).mockResolvedValue(false);
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('API key'), 'invalid-key');
    await user.click(screen.getByRole('button', { name: 'Save key and continue' }));

    expect(await screen.findByText('Invalid API key. Please check and try again.'))
      .toBeInTheDocument();
    expect(tmdbService.setApiKey).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('tmdb_api_key')).toBeNull();
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/login');
  });
});
