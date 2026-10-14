import redis from "./redis";

/**
 * Cache a DB list query result in Redis.
 * Reads from cache first; on miss runs fn() and stores the result.
 *
 * @param {{ key: string, ttl: number, fn: () => Promise<any> }} opts
 */
export async function cachedQuery({ key, ttl, fn }) {
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return cached;
    }
  } catch (err) {
    console.warn("[db-cache] Redis GET failed, falling back to DB:", err.message);
  }

  const result = await fn();

  try {
    await redis.set(key, result, { ex: ttl });
  } catch (err) {
    console.warn("[db-cache] Redis SET failed:", err.message);
  }

  return result;
}

/**
 * Invalidate (delete) one or more cache keys.
 * Call this inside write actions (create, delete, update).
 *
 * @param {...string} keys
 */
export async function invalidateCache(...keys) {
  if (!keys.length) return;
  try {
    await Promise.all(keys.map((k) => redis.del(k)));
  } catch (err) {
    console.warn("[db-cache] Redis DEL failed:", err.message);
  }
}

/** Consistent key builders — one per feature */
export const cacheKeys = {
  assessments: (userId) => `db:assessments:${userId}`,
  roadmaps:    (userId) => `db:roadmaps:${userId}`,
  analyses:    (userId) => `db:analyses:${userId}`,
};
