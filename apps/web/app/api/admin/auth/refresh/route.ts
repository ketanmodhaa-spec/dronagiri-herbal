/**
 * /api/admin/auth/refresh — rotate the refresh token for a fresh session.
 *
 * The refresh cookie is path-scoped to exactly this endpoint, so it reaches
 * nowhere else. POST is the programmatic form (JSON); GET is the silent-refresh
 * redirect the Edge middleware uses when an access token is missing or expired.
 */
import { NextResponse, type NextRequest } from 'next/server';

import {
  refreshAdminSession,
  sessionContextFromRequest,
  toSafeAdmin,
} from '@/lib/admin/admin-auth-service';
import {
  ADMIN_REFRESH_COOKIE,
  adminAccessCookie,
  adminRefreshCookie,
  clearedAdminAccessCookie,
  clearedAdminRefreshCookie,
} from '@/lib/auth/admin-session';
import { AuthError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST — programmatic refresh; returns the JSON envelope. */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const token = req.cookies.get(ADMIN_REFRESH_COOKIE)?.value;
    if (!token) {
      throw new AuthError(
        'Your session is no longer valid. Please sign in again.',
        'SESSION_INVALID',
      );
    }
    const session = await refreshAdminSession(token, sessionContextFromRequest(req));
    const response = jsonData({ admin: toSafeAdmin(session.admin) });
    response.cookies.set(adminAccessCookie(session.accessToken));
    response.cookies.set(adminRefreshCookie(session.refreshToken));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * GET — the silent-refresh redirect. The middleware sends an admin page request
 * here when its access token is missing or expired. On success the visitor
 * bounces back to where they were headed; on failure, to the login page with
 * any stale cookies cleared.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const { origin } = req.nextUrl;
  const returnTo = safeReturnPath(req.nextUrl.searchParams.get('return'));
  const token = req.cookies.get(ADMIN_REFRESH_COOKIE)?.value;

  if (token) {
    try {
      const session = await refreshAdminSession(token, sessionContextFromRequest(req));
      const response = NextResponse.redirect(new URL(returnTo, origin));
      response.cookies.set(adminAccessCookie(session.accessToken));
      response.cookies.set(adminRefreshCookie(session.refreshToken));
      return response;
    } catch {
      // Refresh failed — fall through to the login redirect.
    }
  }

  const response = NextResponse.redirect(new URL('/admin/login', origin));
  response.cookies.set(clearedAdminAccessCookie());
  response.cookies.set(clearedAdminRefreshCookie());
  return response;
}

/**
 * Only ever bounce back inside the admin area — never to the login page, and
 * never off-origin (a value starting with `/admin` cannot be absolute or
 * protocol-relative, so `new URL(returnTo, origin)` always stays on-site).
 */
function safeReturnPath(raw: string | null): string {
  if (raw && raw.startsWith('/admin') && !raw.startsWith('/admin/login')) {
    return raw;
  }
  return '/admin';
}
