/**
 * Redis-based rate limiting with per-user + per-IP limits.
 * Uses sliding window counter pattern.
 */

import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}

// ── Rate Limit Configs ───────────────────────────────────────────────────────

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  burstMax?: number; // max requests in 1 second
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  createRoom: { windowMs: 60_000, maxRequests: 5, burstMax: 2 },
  joinRoom: { windowMs: 60_000, maxRequests: 10, burstMax: 3 },
  playMove: { windowMs: 1_000, maxRequests: 5, burstMax: 5 },
  state: { windowMs: 1_000, maxRequests: 10, burstMax: 10 },
  default: { windowMs: 60_000, maxRequests: 30, burstMax: 5 },
};

// ── Rate Limit Check ─────────────────────────────────────────────────────────

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export async function checkRateLimit(
  identifier: string, // IP or userId
  action: string
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    // No Redis = local dev, skip rate limiting
    return { allowed: true, remaining: 999, resetMs: 0 };
  }

  const config = RATE_LIMITS[action] || RATE_LIMITS.default;
  const key = `rl:${action}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Sliding window: remove old entries, count current, add new
    const pipe = redis.pipeline();
    pipe.zremrangebyscore(key, 0, windowStart);
    pipe.zcard(key);
    pipe.zadd(key, { score: now, member: `${now}:${Math.random()}` });
    pipe.pexpire(key, config.windowMs);

    const results = await pipe.exec();
    const currentCount = (results[1] as number) || 0;

    if (currentCount >= config.maxRequests) {
      // Get oldest entry to calculate reset time
      const oldest = await redis.zrange(key, 0, 0, { withScores: true });
      const resetMs =
        oldest.length > 0
          ? (oldest[0] as unknown as { score: number }).score +
            config.windowMs -
            now
          : config.windowMs;

      return { allowed: false, remaining: 0, resetMs };
    }

    // Burst check (per-second)
    if (config.burstMax) {
      const burstKey = `rl:burst:${action}:${identifier}`;
      const burstCount = await redis.incr(burstKey);
      if (burstCount === 1) {
        await redis.pexpire(burstKey, 1000);
      }
      if (burstCount > config.burstMax) {
        return { allowed: false, remaining: 0, resetMs: 1000 };
      }
    }

    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetMs: 0,
    };
  } catch {
    // Redis error = allow (fail open, but log)
    console.error("[RateLimit] Redis error, allowing request");
    return { allowed: true, remaining: 999, resetMs: 0 };
  }
}

// ── Response Headers ─────────────────────────────────────────────────────────

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetMs),
  };
}
