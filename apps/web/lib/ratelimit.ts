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

let partnerEnquiryLimiter: Ratelimit | undefined;

/**
 * Partner enquiry limiter — 3 submissions per hour, keyed by client IP. A real
 * enquirer submits once; this stops a bot from flooding Sarita's lead list
 * and inbox.
 */
export function getPartnerEnquiryLimiter(): Ratelimit {
  partnerEnquiryLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'rl:partner-enquiry',
    analytics: false,
  });
  return partnerEnquiryLimiter;
}

let cartMutationLimiter: Ratelimit | undefined;

/**
 * Cart mutation limiter — 30 adds/updates/removes per minute, keyed on the
 * compound `sessionId:ip`. Applied to every cart write before validation;
 * reads are not limited. Far above what a real shopper does in a minute.
 */
export function getCartMutationLimiter(): Ratelimit {
  cartMutationLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:cart',
    analytics: false,
  });
  return cartMutationLimiter;
}

let paymentVerifyLimiter: Ratelimit | undefined;

/**
 * Payment verification limiter — 3 per 5 minutes, keyed on `sessionId:ip`
 * (CLAUDE.md security rule 5). A real customer verifies once per payment;
 * a forged-signature probe gets three tries and stops.
 */
export function getPaymentVerifyLimiter(): Ratelimit {
  paymentVerifyLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(3, '5 m'),
    prefix: 'rl:payment-verify',
    analytics: false,
  });
  return paymentVerifyLimiter;
}

let reviewSubmitLimiter: Ratelimit | undefined;

/**
 * Review submission limiter — 10 per hour per IP. A buyer reviews the few
 * products in their order once each; this stops a scripted flood.
 */
export function getReviewSubmitLimiter(): Ratelimit {
  reviewSubmitLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'rl:review-submit',
    analytics: false,
  });
  return reviewSubmitLimiter;
}

let reviewVoteLimiter: Ratelimit | undefined;

/**
 * "Helpful" vote limiter — 20 per 10 minutes per IP. One vote per visitor per
 * review is enforced in the database; this caps how fast a script that keeps
 * minting fresh sessions can add votes.
 */
export function getReviewVoteLimiter(): Ratelimit {
  reviewVoteLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(20, '10 m'),
    prefix: 'rl:review-vote',
    analytics: false,
  });
  return reviewVoteLimiter;
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

let checkoutLimiter: Ratelimit | undefined;

/**
 * Checkout limiter — 5 orders per minute, keyed on `sessionId:ip`
 * (CLAUDE.md security rule 5). A real customer places one; this stops a
 * script from filling the orders list with unpaid orders.
 */
export function getCheckoutLimiter(): Ratelimit {
  checkoutLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'rl:checkout',
    analytics: false,
  });
  return checkoutLimiter;
}
