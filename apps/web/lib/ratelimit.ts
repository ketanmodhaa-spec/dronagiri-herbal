/**
 * Upstash-backed rate limiting.
 *
 * One Redis client and each limiter are created lazily and cached — a route
 * that never rate-limits never opens a connection. Limiters use a sliding
 * window, so a burst straddling a window boundary cannot double the allowance.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { serverConfig } from '@/lib/config.server';

let redis: Redis | undefined;
function getRedis(): Redis {
  redis ??= new Redis({ url: serverConfig.redis.url, token: serverConfig.redis.token });
  return redis;
}

let adminLoginLimiter: Ratelimit | undefined;

/**
 * Admin login limiter — 5 attempts per 15 minutes, keyed by client IP
 * (the policy in AUDIT.md). Brute-force protection for the one
 * unauthenticated admin endpoint.
 */
export function getAdminLoginLimiter(): Ratelimit {
  adminLoginLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:admin-login',
    analytics: false,
  });
  return adminLoginLimiter;
}

let imagePresignLimiter: Ratelimit | undefined;

/**
 * Admin image-presign limiter — 60 presigns per 10 minutes, keyed by client IP.
 * Generous enough for a real photo-upload session, tight enough to stop a
 * runaway client loop.
 */
export function getImagePresignLimiter(): Ratelimit {
  imagePresignLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(60, '10 m'),
    prefix: 'rl:admin-presign',
    analytics: false,
  });
  return imagePresignLimiter;
}
