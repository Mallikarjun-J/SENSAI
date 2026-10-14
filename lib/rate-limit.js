import { Ratelimit } from "@upstash/ratelimit";
import redis from "./redis";

/**
 * Resume Analysis — 5 analyses per hour per user.
 * Both PDF upload and builder analyses share this limit.
 */
export const resumeAnalysisLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "rl:resume-analysis",
  analytics: true,
});

/**
 * Roadmap Generation — 3 generations per hour per user.
 * Roadmaps are very expensive (multiple Gemini calls per generation).
 */
export const roadmapGenerationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  prefix: "rl:roadmap-gen",
  analytics: true,
});

/**
 * Cover Letter — 5 generations per hour per user.
 */
export const coverLetterLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "rl:cover-letter",
  analytics: true,
});

/**
 * Helper: Check rate limit and throw a user-friendly error if exceeded.
 * @param {Ratelimit} limiter
 * @param {string} userId  — unique identifier (DB user id)
 * @param {string} label   — human-readable feature name for the error message
 */
export async function checkRateLimit(limiter, userId, label) {
  const { success, limit, remaining, reset } = await limiter.limit(userId);

  if (!success) {
    const resetIn = Math.ceil((reset - Date.now()) / 1000 / 60); // minutes
    throw new Error(
      `You've reached the ${label} limit (${limit} per hour). ` +
        `Please try again in ${resetIn} minute${resetIn === 1 ? "" : "s"}.`
    );
  }

  return { remaining };
}
