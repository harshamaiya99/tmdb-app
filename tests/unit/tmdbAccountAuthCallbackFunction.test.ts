import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '../../api/_lib/account.js';

const mocks = vi.hoisted(() => ({
  callTMDB: vi.fn(),
  clearOAuthStateCookie: vi.fn(),
  consumeOAuthState: vi.fn(),
  getCookie: vi.fn(),
  getSessionToken: vi.fn(),
  getV4RequestToken: vi.fn(),
  refreshSessionAndClearStateCookies: vi.fn(),
  redirect: vi.fn(),
  safeEqual: vi.fn(),
  saveV4Account: vi.fn(),
  tokenHash: vi.fn(),
}));

vi.mock('../../api/_lib/account.js', () => ({
  AccountHttpError: class AccountHttpError extends Error {
    constructor(public readonly status: number, message: string) {
      super(message);
    }
  },
  callTMDB: mocks.callTMDB,
  clearOAuthStateCookie: mocks.clearOAuthStateCookie,
  consumeOAuthState: mocks.consumeOAuthState,
  getCookie: mocks.getCookie,
  getSessionToken: mocks.getSessionToken,
  getV4RequestToken: mocks.getV4RequestToken,
  oauthStateCookieName: () => '__Host-tmdb_oauth_state',
  refreshSessionAndClearStateCookies: mocks.refreshSessionAndClearStateCookies,
  redirect: mocks.redirect,
  safeEqual: mocks.safeEqual,
  saveV4Account: mocks.saveV4Account,
  tokenHash: mocks.tokenHash,
}));

import handler from '../../api/account/auth/callback.js';

function createResponse() {
  const result: {
    statusCode: number;
    headers: Record<string, string | string[]>;
    body: unknown;
  } = { statusCode: 200, headers: {}, body: undefined };
  const response = {
    status(code: number) {
      result.statusCode = code;
      return response;
    },
    setHeader(name: string, value: string | string[]) {
      result.headers[name] = value;
      return response;
    },
    json(body: unknown) {
      result.body = body;
      return response;
    },
  };
  return { response: response as VercelResponse, result };
}

describe('TMDB account authorization callback function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeOAuthState.mockResolvedValue({ session_hash: 'session-hash', flow: 'v4' });
    mocks.getCookie.mockReturnValue('state-value');
    mocks.getSessionToken.mockReturnValue('session-cookie');
    mocks.getV4RequestToken.mockReturnValue('v4-request-token');
    mocks.safeEqual.mockImplementation((left: string, right: string) => left === right);
    mocks.tokenHash.mockReturnValue('session-hash');
    mocks.redirect.mockImplementation((response: VercelResponse, location: string) => {
      response.setHeader('Location', location);
      response.status(302).json({});
    });
    mocks.callTMDB.mockResolvedValue({
      access_token: 'user-access-token',
      account_id: 'tmdb-account',
    });
    process.env.TMDB_V4_ACCESS_TOKEN = 'app-token';
  });

  it('exchanges the v4 request token from its secure cookie when TMDB redirects without it', async () => {
    const { response, result } = createResponse();
    const request: VercelRequest = {
      method: 'GET',
      query: { flow: 'v4', state: 'state-value', approved: 'true' },
      headers: { cookie: '__Host-tmdb_oauth_state=state-value' },
    };

    await handler(request, response);

    expect(result.statusCode).toBe(302);
    expect(mocks.callTMDB).toHaveBeenCalledWith('/auth/access_token', {
      version: '4',
      method: 'POST',
      v4Token: 'app-token',
      body: { request_token: 'v4-request-token' },
    });
    expect(mocks.saveV4Account).toHaveBeenCalledWith(
      'session-hash',
      'user-access-token',
      'tmdb-account',
    );
    expect(mocks.refreshSessionAndClearStateCookies).toHaveBeenCalledWith(
      response,
      'session-cookie',
    );
    expect(mocks.redirect).toHaveBeenCalledWith(response, '/#/account/lists');
  });

  it('rejects a v4 callback after its short-lived request-token cookie has expired', async () => {
    mocks.getV4RequestToken.mockReturnValue(undefined);
    const { response, result } = createResponse();

    await handler({
      method: 'GET',
      query: { flow: 'v4', state: 'state-value', approved: 'true' },
      headers: { cookie: '__Host-tmdb_oauth_state=state-value' },
    }, response);

    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({ error: 'TMDB authorization token is missing or expired' });
    expect(mocks.callTMDB).not.toHaveBeenCalled();
    expect(mocks.clearOAuthStateCookie).toHaveBeenCalledWith(response);
  });
});
