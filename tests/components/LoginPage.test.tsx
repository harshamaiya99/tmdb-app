import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/pages/LoginPage';

const accountMocks = {
  connectAccount: vi.fn(),
};

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
    accountMocks.connectAccount.mockReset().mockResolvedValue(undefined);
  });

  it('allows browsing without asking for credentials', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Continue browsing' }));

    expect(screen.getByLabelText('Current path')).toHaveTextContent('/');
    expect(screen.getByRole('button', { name: 'Connect TMDB account' })).toBeEnabled();
  });

  it('starts the server-side TMDB connection flow', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Connect TMDB account' }));

    expect(accountMocks.connectAccount).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/login');
  });

  it('returns to the requested app path when continuing to browse', async () => {
    const user = userEvent.setup();
    renderLoginPage({ pathname: '/login', state: { from: '/account/watchlist' } });

    await user.click(screen.getByRole('button', { name: 'Continue browsing' }));

    expect(screen.getByLabelText('Current path')).toHaveTextContent('/account/watchlist');
  });
});
