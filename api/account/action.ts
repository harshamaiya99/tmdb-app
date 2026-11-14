import {
  AccountHttpError,
  callTMDB,
  isPositiveInteger,
  isValidPage,
  parseBody,
  requireSameOrigin,
  requireSession,
  respondWithError,
  type VercelRequest,
  type VercelResponse,
} from '../_lib/account';

type MediaType = 'movie' | 'tv';

function requiredString(
  body: Record<string, unknown>,
  key: string,
  maxLength: number,
  allowEmpty = false,
): string {
  const value = body[key];
  if (
    typeof value !== 'string'
    || value.length > maxLength
    || (!allowEmpty && !value.trim())
  ) {
    throw new AccountHttpError(400, `Invalid ${key}`);
  }
  return value;
}

function requiredMediaType(body: Record<string, unknown>): MediaType {
  if (body.mediaType !== 'movie' && body.mediaType !== 'tv') {
    throw new AccountHttpError(400, 'Invalid media type');
  }
  return body.mediaType;
}

function requiredId(body: Record<string, unknown>, key: string): number {
  const value = body[key];
  if (!isPositiveInteger(value)) throw new AccountHttpError(400, `Invalid ${key}`);
  return value;
}

function requiredPage(body: Record<string, unknown>): number {
  const value = body.page ?? 1;
  if (!isValidPage(value)) throw new AccountHttpError(400, 'Invalid page');
  return value;
}

function requiredRating(body: Record<string, unknown>): number {
  const value = body.rating;
  if (
    typeof value !== 'number'
    || !Number.isFinite(value)
    || value < 0.5
    || value > 10
    || value * 2 % 1 !== 0
  ) {
    throw new AccountHttpError(400, 'Rating must be from 0.5 to 10 in half-point increments');
  }
  return value;
}

function requireV3Session(session: { tmdbSessionId: string | null; accountId: number | null }): {
  tmdbSessionId: string;
  accountId: number;
} {
  if (!session.tmdbSessionId || !session.accountId) {
    throw new AccountHttpError(401, 'Connect your TMDB account first');
  }
  return { tmdbSessionId: session.tmdbSessionId, accountId: session.accountId };
}

function requireV4Session(session: { v4AccessToken: string | null; v4AccountId: string | null }): {
  accessToken: string;
  accountId: string;
} {
  if (!session.v4AccessToken || !session.v4AccountId) {
    throw new AccountHttpError(401, 'Connect your TMDB custom lists first');
  }
  return { accessToken: session.v4AccessToken, accountId: session.v4AccountId };
}

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
    const body = parseBody(request.body);
    const operation = body.operation;
    if (typeof operation !== 'string') throw new AccountHttpError(400, 'Invalid account operation');
    const session = await requireSession(request);
    let result: unknown;

    switch (operation) {
      case 'get-account-list': {
        const { tmdbSessionId, accountId } = requireV3Session(session);
        const section = body.section;
        if (section !== 'watchlist' && section !== 'favorites' && section !== 'ratings') {
          throw new AccountHttpError(400, 'Invalid account list');
        }
        const mediaType = requiredMediaType(body);
        const mediaPath = mediaType === 'movie' ? 'movies' : 'tv';
        const sectionPath = section === 'watchlist'
          ? `watchlist/${mediaPath}`
          : section === 'favorites'
            ? `favorite/${mediaPath}`
            : `rated/${mediaPath}`;
        const page = requiredPage(body);
        result = await callTMDB(
          `/account/${accountId}/${sectionPath}?page=${page}&sort_by=created_at.desc`,
          { sessionId: tmdbSessionId },
        );
        break;
      }

      case 'get-account-lists': {
        const { accessToken, accountId } = requireV4Session(session);
        result = await callTMDB(
          `/account/${encodeURIComponent(accountId)}/lists?page=${requiredPage(body)}`,
          { version: '4', v4Token: accessToken },
        );
        break;
      }

      case 'get-user-list': {
        const { accessToken } = requireV4Session(session);
        const listId = requiredId(body, 'listId');
        result = await callTMDB(`/list/${listId}?page=${requiredPage(body)}`, {
          version: '4',
          v4Token: accessToken,
        });
        break;
      }

      case 'create-user-list': {
        const { accessToken } = requireV4Session(session);
        const region = body.region ?? 'US';
        if (typeof region !== 'string' || !/^[A-Z]{2}$/.test(region)) {
          throw new AccountHttpError(400, 'Invalid region');
        }
        if (typeof body.isPublic !== 'boolean') throw new AccountHttpError(400, 'Invalid visibility');
        result = await callTMDB('/list', {
          version: '4',
          method: 'POST',
          v4Token: accessToken,
          body: {
            name: requiredString(body, 'name', 100),
            description: requiredString(body, 'description', 500, true),
            iso_3166_1: region,
            iso_639_1: 'en',
            public: body.isPublic,
          },
        });
        break;
      }

      case 'update-user-list': {
        const { accessToken } = requireV4Session(session);
        const listId = requiredId(body, 'listId');
        if (typeof body.isPublic !== 'boolean') throw new AccountHttpError(400, 'Invalid visibility');
        const language = body.language ?? 'en';
        if (typeof language !== 'string' || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(language)) {
          throw new AccountHttpError(400, 'Invalid language');
        }
        result = await callTMDB(`/list/${listId}`, {
          version: '4',
          method: 'PUT',
          v4Token: accessToken,
          body: {
            name: requiredString(body, 'name', 100),
            description: requiredString(body, 'description', 500, true),
            iso_639_1: language,
            public: body.isPublic,
          },
        });
        break;
      }

      case 'delete-user-list': {
        const { accessToken } = requireV4Session(session);
        result = await callTMDB(`/list/${requiredId(body, 'listId')}`, {
          version: '4',
          method: 'DELETE',
          v4Token: accessToken,
        });
        break;
      }

      case 'add-user-list-item':
      case 'remove-user-list-item': {
        const { accessToken } = requireV4Session(session);
        result = await callTMDB(`/list/${requiredId(body, 'listId')}/items`, {
          version: '4',
          method: operation === 'add-user-list-item' ? 'POST' : 'DELETE',
          v4Token: accessToken,
          body: {
            items: [{
              media_type: requiredMediaType(body),
              media_id: requiredId(body, 'mediaId'),
            }],
          },
        });
        break;
      }

      case 'get-media-account-state': {
        const { tmdbSessionId } = requireV3Session(session);
        const mediaType = requiredMediaType(body);
        result = await callTMDB(`/${mediaType}/${requiredId(body, 'mediaId')}/account_states`, {
          sessionId: tmdbSessionId,
        });
        break;
      }

      case 'set-watchlist':
      case 'set-favorite': {
        const { tmdbSessionId, accountId } = requireV3Session(session);
        const mediaType = requiredMediaType(body);
        const enabledKey = operation === 'set-watchlist' ? 'watchlist' : 'favorite';
        if (typeof body.enabled !== 'boolean') throw new AccountHttpError(400, 'Invalid account action');
        result = await callTMDB(`/account/${accountId}/${enabledKey}`, {
          method: 'POST',
          sessionId: tmdbSessionId,
          body: {
            media_type: mediaType,
            media_id: requiredId(body, 'mediaId'),
            [enabledKey]: body.enabled,
          },
        });
        break;
      }

      case 'rate-media':
      case 'delete-media-rating': {
        const { tmdbSessionId } = requireV3Session(session);
        const mediaType = requiredMediaType(body);
        result = await callTMDB(`/${mediaType}/${requiredId(body, 'mediaId')}/rating`, {
          method: operation === 'rate-media' ? 'POST' : 'DELETE',
          sessionId: tmdbSessionId,
          ...(operation === 'rate-media' ? { body: { value: requiredRating(body) } } : {}),
        });
        break;
      }

      case 'get-episode-account-state':
      case 'rate-episode':
      case 'delete-episode-rating': {
        const { tmdbSessionId } = requireV3Session(session);
        const tvId = requiredId(body, 'tvId');
        const seasonNumber = body.seasonNumber;
        const episodeNumber = body.episodeNumber;
        if (!Number.isSafeInteger(seasonNumber) || Number(seasonNumber) < 0) {
          throw new AccountHttpError(400, 'Invalid season number');
        }
        if (!isPositiveInteger(episodeNumber)) throw new AccountHttpError(400, 'Invalid episode number');
        const episodePath = `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`;
        const isRating = operation !== 'get-episode-account-state';
        result = await callTMDB(
          isRating ? `${episodePath}/rating` : `${episodePath}/account_states`,
          {
            method: operation === 'rate-episode'
              ? 'POST'
              : operation === 'delete-episode-rating' ? 'DELETE' : 'GET',
            sessionId: tmdbSessionId,
            ...(operation === 'rate-episode' ? { body: { value: requiredRating(body) } } : {}),
          },
        );
        break;
      }

      default:
        throw new AccountHttpError(400, 'Unsupported account operation');
    }

    response.status(200).json(result ?? { success: true });
  } catch (error) {
    respondWithError(response, error);
  }
}
