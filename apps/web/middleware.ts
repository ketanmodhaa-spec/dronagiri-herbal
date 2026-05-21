/**
 * Guest session middleware.
 *
 * Runs on the Edge runtime ahead of every page and API request. When a request
 * arrives without a valid guest session cookie, it mints a fresh one — so every
 * visitor has an identity for the cart and analytics without ever being asked
 * to log in (the auth mandate in CLAUDE.md). A valid existing cookie is left
 * exactly as it is.
 */
import { NextResponse, type NextRequest } from 'next/server';

import {
  GUEST_SESSION_COOKIE,
  createGuestSessionToken,
  guestSessionCookieOptions,
  verifyGuestSessionToken,
} from './lib/auth/guest-session';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(GUEST_SESSION_COOKIE)?.value;
  if (await verifyGuestSessionToken(token)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(
    GUEST_SESSION_COOKIE,
    await createGuestSessionToken(),
    guestSessionCookieOptions,
  );
  return response;
}

export const config = {
  /*
   * Run on every page and API route, but skip Next.js internals, the favicon
   * and the Sentry tunnel route (/monitoring) — none of those need a session.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|monitoring).*)'],
};
