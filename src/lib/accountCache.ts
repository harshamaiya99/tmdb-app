import { clearRequestCache } from '@/lib/requestCache';
import type { TMDBAccountSection } from '@/lib/tmdb';

type AccountId = number | string | null | undefined;
type MediaType = 'movie' | 'tv';

function accountPrefix(accountId: AccountId): string {
  return `account:${accountId || 'none'}:`;
}

export const accountQueryKeys = {
  mediaList(accountId: AccountId, section: TMDBAccountSection, mediaType: MediaType, page: number, revision: number) {
    return `${accountPrefix(accountId)}${section}:${mediaType}:${page}:${revision}`;
  },
  mediaState(accountId: AccountId, mediaType: MediaType, mediaId: number) {
    return `${accountPrefix(accountId)}state:${mediaType}:${mediaId}`;
  },
  episodeState(accountId: AccountId, tvId: number, seasonNumber: number, episodeNumber: number) {
    return `${accountPrefix(accountId)}episode-state:${tvId}:${seasonNumber}:${episodeNumber}`;
  },
  userLists(accountId: AccountId, page: number, revision: number) {
    return `${accountPrefix(accountId)}user-lists:${page}:${revision}`;
  },
  accountLists(accountId: AccountId, page: number, revision: number) {
    return `${accountPrefix(accountId)}lists:${page}:${revision}`;
  },
  userListMemberships(accountId: AccountId, revision: number) {
    return `${accountPrefix(accountId)}user-list-memberships:${revision}`;
  },
  listPreviews(accountId: AccountId, page: number, revision: number) {
    return `${accountPrefix(accountId)}list-previews:${page}:${revision}`;
  },
  userList(accountId: AccountId, listId: number | null, page: number, revision: number) {
    return `${accountPrefix(accountId)}list:${listId ?? 'none'}:${page}:${revision}`;
  },
  userListItems(accountId: AccountId, listId: number | null, revision: number) {
    return `${accountPrefix(accountId)}list-items:${listId ?? 'none'}:${revision}`;
  },
};

export function invalidateAccountCache(): void {
  clearRequestCache('account:');
}
