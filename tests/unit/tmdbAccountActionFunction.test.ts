import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '../../api/_lib/account';

const mocks = vi.hoisted(() => ({
  callTMDB: vi.fn(),
  requireSameOrigin: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock('../../api/_lib/account', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/_lib/account')>();
  return {
    ...actual,
    callTMDB: mocks.callTMDB,
    requireSameOrigin: mocks.requireSameOrigin,
    requireSession: mocks.requireSession,
  };
});

import handler from '../../api/account/action';

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

function request(cookie: string, body: Record<string, unknown>): VercelRequest {
  return {
    method: 'POST',
    headers: {
      cookie,
      origin: 'https://app.test',
      host: 'app.test',
    },
    body,
  };
}

describe('TMDB account action function', () => {
  beforeEach(() => {
    mocks.callTMDB.mockReset().mockResolvedValue({});
    mocks.requireSameOrigin.mockReset();
    mocks.requireSession.mockReset().mockImplementation(async (request: VercelRequest) => {
      const cookie = request.headers?.cookie;
      if (cookie === 'session=alice') {
        return {
          tmdbSessionId: 'alice-tmdb-session',
          accountId: 101,
          v4AccessToken: 'alice-v4-token',
          v4AccountId: 'alice-v4-account',
        };
      }
      return {
        tmdbSessionId: 'bob-tmdb-session',
        accountId: 202,
        v4AccessToken: 'bob-v4-token',
        v4AccountId: 'bob-v4-account',
      };
    });
  });

  it('isolates v3 account actions by the opaque browser session, ignoring client account IDs', async () => {
    const alice = createResponse();
    const bob = createResponse();

    await handler(request('session=alice', {
      operation: 'get-account-list',
      section: 'watchlist',
      mediaType: 'movie',
      page: 1,
      accountId: 999,
    }), alice.response);
    await handler(request('session=bob', {
      operation: 'get-account-list',
      section: 'watchlist',
      mediaType: 'movie',
      page: 1,
      accountId: 101,
    }), bob.response);

    expect(alice.result.statusCode).toBe(200);
    expect(bob.result.statusCode).toBe(200);
    expect(mocks.callTMDB.mock.calls).toEqual([
      ['/account/101/watchlist/movies?page=1&sort_by=created_at.desc', { sessionId: 'alice-tmdb-session' }],
      ['/account/202/watchlist/movies?page=1&sort_by=created_at.desc', { sessionId: 'bob-tmdb-session' }],
    ]);
  });

  it('uses the v4 token and account identity belonging to the current session', async () => {
    const response = createResponse();

    await handler(request('session=bob', {
      operation: 'get-account-lists',
      page: 3,
      accountId: 'alice-v4-account',
    }), response.response);

    expect(response.result.statusCode).toBe(200);
    expect(mocks.callTMDB).toHaveBeenCalledWith(
      '/account/bob-v4-account/lists?page=3',
      { version: '4', v4Token: 'bob-v4-token' },
    );
  });

  it('rejects unsupported account operations without calling TMDB', async () => {
    const response = createResponse();

    await handler(request('session=alice', { operation: 'arbitrary-route' }), response.response);

    expect(response.result.statusCode).toBe(400);
    expect(response.result.body).toEqual({ error: 'Unsupported account operation' });
    expect(mocks.callTMDB).not.toHaveBeenCalled();
  });
});
