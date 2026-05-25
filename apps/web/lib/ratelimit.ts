/**
 * Upstash-backed rate limiting.
 *
 * Each limiter is created lazily and cached — a route that never rate-limits
 * never builds one. Limiters use a sliding window, so a burst straddling a
 * window boundary cannot double the allowance. The underlying Redis client
 * is the shared one from `lib/redis.ts`.
 */
import { Ratelimit } from '@upstash/ratelimit';

import { getRedis } from '@/lib/redis';

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

let otpIssueLimiter: Ratelimit | undefined;

/**
 * OTP issue limiter — 3 sends per 10 minutes, keyed by phone number.
 * Tight enough to keep an attacker from grinding through codes, generous
 * enough that a legitimate user's typo + retry doesn't lock them out.
 */
export function getOtpIssueLimiter(): Ratelimit {
  otpIssueLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(3, '10 m'),
    prefix: 'rl:otp-issue',
    analytics: false,
  });
  return otpIssueLimiter;
}
