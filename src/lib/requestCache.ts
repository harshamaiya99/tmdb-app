interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
interface InFlightRequest<T> {
  controller: AbortController;
  promise: Promise<T>;
  subscribers: number;
}

const inFlight = new Map<string, InFlightRequest<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return entry.value as T;
}

export function fetchCached<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
  ttlMs: number,
  signal?: AbortSignal,
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== undefined) return Promise.resolve(cached);

  const existing = inFlight.get(key) as InFlightRequest<T> | undefined;
  if (existing) {
    existing.subscribers += signal ? 1 : 0;
    return observeRequest(key, existing, signal);
  }

  const controller = new AbortController();
  const request = loader(controller.signal)
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  const entry: InFlightRequest<T> = { controller, promise: request, subscribers: signal ? 1 : 0 };
  inFlight.set(key, entry);
  return observeRequest(key, entry, signal);
}

function observeRequest<T>(key: string, entry: InFlightRequest<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return entry.promise;
  if (signal.aborted) {
    releaseRequest(key, entry);
    return Promise.reject(new DOMException('The request was aborted.', 'AbortError'));
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const release = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      releaseRequest(key, entry);
    };
    const abort = () => {
      release();
      reject(new DOMException('The request was aborted.', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    entry.promise.then(resolve, reject).finally(release);
  });
}

function releaseRequest<T>(key: string, entry: InFlightRequest<T>) {
  entry.subscribers = Math.max(0, entry.subscribers - 1);
  if (entry.subscribers !== 0) return;

  queueMicrotask(() => {
    if (entry.subscribers === 0 && inFlight.get(key) === entry) {
      entry.controller.abort();
    }
  });
}

export function clearRequestCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}