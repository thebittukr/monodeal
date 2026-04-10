/**
 * Simple in-memory cache with TTL.
 * Shared across serverless invocations on the same instance.
 * Falls through to fresh data on cache miss — zero downtime.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Get or compute a cached value.
 * @param key Cache key
 * @param ttlMs Time-to-live in milliseconds
 * @param compute Async function to compute the value on cache miss
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) {
    return entry.data;
  }

  const data = await compute();
  store.set(key, { data, expiresAt: now + ttlMs });
  return data;
}

/**
 * Invalidate a specific cache key.
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Invalidate all cache keys matching a prefix.
 */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
