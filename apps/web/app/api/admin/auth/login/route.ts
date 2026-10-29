/**
 * POST /api/admin/auth/login — exchange email + password for an admin session.
 */
import type { NextRequest } from 'next/server';

import { adminLoginSchema } from '@dronagiri/validators';

import {
  authenticateAdmin,
  sessionContextFromRequest,
  startAdminSession,
  toSafeAdmin,
} from '@/lib/admin/admin-auth-service';
import { adminAccessCookie, adminRefreshCookie } from '@/lib/auth/admin-session';
import { AuthError, ForbiddenError, RateLimitError, ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import { runAfterResponse } from '@/lib/notifications/background';
import { getAdminLoginLimiter } from '@/lib/ratelimit';
import { adminLoginAlertFrom, sendAdminLoginAlert } from '@/lib/security/admin-login-alert';
import { SecurityEvent, fingerprint, recordSecurityEvent, requestDetails } from '@/lib/security/security-events';
import { verifyTurnstile } from '@/lib/security/turnstile';

/** bcrypt, Prisma and the Node crypto module — this route must run on Node. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const context = sessionContextFromRequest(req);

    // Rate-limit by client IP before doing any real work.
    const { success } = await getAdminLoginLimiter().limit(context.ipAddress ?? 'unknown');
    if (!success) {
      recordSecurityEvent(SecurityEvent.ADMIN_LOGIN_RATE_LIMITED, requestDetails(req));
      throw new RateLimitError();
    }

    // Fails open: with Cloudflare unreachable, the rate limit and bcrypt still
    // stand, and the outage is recorded and alarmed — Sarita is never locked out.
    if ((await verifyTurnstile(req, 'admin_login')) === 'failed') {
      throw new ForbiddenError('The security check failed. Please try again.', 'TURNSTILE_FAILED');
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      // Generic message — never reveal which field failed.
      throw new ValidationError('Enter a valid email and password.');
    }

    const admin = await authenticateAdmin(parsed.data.email, parsed.data.password).catch(
      (error: unknown) => {
        if (error instanceof AuthError) {
          recordSecurityEvent(SecurityEvent.ADMIN_LOGIN_FAILED, {
            ...requestDetails(req),
            target: fingerprint(parsed.data.email),
          });
        }
        throw error;
      },
    );
    const session = await startAdminSession(admin, context);

    const loginAlert = adminLoginAlertFrom(session.admin, req);
    runAfterResponse(`admin login alert ${session.admin.id}`, () => sendAdminLoginAlert(loginAlert));

    const response = jsonData({ admin: toSafeAdmin(session.admin) });
    response.cookies.set(adminAccessCookie(session.accessToken));
    response.cookies.set(adminRefreshCookie(session.refreshToken));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
