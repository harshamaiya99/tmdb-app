import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRequestCache, fetchCached, getCached } from '@/lib/requestCache';

describe('request cache', () => {
  beforeEach(() => {
    clearRequestCache();
  });

  it('caches a resolved result until its TTL expires', async () => {
    vi.useFakeTimers();
    try {
      const loader = vi.fn().mockResolvedValue('cached value');

      await expect(fetchCached('ttl-key', loader, 1_000)).resolves.toBe('cached value');
      expect(getCached<string>('ttl-key')).toBe('cached value');

      vi.advanceTimersByTime(1_001);
      expect(getCached<string>('ttl-key')).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('deduplicates concurrent requests with the same key', async () => {
    let resolveRequest: (value: string) => void = () => {
      throw new Error('Request resolver was not initialized');
    };
    const loader = vi.fn(
      () => new Promise<string>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const firstRequest = fetchCached('shared-key', loader, 1_000);
    const secondRequest = fetchCached('shared-key', loader, 1_000);
    resolveRequest('shared value');

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      'shared value',
      'shared value',
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
