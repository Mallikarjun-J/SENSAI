import { Redis } from "@upstash/redis";

/**
 * Singleton Upstash Redis client.
 * Uses HTTP REST — works perfectly in Next.js serverless/edge functions.
 */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default redis;
