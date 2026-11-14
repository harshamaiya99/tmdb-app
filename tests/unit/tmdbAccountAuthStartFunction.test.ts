import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '../../api/_lib/account.js';

const mocks = vi.hoisted(() => ({
  appCallbackUrl: vi.fn(),
  callTMDB: vi.fn(),
  createOAuthState: vi.fn(),
  getSession: vi.fn(),
  getSessionToken: vi.fn(),
  newOpaqueToken: vi.fn(),
  redirect: vi.fn(),
  setAuthCookies: vi.fn(),
}));

vi.mock('../../api/_lib/account.js', () => ({
  AccountHttpError: class AccountHttpError extends Error {
    constructor(public readonly status: number, message: string) {
      super(message);
    }
  },
  appCallbackUrl: mocks.appCallbackUrl,
  callTMDB: mocks.callTMDB,
  createOAuthState: mocks.createOAuthState,
  createSession: vi.fn(),
  getSession: mocks.getSession,
  getSessionToken: mocks.getSessionToken,
  newOpaqueToken: mocks.newOpaqueToken,
  redirect: mocks.redirect,
  respondWithError: (response: VercelResponse, error: unknown) => {
    response.status(502).json({ error: error instanceof Error ? error.message : 'failed' });
  },
  setAuthCookies: mocks.setAuthCookies,
  singleQueryValue: (query: VercelRequest['query'], key: string) => query?.[key],
}));

import handler from '../../api/account/auth/start.js';

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

describe('TMDB account authorization start function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionToken.mockReturnValue('session-cookie');
    mocks.getSession.mockResolvedValue({
      sessionHash: 'session-hash',
      tmdbSessionId: 'v3-session',
    });
    mocks.newOpaqueToken.mockReturnValue('state-value');
    mocks.appCallbackUrl.mockImplementation((params: Record<string, string>) => {
      const callback = new URL('https://app.test/api/account/auth/callback');
      Object.entries(params).forEach(([key, value]) => callback.searchParams.set(key, value));
      return callback.toString();
    });
    mocks.callTMDB.mockResolvedValue({ request_token: 'v4-request-token' });
    mocks.redirect.mockImplementation((response: VercelResponse, location: string) => {
      response.setHeader('Location', location);
      response.status(302).json({});
    });
    process.env.TMDB_V4_ACCESS_TOKEN = 'app-token';
  });

  it('marks the v4 callback approved and keeps the request token in a secure cookie', async () => {
    const { response, result } = createResponse();
    const request: VercelRequest = {
      method: 'GET',
      query: { flow: 'v4' },
      headers: { cookie: 'session=session-cookie', host: 'app.test' },
    };

    await handler(request, response);

    const requestOptions = mocks.callTMDB.mock.calls[0]?.[1] as {
      body: { redirect_to: string };
    };
    const callback = new URL(requestOptions.body.redirect_to);
    expect(callback.searchParams.get('flow')).toBe('v4');
    expect(callback.searchParams.get('state')).toBe('state-value');
    expect(callback.searchParams.get('approved')).toBe('true');
    expect(mocks.setAuthCookies).toHaveBeenCalledWith(
      response,
      'session-cookie',
      'state-value',
      'v4-request-token',
    );
    expect(result.statusCode).toBe(302);
    expect(new URL(String(result.headers.Location)).searchParams.get('request_token'))
      .toBe('v4-request-token');
  });
});
