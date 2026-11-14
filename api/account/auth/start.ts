import {
  AccountHttpError,
  appCallbackUrl,
  callTMDB,
  createOAuthState,
  createSession,
  getSession,
  getSessionToken,
  newOpaqueToken,
  redirect,
  respondWithError,
  setAuthCookies,
  singleQueryValue,
  type VercelRequest,
  type VercelResponse,
} from '../../_lib/account.js';

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

  try {
    const requestedFlow = singleQueryValue(request.query, 'flow');
    const flow = requestedFlow === undefined ? 'v3' : requestedFlow;
    if (flow !== 'v3' && flow !== 'v4') {
      throw new AccountHttpError(400, 'Invalid authorization flow');
    }

    let sessionToken = getSessionToken(request);
    let sessionHash: string;
    if (flow === 'v3') {
      if (sessionToken) {
        const existingSession = await getSession(request);
        if (existingSession?.tmdbSessionId || existingSession?.v4AccessToken) {
          throw new AccountHttpError(409, 'Disconnect the connected TMDB account before switching accounts');
        }
      }
      sessionToken = newOpaqueToken();
      sessionHash = await createSession(sessionToken);
    } else {
      if (!sessionToken) throw new AccountHttpError(401, 'Connect your TMDB account first');
      const session = await getSession(request);
      if (!session?.tmdbSessionId) {
        throw new AccountHttpError(401, 'Connect your TMDB account first');
      }
      sessionHash = session.sessionHash;
    }

    const state = newOpaqueToken();
    const callbackUrl = appCallbackUrl({
      flow,
      state,
      ...(flow === 'v4' ? { approved: 'true' } : {}),
    }, request);
    let authorizationUrl: URL;
    let v4RequestToken: string | undefined;

    if (flow === 'v3') {
      const token = await callTMDB<{ request_token: string }>('/authentication/token/new');
      authorizationUrl = new URL(
        `https://www.themoviedb.org/authenticate/${encodeURIComponent(token.request_token)}`,
      );
      authorizationUrl.searchParams.set('redirect_to', callbackUrl);
    } else {
      const appToken = process.env.TMDB_V4_ACCESS_TOKEN;
      if (!appToken) throw new AccountHttpError(503, 'Custom-list authorization is not configured');
      const token = await callTMDB<{ request_token: string }>('/auth/request_token', {
        version: '4',
        method: 'POST',
        v4Token: appToken,
        body: { redirect_to: callbackUrl },
      });
      v4RequestToken = token.request_token;
      authorizationUrl = new URL('https://www.themoviedb.org/auth/access');
      authorizationUrl.searchParams.set('request_token', token.request_token);
    }

    await createOAuthState(state, sessionHash, flow);
    setAuthCookies(response, sessionToken, state, v4RequestToken);
    redirect(response, authorizationUrl.toString());
  } catch (error) {
    respondWithError(response, error);
  }
}
