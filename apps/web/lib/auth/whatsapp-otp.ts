/**
 * WhatsApp-delivered phone OTP — the customer's primary identity check.
 *
 * Why these defaults:
 *   - 6 digits: 1-in-a-million guess per attempt; reasonable to type on a phone.
 *   - 5 attempts per code: more than enough for legitimate typos, well under
 *     the brute-force exposure of a 6-digit space.
 *   - 5-minute TTL: long enough that a slow WhatsApp delivery still works;
 *     short enough that a leaked code is rarely usable.
 *   - Stored as SHA-256 hex in Redis: a Redis read does not reveal the code.
 *
 * Feature flag: when `serverConfig.whatsapp.enabled` is false, `issueOtp`
 * does not generate or send anything — it returns `{ issued: false,
 * reason: 'disabled' }`. The caller (eventually, the checkout route)
 * refuses to proceed without an issued OTP.
 *
 * Never logs the raw OTP. Never returns it from `issueOtp`. The only way
 * the OTP leaves this module is the WhatsApp send.
 */

import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import { serverConfig } from '@/lib/config.server';
import { sendWhatsAppTemplate } from '@/lib/notifications/whatsapp/client';
import { otpLoginTemplate } from '@/lib/notifications/whatsapp/templates';
import { getOtpIssueLimiter } from '@/lib/ratelimit';
import { getRedis } from '@/lib/redis';

/** TTL applied to the OTP and its attempt counter (seconds). */
const OTP_TTL_SECONDS = 5 * 60;
/** Max verification attempts before the code is invalidated. */
const MAX_ATTEMPTS = 5;

/** E.164 phone → digits-only key suffix; null when the input isn't usable. */
function normalisePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

function otpKey(phone: string): string {
  return `otp:${phone}`;
}

function attemptsKey(phone: string): string {
  return `otp:attempts:${phone}`;
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Generate, store, and send a fresh OTP to `phone`.
 *
 * Returns `{ issued: true }` on success. The code itself is never returned —
 * it's delivered only via the WhatsApp template. `reason` discriminates the
 * three failure modes the caller surfaces differently to the user.
 */
export interface IssueOtpResult {
  issued: boolean;
  reason?: 'disabled' | 'rate_limited' | 'invalid_phone' | 'send_failed';
}

export async function issueOtp(phone: string): Promise<IssueOtpResult> {
  if (!serverConfig.whatsapp.enabled) {
    return { issued: false, reason: 'disabled' };
  }

  const normalised = normalisePhone(phone);
  if (normalised === null) return { issued: false, reason: 'invalid_phone' };

  const limiter = getOtpIssueLimiter();
  const { success } = await limiter.limit(normalised);
  if (!success) return { issued: false, reason: 'rate_limited' };

  // randomInt(0, 1_000_000) gives a 6-digit space; pad so we never strip a
  // leading zero (e.g. `000123`).
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

  const redis = getRedis();
  // Replace any existing code — the latest issue always wins. Reset the
  // attempts counter at the same time so an old failed code can't poison
  // the new one.
  await redis.set(otpKey(normalised), hashCode(code), { ex: OTP_TTL_SECONDS });
  await redis.del(attemptsKey(normalised));

  const send = await sendWhatsAppTemplate({
    to: normalised,
    template: otpLoginTemplate,
    params: { code },
  });

  if (!send.sent) {
    // Could not deliver — invalidate the code so the user isn't stuck with
    // an OTP they never saw.
    await redis.del(otpKey(normalised));
    return { issued: false, reason: 'send_failed' };
  }

  return { issued: true };
}

/**
 * Verify a code against the stored hash for `phone`.
 *
 * On success, the code is consumed (deleted) — a code is single-use.
 * On a wrong-but-valid attempt, the attempt counter is incremented; when
 * it reaches `MAX_ATTEMPTS` the code is deleted, forcing a fresh issue.
 */
export interface VerifyOtpResult {
  verified: boolean;
  reason?: 'invalid_phone' | 'no_code' | 'mismatch' | 'exhausted';
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const normalised = normalisePhone(phone);
  if (normalised === null) return { verified: false, reason: 'invalid_phone' };

  const redis = getRedis();
  const stored = await redis.get<string>(otpKey(normalised));
  if (stored === null) return { verified: false, reason: 'no_code' };

  const incoming = hashCode(code);
  // timingSafeEqual requires equal-length buffers — sha256 hex is always 64
  // characters so this is true by construction, but guard anyway.
  const matches =
    stored.length === incoming.length &&
    timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(incoming, 'hex'));

  if (matches) {
    // Single-use: consume immediately so a reused code fails the second time.
    await redis.del(otpKey(normalised));
    await redis.del(attemptsKey(normalised));
    return { verified: true };
  }

  // Wrong code — count the attempt; force a fresh issue once the budget runs out.
  const attempts = await redis.incr(attemptsKey(normalised));
  if (attempts === 1) {
    await redis.expire(attemptsKey(normalised), OTP_TTL_SECONDS);
  }
  if (attempts >= MAX_ATTEMPTS) {
    await redis.del(otpKey(normalised));
    return { verified: false, reason: 'exhausted' };
  }

  return { verified: false, reason: 'mismatch' };
}
