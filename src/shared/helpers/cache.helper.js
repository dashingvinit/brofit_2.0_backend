/**
 * Simple in-process TTL cache backed by a Map.
 * Suitable for caching read-heavy, slowly-changing data (analytics, stats).
 * Not shared across processes — restart clears it, which is fine.
 *
 * Usage:
 *   const result = await cache.get(key, ttlMs, () => expensiveQuery());
 */

const store = new Map(); // key → { value, expiresAt }

/**
 * Returns cached value if fresh, otherwise calls loader(), caches and returns its result.
 * @param {string} key       - Cache key (include orgId to keep tenants isolated)
 * @param {number} ttlMs     - Time-to-live in milliseconds
 * @param {() => Promise<*>} loader - Async function that produces the value
 */
async function get(key, ttlMs, loader) {
  const entry = store.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.value;
  }
  const value = await loader();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

/**
 * Explicitly remove a cache entry (call after a write operation).
 * Accepts a prefix to invalidate all keys that start with it.
 */
function invalidate(keyOrPrefix) {
  for (const key of store.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      store.delete(key);
    }
  }
}

/** Clear the entire cache (e.g. on server startup or for tests). */
function clear() {
  store.clear();
}

// Common TTLs
const TTL = {
  FIVE_MIN: 5 * 60 * 1000,
  TEN_MIN: 10 * 60 * 1000,
  THIRTY_MIN: 30 * 60 * 1000,
};

module.exports = { get, invalidate, clear, TTL };
