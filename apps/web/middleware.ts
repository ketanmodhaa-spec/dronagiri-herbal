/**
 * Edge middleware.
 *
 * Two jobs:
 *  • Admin pages (`/admin`, `/admin/*`) are gated here — an unauthenticated
 *    visit is sent through a silent refresh, then to the login page if that
 *    fails.
 *  • Every other request carries a guest session cookie (the cart and
 *    analytics identity), minted on first visit.
 *
 * `/api/admin/*` routes are deliberately left alone: they authenticate
 * themselves with `requireAdmin()` and answer with JSON, never a redirect.
 */
import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken } from './lib/auth/admin-session';
import {
  GUEST_SESSION_COOKIE,
  GUEST_SESSION_ID_HEADER,
  GUEST_SESSION_RENEW_WITHIN_SECONDS,
  createGuestSessionToken,
  guestSessionCookieOptions,
  verifyGuestSessionToken,
} from './lib/auth/guest-session';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Admin API routes guard themselves — let them straight through.
  if (pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // Admin pages are gated here.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return adminPageGate(request);
  }

  // Everything else carries a guest session.
  return guestSession(request);
}

/** Gate an admin page request on a valid access token. */
async function adminPageGate(request: NextRequest): Promise<NextResponse> {
  const { pathname, search, origin } = request.nextUrl;
  const admin = await verifyAdminAccessToken(request.cookies.get(ADMIN_ACCESS_COOKIE)?.value);

  // The login page is the one public admin route.
  if (pathname === '/admin/login') {
    return admin ? NextResponse.redirect(new URL('/admin', origin)) : NextResponse.next();
  }

  // A valid access token passes straight through.
  if (admin) {
    return NextResponse.next();
  }

  // No valid token — try a silent refresh. The refresh endpoint holds the
  // path-scoped refresh cookie; it bounces back here on success, or to the
  // login page on failure.
  const refreshUrl = new URL('/api/admin/auth/refresh', origin);
  refreshUrl.searchParams.set('return', pathname + search);
  return NextResponse.redirect(refreshUrl);
}

/**
 * Attach a guest session to the request.
 *
 * The verified session id is forwarded to route handlers on a request header —
 * `set` overwrites any client-supplied copy — because a cookie minted here is
 * only on the response, invisible to the handler serving this same request.
 * The cookie is (re)issued when absent or invalid, or when close to expiry;
 * renewal keeps the same session id.
 */
async function guestSession(request: NextRequest): Promise<NextResponse> {
  const session = await verifyGuestSessionToken(request.cookies.get(GUEST_SESSION_COOKIE)?.value);
  const sessionId = session?.sessionId ?? crypto.randomUUID();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const needsCookie =
    session === null || session.expiresAt - nowSeconds < GUEST_SESSION_RENEW_WITHIN_SECONDS;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(GUEST_SESSION_ID_HEADER, sessionId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (needsCookie) {
    response.cookies.set(
      GUEST_SESSION_COOKIE,
      await createGuestSessionToken(sessionId),
      guestSessionCookieOptions,
    );
  }
  return response;
}

export const config = {
  /*
   * Run on every page and API route, but skip Next.js internals, the favicon
   * and the Sentry tunnel route (/monitoring) — none of those need a session.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|monitoring).*)'],
};
