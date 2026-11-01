import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountCallbackPage } from '@/pages/AccountCallbackPage';

const authorizationMocks = vi.hoisted(() => ({
  completeAuthorization: vi.fn(),
  completeListsAuthorization: vi.fn(),
}));

vi.mock('@/contexts/TMDBAccountContext', () => ({
  useTMDBAccount: () => authorizationMocks,
}));

function renderCallback(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/account/callback" element={<AccountCallbackPage />} />
        <Route path="/account/lists" element={<p>Connected lists</p>} />
        <Route path="/account/watchlist" element={<p>Connected account</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AccountCallbackPage', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    sessionStorage.clear();
    authorizationMocks.completeAuthorization.mockReset().mockResolvedValue(undefined);
    authorizationMocks.completeListsAuthorization.mockReset().mockResolvedValue(undefined);
  });

  it('exchanges a v4 request token when TMDB omits the approved parameter', async () => {
    renderCallback('/account/callback?flow=lists&request_token=v4-request-token');

    await waitFor(() => {
      expect(authorizationMocks.completeListsAuthorization).toHaveBeenCalledWith('v4-request-token');
    });
    expect(await screen.findByText('Connected lists')).toBeInTheDocument();
  });

  it('reads v4 authorization parameters from the URL query before the hash route', async () => {
    window.history.replaceState(null, '', '/?request_token=v4-request-token&approved=true');
    renderCallback('/account/callback?flow=lists');

    await waitFor(() => {
      expect(authorizationMocks.completeListsAuthorization).toHaveBeenCalledWith('v4-request-token');
    });
    expect(await screen.findByText('Connected lists')).toBeInTheDocument();
  });

  it('uses the saved v4 request token when TMDB omits it from the callback URL', async () => {
    sessionStorage.setItem('tmdb_list_request_token', 'saved-v4-request-token');
    renderCallback('/account/callback?flow=lists');

    await waitFor(() => {
      expect(authorizationMocks.completeListsAuthorization).toHaveBeenCalledWith('saved-v4-request-token');
    });
    expect(await screen.findByText('Connected lists')).toBeInTheDocument();
  });

  it('does not exchange a request token when TMDB explicitly denies authorization', () => {
    renderCallback('/account/callback?flow=lists&request_token=v4-request-token&approved=false');

    expect(screen.getByText('TMDB account authorization was not approved.')).toBeInTheDocument();
    expect(authorizationMocks.completeListsAuthorization).not.toHaveBeenCalled();
  });

  it('still requires explicit approval for the v3 account flow', () => {
    renderCallback('/account/callback?request_token=v3-request-token');

    expect(screen.getByText('TMDB account authorization was not approved.')).toBeInTheDocument();
    expect(authorizationMocks.completeAuthorization).not.toHaveBeenCalled();
  });
});
