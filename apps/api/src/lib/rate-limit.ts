import { redis } from "./redis.js";

const WINDOW_SECONDS = Number(
  process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60
);

const MAX_REQUESTS = Number(
  process.env.RATE_LIMIT_MAX_REQUESTS ?? 20
);

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
};

export async function checkRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  const key = `rate-limit:v1:${identifier}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(
      key,
      WINDOW_SECONDS
    );
  }

  const ttl = await redis.ttl(key);

  if (count > MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(ttl, 1),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(
      MAX_REQUESTS - count,
      0
    ),
    retryAfter: Math.max(ttl, 1),
  };
}