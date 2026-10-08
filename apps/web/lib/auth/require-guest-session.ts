/**
 * `requireGuestSession` — the guest session id behind the current request.
 *
 * The Edge middleware verifies (or mints) the guest session cookie on every
 * storefront request and forwards the id on `GUEST_SESSION_ID_HEADER`,
 * overwriting anything the client sent. Reading the header — not the cookie —
 * is what lets a visitor's very first request (e.g. an add-to-cart straight
 * from a WhatsApp link) see the session minted for it.
 */
import { headers } from 'next/headers';

import { GUEST_SESSION_ID_HEADER } from '@/lib/auth/guest-session';
import { AuthError } from '@/lib/errors';

/** Return the session id, or throw `AuthError` (→ 401) if the middleware did not run. */
export function requireGuestSession(): string {
  const sessionId = headers().get(GUEST_SESSION_ID_HEADER);
  if (!sessionId) {
    throw new AuthError('Your session could not be found. Please refresh the page.', 'NO_SESSION');
  }
  return sessionId;
}
