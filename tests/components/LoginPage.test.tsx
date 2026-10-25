import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/pages/LoginPage';
import { tmdbService } from '@/lib/tmdb';

vi.mock('@/lib/tmdb', () => ({
  tmdbService: {
    validateApiKey: vi.fn(),
    setApiKey: vi.fn(),
  },
}));

function CurrentPath() {
  const location = useLocation();
  return <output aria-label="Current path">{location.pathname}</output>;
}

function renderLoginPage() {
  return render(
    <MemoryRouter
      initialEntries={['/login']}
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
  });

  it('requires an API key before validating', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Please enter your TMDB API key')).toBeInTheDocument();
    expect(tmdbService.validateApiKey).not.toHaveBeenCalled();
  });

  it('stores a valid key and navigates into the app', async () => {
    const user = userEvent.setup();
    vi.mocked(tmdbService.validateApiKey).mockResolvedValue(true);
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('API key'), 'valid-key');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Current path')).toHaveTextContent('/');
    });
    expect(tmdbService.setApiKey).toHaveBeenCalledWith('valid-key');
    expect(window.localStorage.getItem('tmdb_api_key')).toBe('valid-key');
  });

  it('shows an error and does not store an invalid key', async () => {
    const user = userEvent.setup();
    vi.mocked(tmdbService.validateApiKey).mockResolvedValue(false);
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('API key'), 'invalid-key');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Invalid API key. Please check and try again.'))
      .toBeInTheDocument();
    expect(tmdbService.setApiKey).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('tmdb_api_key')).toBeNull();
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/login');
  });
});
