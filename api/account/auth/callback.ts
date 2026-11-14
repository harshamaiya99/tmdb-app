import {
  AccountHttpError,
  callTMDB,
  clearOAuthStateCookie,
  consumeOAuthState,
  getCookie,
  getSessionToken,
  oauthStateCookieName,
  refreshSessionAndClearStateCookies,
  redirect,
  respondWithError,
  safeEqual,
  saveV3Account,
  saveV4Account,
  tokenHash,
  type VercelRequest,
  type VercelResponse,
} from '../../_lib/account';

interface V3Account {
  id: number;
  name?: string;
  username: string;
  avatar?: { tmdb?: { avatar_path?: string | null } | null } | null;
}

function getFrontendRedirect(destination: string): string {
  return `/#/${destination}`;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawState = request.query?.state;
  const rawFlow = request.query?.flow;
  const rawRequestToken = request.query?.request_token;
  const rawApproved = request.query?.approved;
  if (
    typeof rawState !== 'string'
    || (rawFlow !== 'v3' && rawFlow !== 'v4')
    || typeof rawApproved !== 'string'
    || (rawApproved !== 'true' && rawApproved !== 'false')
  ) {
    response.status(400).json({ error: 'Invalid TMDB authorization callback' });
    return;
  }

  const stateCookie = getCookie(request, oauthStateCookieName());
  if (!stateCookie || !safeEqual(rawState, stateCookie)) {
    response.status(403).json({ error: 'TMDB authorization state did not match this browser' });
    return;
  }

  const pending = await consumeOAuthState(rawState);
  const sessionToken = getSessionToken(request);
  if (
    !pending
    || pending.flow !== rawFlow
    || !sessionToken
    || !safeEqual(pending.session_hash, tokenHash(sessionToken))
  ) {
    clearOAuthStateCookie(response);
    response.status(403).json({ error: 'TMDB authorization expired. Please try again.' });
    return;
  }

  if (rawApproved !== 'true' || typeof rawRequestToken !== 'string' || !rawRequestToken) {
    clearOAuthStateCookie(response);
    redirect(response, getFrontendRedirect('account/callback?error=denied'));
    return;
  }

  try {
    if (rawFlow === 'v3') {
      const session = await callTMDB<{ session_id: string }>('/authentication/session/new', {
        method: 'POST',
        body: { request_token: rawRequestToken },
      });
      const account = await callTMDB<V3Account>('/account', { sessionId: session.session_id });
      await saveV3Account(pending.session_hash, session.session_id, account);
      refreshSessionAndClearStateCookies(response, sessionToken);
      redirect(response, getFrontendRedirect('account/watchlist'));
      return;
    }

    const appToken = process.env.TMDB_V4_ACCESS_TOKEN;
    if (!appToken) throw new AccountHttpError(503, 'Custom-list authorization is not configured');
    const authorization = await callTMDB<{
      access_token: string;
      account_id: string;
    }>('/auth/access_token', {
      version: '4',
      method: 'POST',
      v4Token: appToken,
      body: { request_token: rawRequestToken },
    });
    await saveV4Account(pending.session_hash, authorization.access_token, authorization.account_id);
    refreshSessionAndClearStateCookies(response, sessionToken);
    redirect(response, getFrontendRedirect('account/lists'));
  } catch (error) {
    clearOAuthStateCookie(response);
    response.status(error instanceof AccountHttpError ? error.status : 502)
      .json({ error: error instanceof Error ? error.message : 'TMDB account authorization failed' });
  }
}
