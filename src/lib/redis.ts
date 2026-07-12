import { Redis } from "@upstash/redis";
import { env } from "@/config/env";
import logger from "@/config/logger";

/**
 * Upstash Redis client (serverless-friendly). Returns null when not configured
 * so the app can run locally without Redis (features degrade gracefully).
 */
let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (!env.upstashRedisRestUrl || !env.upstashRedisRestToken) {
    logger.warn("Upstash Redis not configured — caching/rate-limit disabled");
    return null;
  }
  _redis = new Redis({
    url: env.upstashRedisRestUrl,
    token: env.upstashRedisRestToken,
  });
  return _redis;
}

/** Read-through cache helper. `fn` is the fallback producer. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const redis = getRedis();
  if (!redis) return fn();
  const cachedVal = await redis.get<string>(key);
  if (cachedVal) {
    try {
      return JSON.parse(cachedVal) as T;
    } catch {
      // fall through to recompute
    }
  }
  const value = await fn();
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  return value;
}
