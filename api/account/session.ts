import {
  getSession,
  respondWithError,
  type VercelRequest,
  type VercelResponse,
} from '../_lib/account.js';

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
    const session = await getSession(request);
    response.status(200).json({
      isConnected: Boolean(session?.tmdbSessionId),
      account: session?.tmdbSessionId && session.accountId
        ? {
            id: session.accountId,
            name: session.accountName,
            username: session.username,
            ...(session.avatarPath
              ? { avatar: { tmdb: { avatar_path: session.avatarPath } } }
              : {}),
          }
        : null,
      isListAccountConnected: Boolean(session?.v4AccessToken && session.v4AccountId),
      listAccountId: session?.v4AccountId ?? '',
      canConnectLists: Boolean(process.env.TMDB_V4_ACCESS_TOKEN),
    });
  } catch (error) {
    respondWithError(response, error);
  }
}
