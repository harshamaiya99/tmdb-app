import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountCallbackPage } from '@/pages/AccountCallbackPage';
import { COMBINED_AUTH_STORAGE_KEY } from '@/contexts/TMDBAccountContext';

const authorizationMocks = vi.hoisted(() => ({
  completeAuthorization: vi.fn(),
  completeListsAuthorization: vi.fn(),
  connectListsAccount: vi.fn(),
  canConnectLists: false,
  isListAccountConnected: false,
}));

vi.mock('@/contexts/TMDBAccountContext', () => ({
  COMBINED_AUTH_STORAGE_KEY: 'tmdb_combined_auth_pending',
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
    authorizationMocks.connectListsAccount.mockReset().mockResolvedValue(undefined);
    authorizationMocks.canConnectLists = false;
    authorizationMocks.isListAccountConnected = false;
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
    expect(screen.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.'))
      .toBeInTheDocument();
    expect(authorizationMocks.completeListsAuthorization).not.toHaveBeenCalled();
  });

  it('still requires explicit approval for the v3 account flow', () => {
    renderCallback('/account/callback?request_token=v3-request-token');

    expect(screen.getByText('TMDB account authorization was not approved.')).toBeInTheDocument();
    expect(authorizationMocks.completeAuthorization).not.toHaveBeenCalled();
  });

  it('starts v4 list authorization after the v3 step of a combined connection', async () => {
    sessionStorage.setItem('tmdb_account_request_token', 'v3-request-token');
    sessionStorage.setItem(COMBINED_AUTH_STORAGE_KEY, 'true');
    authorizationMocks.canConnectLists = true;
    renderCallback('/account/callback?request_token=v3-request-token&approved=true');

    await waitFor(() => {
      expect(authorizationMocks.completeAuthorization).toHaveBeenCalledWith('v3-request-token');
      expect(authorizationMocks.connectListsAccount).toHaveBeenCalledOnce();
    });
    expect(sessionStorage.getItem(COMBINED_AUTH_STORAGE_KEY)).toBeNull();
  });
});
