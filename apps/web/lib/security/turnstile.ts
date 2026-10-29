/**
 * Cloudflare Turnstile — server-side check of the token a protected form sends.
 *
 * Three verdicts, because "Cloudflare said no" and "Cloudflare could not be
 * asked" need different handling: a failed check is always refused, while
 * each route decides what an unreachable verifier means for it (the admin
 * login fails open, the enquiry form fails closed). Both are recorded as
 * security events, so either one repeating raises an alarm.
 *
 * A token is bound to the form it was minted for (`action`) and to our
 * hostname, so one solved on another site or another form is refused.
 * Cloudflare's test keys report placeholder values for both, so those two
 * checks are skipped in test mode.
 */
import { TURNSTILE_TOKEN_HEADER, turnstileTokenSchema } from '@dronagiri/validators';

import { serverConfig } from '@/lib/config.server';
import { clientIp } from '@/lib/http';
import { SecurityEvent, recordSecurityEvent, requestDetails } from '@/lib/security/security-events';
import { SITE_URL } from '@/lib/seo/site';

export type TurnstileAction = 'admin_login' | 'partner_enquiry';

export type TurnstileVerdict = 'passed' | 'failed' | 'unavailable';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 3000;

const siteHostname = new URL(SITE_URL).hostname;
const EXPECTED_HOSTNAMES = new Set([siteHostname, `www.${siteHostname}`]);

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  hostname?: string;
  action?: string;
}

/** Ask Cloudflare about the token; null when it cannot be reached or answers with a fault. */
async function askCloudflare(token: string, ip: string | null): Promise<SiteverifyResponse | null> {
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: serverConfig.turnstile.secretKey,
        response: token,
        remoteip: ip ?? undefined,
      }),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as SiteverifyResponse;
    return result['error-codes']?.includes('internal-error') ? null : result;
  } catch (error) {
    console.warn('[turnstile] siteverify unreachable', error instanceof Error ? error.message : error);
    return null;
  }
}

function isGenuine(result: SiteverifyResponse, action: TurnstileAction): boolean {
  if (!result.success) return false;
  if (serverConfig.turnstile.isTestMode) return true;
  return result.action === action && result.hostname !== undefined && EXPECTED_HOSTNAMES.has(result.hostname);
}

export async function verifyTurnstile(req: Request, action: TurnstileAction): Promise<TurnstileVerdict> {
  const token = turnstileTokenSchema.safeParse(req.headers.get(TURNSTILE_TOKEN_HEADER));
  if (!token.success) {
    recordSecurityEvent(SecurityEvent.TURNSTILE_FAILED, { ...requestDetails(req), source: `${action}: no token` });
    return 'failed';
  }

  const result = await askCloudflare(token.data, clientIp(req));
  if (result === null) {
    recordSecurityEvent(SecurityEvent.TURNSTILE_UNAVAILABLE, { ...requestDetails(req), source: action });
    return 'unavailable';
  }

  if (!isGenuine(result, action)) {
    const codes = result['error-codes']?.join(',') || 'mismatch';
    recordSecurityEvent(SecurityEvent.TURNSTILE_FAILED, { ...requestDetails(req), source: `${action}: ${codes}` });
    return 'failed';
  }
  return 'passed';
}
