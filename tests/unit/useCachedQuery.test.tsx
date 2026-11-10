import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { clearRequestCache } from '@/lib/requestCache';

describe('useCachedQuery', () => {
  beforeEach(() => {
    clearRequestCache();
  });

  it('does not expose the previous key data while the next query loads', async () => {
    let resolveFirst: (value: string) => void = () => {
      throw new Error('First query resolver was not initialized');
    };
    let resolveSecond: (value: string) => void = () => {
      throw new Error('Second query resolver was not initialized');
    };
    const firstQuery = () => new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const secondQuery = () => new Promise<string>((resolve) => {
      resolveSecond = resolve;
    });

    const { result, rerender } = renderHook(
      ({ queryKey, query }) => useCachedQuery(queryKey, query),
      { initialProps: { queryKey: 'first', query: firstQuery } },
    );

    await act(async () => {
      resolveFirst('first result');
    });
    await waitFor(() => {
      expect(result.current.data).toBe('first result');
    });

    rerender({ queryKey: 'second', query: secondQuery });

    expect(result.current).toMatchObject({
      data: undefined,
      error: null,
      loading: true,
    });

    await act(async () => {
      resolveSecond('second result');
    });
    await waitFor(() => {
      expect(result.current.data).toBe('second result');
    });
  });
});
