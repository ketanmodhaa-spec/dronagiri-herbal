/**
 * Security events — the record of every attempt a defence blocked, and the
 * alarm that tells Jaydeep when those attempts form a pattern.
 *
 * Every event writes one `[security]` log line. With alarms enabled, it also
 * counts towards an hourly threshold per event type; reaching it emails
 * SECURITY_ALERT_EMAIL once, then that event type is muted for four hours so
 * a long attack produces one alarm, not hundreds.
 *
 * Recording never throws and never delays the response: the counting and the
 * email run after the response (`runAfterResponse`). Details are typed so that
 * nothing sensitive can be passed in — no password, token, signature, phone
 * or email; a targeted account is reduced to a short hash (`fingerprint`).
 */
import { createHash } from 'node:crypto';

import { serverConfig } from '@/lib/config.server';
import { clientIp, clientPlace } from '@/lib/http';
import { runAfterResponse } from '@/lib/notifications/background';
import { sendEmail } from '@/lib/notifications/email/client';
import { getRedis } from '@/lib/redis';
import { absoluteUrl } from '@/lib/seo/site';

export enum SecurityEvent {
  ADMIN_LOGIN_FAILED = 'admin_login_failed',
  ADMIN_LOGIN_RATE_LIMITED = 'admin_login_rate_limited',
  /** A rotated-out refresh token was presented again — a stolen session. */
  ADMIN_REFRESH_REUSE = 'admin_refresh_reuse',
  WEBHOOK_BAD_SIGNATURE = 'webhook_bad_signature',
  PAYMENT_BAD_SIGNATURE = 'payment_bad_signature',
  /** A well-formed pay or review link whose signature does not match. */
  ORDER_LINK_TAMPERED = 'order_link_tampered',
  RATE_LIMITED = 'rate_limited',
  TURNSTILE_FAILED = 'turnstile_failed',
  /** Cloudflare's verifier could not be reached — the check was skipped or the form refused. */
  TURNSTILE_UNAVAILABLE = 'turnstile_unavailable',
  /** The admin-login WhatsApp alert did not reach Sarita. */
  WHATSAPP_SEND_FAILED = 'whatsapp_send_failed',
}

export interface SecurityEventDetails {
  /** Where it happened — a route path, or a name such as `pay link`. */
  route: string;
  ip?: string | null;
  place?: string | null;
  /** Which limiter, webhook or form — a label, never a credential. */
  source?: string;
  /** `fingerprint()` of the targeted account — enough to see "same target". */
  target?: string;
}

interface AlarmRule {
  /** Events in one hour that raise the alarm. */
  threshold: number;
  /** Email subject, given the count. */
  headline: (count: number) => string;
  /** The one thing to do about it. */
  action: string;
}

const ALARM_RULES: Record<SecurityEvent, AlarmRule> = {
  [SecurityEvent.ADMIN_LOGIN_FAILED]: {
    threshold: 10,
    headline: (n) => `${n} failed admin logins in the last hour`,
    action:
      'Someone may be guessing the admin password. If the addresses below are not Sarita, make sure her password is long and unique.',
  },
  [SecurityEvent.ADMIN_LOGIN_RATE_LIMITED]: {
    threshold: 1,
    headline: () => 'Admin login rate limit tripped',
    action: 'Five failed logins from one address in 15 minutes. Check with Sarita whether it was her.',
  },
  [SecurityEvent.ADMIN_REFRESH_REUSE]: {
    threshold: 1,
    headline: () => 'A stolen admin session was used',
    action:
      'Every session for that admin has already been signed out. Change that admin’s password now — SECURITY-PLAYBOOK.md, scenario 1.',
  },
  [SecurityEvent.WEBHOOK_BAD_SIGNATURE]: {
    threshold: 1,
    headline: () => 'Webhook with a bad signature',
    action:
      'Either the webhook secret was rotated without updating Doppler, or the message is forged. SECURITY-PLAYBOOK.md, scenario 3.',
  },
  [SecurityEvent.PAYMENT_BAD_SIGNATURE]: {
    threshold: 1,
    headline: () => 'Payment with a bad signature',
    action:
      'Someone sent a payment confirmation Razorpay did not sign. No order was fulfilled. SECURITY-PLAYBOOK.md, scenario 3.',
  },
  [SecurityEvent.ORDER_LINK_TAMPERED]: {
    threshold: 5,
    headline: (n) => `${n} forged order links in the last hour`,
    action: 'Someone is guessing pay or review links. They were refused; watch for it repeating.',
  },
  [SecurityEvent.RATE_LIMITED]: {
    threshold: 50,
    headline: (n) => `${n} rate-limited requests in the last hour`,
    action: 'A script is hammering the site. SECURITY-PLAYBOOK.md, scenario 4.',
  },
  [SecurityEvent.TURNSTILE_FAILED]: {
    threshold: 20,
    headline: (n) => `${n} failed bot checks in the last hour`,
    action: 'Bots are hitting a protected form and being refused. SECURITY-PLAYBOOK.md, scenario 4.',
  },
  [SecurityEvent.TURNSTILE_UNAVAILABLE]: {
    threshold: 1,
    headline: () => 'Cloudflare Turnstile unreachable',
    action:
      'Admin login is working without the bot check; the enquiry form is refusing submissions. Check https://www.cloudflarestatus.com.',
  },
  [SecurityEvent.WHATSAPP_SEND_FAILED]: {
    threshold: 1,
    headline: () => 'Admin login alert did not reach Sarita',
    action: `Check ${absoluteUrl('/admin/messages')} for the error. Until it is fixed, login alerts reach only this inbox.`,
  },
};

const COUNT_WINDOW_SECONDS = 60 * 60;
const MUTE_SECONDS = 4 * 60 * 60;
const RECENT_KEPT = 5;
/** Dev and production share one Redis — a dev test must never mute a real alarm. */
const KEY_PREFIX = serverConfig.isProduction ? 'sec' : 'sec-dev';

const istFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** "29 Oct, 12:40 pm" — Indian time, as Sarita and Jaydeep read it. */
export function formatIst(date: Date): string {
  return istFormat.format(date);
}

/** A short, stable hash of an identifier — never reversible to the email itself. */
export function fingerprint(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 12);
}

/** Route, address and place of an incoming request — the usual event details. */
export function requestDetails(req: Request): SecurityEventDetails {
  return { route: new URL(req.url).pathname, ip: clientIp(req), place: clientPlace(req) };
}

/** Record one blocked attempt. Returns immediately; never throws. */
export function recordSecurityEvent(event: SecurityEvent, details: SecurityEventDetails): void {
  console.warn(`[security] ${event}`, JSON.stringify(details));
  if (!serverConfig.security.alarmsEnabled) return;
  runAfterResponse(`security event ${event}`, () => countTowardsAlarm(event, details));
}

async function countTowardsAlarm(event: SecurityEvent, details: SecurityEventDetails): Promise<void> {
  const redis = getRedis();
  const countKey = `${KEY_PREFIX}:count:${event}`;
  const recentKey = `${KEY_PREFIX}:recent:${event}`;

  const count = await redis.incr(countKey);
  if (count === 1) await redis.expire(countKey, COUNT_WINDOW_SECONDS);
  await redis.lpush(recentKey, { at: new Date().toISOString(), ...details });
  await redis.ltrim(recentKey, 0, RECENT_KEPT - 1);
  await redis.expire(recentKey, COUNT_WINDOW_SECONDS);

  const rule = ALARM_RULES[event];
  if (count < rule.threshold) return;

  // SET NX claims the alarm: of all requests crossing the line, exactly one sends.
  const claimed = await redis.set(`${KEY_PREFIX}:mute:${event}`, '1', { nx: true, ex: MUTE_SECONDS });
  if (claimed !== 'OK') return;

  const recent = await redis.lrange<SecurityEventDetails & { at: string }>(recentKey, 0, RECENT_KEPT - 1);
  await sendAlarm(event, rule, count, recent);
}

async function sendAlarm(
  event: SecurityEvent,
  rule: AlarmRule,
  count: number,
  recent: ReadonlyArray<SecurityEventDetails & { at: string }>,
): Promise<void> {
  const headline = rule.headline(count);
  // Also an error log, so Sentry carries the alarm if the email does not arrive.
  console.error(`[security] ALARM ${event}: ${headline}`);

  const lines = recent.map((entry) =>
    [formatIst(new Date(entry.at)), entry.route, entry.ip ?? 'unknown address', entry.place, entry.source, entry.target]
      .filter((part): part is string => typeof part === 'string' && part.length > 0)
      .join(' · '),
  );

  await sendEmail({
    to: serverConfig.security.alertEmail,
    subject: `[Dronagiri security] ${headline}`,
    text: [
      headline,
      '',
      rule.action,
      '',
      'Most recent:',
      ...lines.map((line) => `  ${line}`),
      '',
      `Further alarms of this kind are muted for ${MUTE_SECONDS / 3600} hours. Event: ${event}.`,
    ].join('\n'),
    templateName: `security_alarm_${event}`,
  });
}
