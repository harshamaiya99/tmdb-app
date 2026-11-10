import { beforeEach, describe, expect, it } from 'vitest';
import { accountQueryKeys, invalidateAccountCache } from '@/lib/accountCache';
import { clearRequestCache, fetchCached, getCached } from '@/lib/requestCache';

describe('account query cache', () => {
  beforeEach(() => {
    clearRequestCache();
  });

  it('builds consistent keys for account query types', () => {
    expect(accountQueryKeys.mediaList(42, 'watchlist', 'movie', 2, 1))
      .toBe('account:42:watchlist:movie:2:1');
    expect(accountQueryKeys.mediaState(42, 'tv', 7))
      .toBe('account:42:state:tv:7');
    expect(accountQueryKeys.episodeState(42, 7, 2, 3))
      .toBe('account:42:episode-state:7:2:3');
    expect(accountQueryKeys.userLists('object-id', 3, 1))
      .toBe('account:object-id:user-lists:3:1');
    expect(accountQueryKeys.accountLists('object-id', 3, 1))
      .toBe('account:object-id:lists:3:1');
    expect(accountQueryKeys.userListMemberships('object-id', 1))
      .toBe('account:object-id:user-list-memberships:1');
    expect(accountQueryKeys.listPreviews('object-id', 3, 1))
      .toBe('account:object-id:list-previews:3:1');
    expect(accountQueryKeys.userList('object-id', 9, 2, 1))
      .toBe('account:object-id:list:9:2:1');
    expect(accountQueryKeys.userListItems('object-id', 9, 1))
      .toBe('account:object-id:list-items:9:1');
    expect(accountQueryKeys.mediaState(undefined, 'movie', 5))
      .toBe('account:none:state:movie:5');
  });

  it('invalidates account entries without clearing unrelated cached data', async () => {
    await fetchCached('account:42:watchlist:movie:1:0', async () => 'account data', 1_000);
    await fetchCached('movie:details:7', async () => 'public data', 1_000);

    invalidateAccountCache();

    expect(getCached('account:42:watchlist:movie:1:0')).toBeUndefined();
    expect(getCached('movie:details:7')).toBe('public data');
  });
});
