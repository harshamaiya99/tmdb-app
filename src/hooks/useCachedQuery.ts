import { useEffect, useRef, useState } from 'react';
import { fetchCached, getCached } from '@/lib/requestCache';

interface UseCachedQueryOptions {
  enabled?: boolean;
  ttlMs?: number;
}

export interface CachedQueryState<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
}

const DEFAULT_TTL = 5 * 60 * 1000;

export function useCachedQuery<T>(
  key: string,
  query: (signal: AbortSignal) => Promise<T>,
  options: UseCachedQueryOptions = {},
): CachedQueryState<T> {
  const { enabled = true, ttlMs = DEFAULT_TTL } = options;
  const queryRef = useRef(query);
  queryRef.current = query;
  const cached = enabled ? getCached<T>(key) : undefined;
  const [state, setState] = useState<CachedQueryState<T>>({
    data: cached,
    error: null,
    loading: enabled && cached === undefined,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ data: undefined, error: null, loading: false });
      return;
    }

    const controller = new AbortController();
    const cachedValue = getCached<T>(key);

    if (cachedValue !== undefined) {
      setState({ data: cachedValue, error: null, loading: false });
      return () => controller.abort();
    }

    setState((current) => ({ ...current, error: null, loading: true }));

    fetchCached(key, (signal) => queryRef.current(signal), ttlMs, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ data, error: null, loading: false });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ data: undefined, error: error instanceof Error ? error : new Error('Request failed'), loading: false });
        }
      });

    return () => controller.abort();
  }, [enabled, key, ttlMs]);

  return state;
}