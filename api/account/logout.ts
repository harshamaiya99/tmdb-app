import {
  callTMDB,
  clearAuthCookies,
  deleteSession,
  requireSameOrigin,
  requireSession,
  respondWithError,
  type VercelRequest,
  type VercelResponse,
} from '../_lib/account.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    requireSameOrigin(request);
    const session = await requireSession(request);
    const revocations: Promise<unknown>[] = [];
    if (session.tmdbSessionId) {
      revocations.push(callTMDB('/authentication/session', {
        method: 'DELETE',
        body: { session_id: session.tmdbSessionId },
      }));
    }
    if (session.v4AccessToken) {
      revocations.push(callTMDB('/auth/access_token', {
        version: '4',
        method: 'DELETE',
        v4Token: session.v4AccessToken,
        body: { access_token: session.v4AccessToken },
      }));
    }
    const results = await Promise.allSettled(revocations);
    await deleteSession(session.sessionHash);
    clearAuthCookies(response);

    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length > 0) {
      response.status(502).json({
        error: 'Your app session was cleared, but TMDB could not revoke every account token.',
      });
      return;
    }
    response.status(200).json({ success: true });
  } catch (error) {
    respondWithError(response, error);
  }
}
