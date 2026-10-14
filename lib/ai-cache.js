import { createHash } from "crypto";
import redis from "./redis";

/**
 * Generate a short, stable cache key by SHA-256 hashing arbitrary input strings.
 * @param  {...string} parts - values that uniquely identify the request
 * @returns {string} hex digest (first 40 chars)
 */
export function makeCacheKey(prefix, ...parts) {
  const hash = createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 40);
  return `${prefix}:${hash}`;
}

/**
 * Generic cache-aside wrapper for expensive AI calls.
 *
 * Usage:
 *   const result = await cachedAICall({
 *     key: makeCacheKey("resume:text", resumeText, jobTitle, jobDesc),
 *     ttl: 6 * 60 * 60,           // 6 hours in seconds
 *     fn: () => callGemini(...)   // the actual AI call
 *   });
 *
 * @param {{ key: string, ttl: number, fn: () => Promise<any> }} options
 */
export async function cachedAICall({ key, ttl, fn }) {
  // 1. Check cache
  try {
    const cached = await redis.get(key);
    if (cached) {
      return cached; // Upstash auto-deserialises JSON
    }
  } catch (err) {
    // Redis down? Log and fall through to live call — never block the user.
    console.warn("[ai-cache] Redis GET failed, falling back to live call:", err.message);
  }

  // 2. Cache miss — run the real AI call
  const result = await fn();

  // 3. Store in Redis (best-effort — don't throw if Redis write fails)
  try {
    await redis.set(key, result, { ex: ttl });
  } catch (err) {
    console.warn("[ai-cache] Redis SET failed:", err.message);
  }

  return result;
}
