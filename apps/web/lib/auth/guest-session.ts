/**
 * Guest session — the identity every visitor carries without logging in.
 *
 * A guest session is a short HS256 JWT, signed with GUEST_SESSION_SECRET,
 * holding only a random session id. It rides in an HttpOnly cookie and is the
 * stable handle the cart and analytics hang off; it carries no personal data.
 *
 * jose is used rather than jsonwebtoken because the middleware that issues
 * these tokens runs on the Edge runtime — Web Crypto is available there, the
 * Node `crypto` module is not.
 */
import { SignJWT, jwtVerify } from 'jose';

import { serverConfig } from '../config.server';

/** Name of the cookie carrying the guest session token. */
export const GUEST_SESSION_COOKIE = 'dh_guest_session';

/** Guest session lifetime: 7 days, per the security rules in CLAUDE.md. */
export const GUEST_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const ALGORITHM = 'HS256';

const secretKey = new TextEncoder().encode(serverConfig.guestSession.secret);
if (secretKey.length < 32) {
  // HS256 needs a key of at least 256 bits — fail loudly rather than sign weakly.
  throw new Error('GUEST_SESSION_SECRET must be at least 32 bytes for HS256 signing.');
}

/** Cookie attributes for the guest session token. */
export const guestSessionCookieOptions = {
  httpOnly: true,
  secure: serverConfig.isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: GUEST_SESSION_TTL_SECONDS,
} as const;

/** The verified contents of a guest session token. */
export interface GuestSession {
  /** Random, opaque session id — the handle for the cart and analytics. */
  sessionId: string;
}

/** Mint a signed guest session token carrying a fresh, random session id. */
export async function createGuestSessionToken(): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(crypto.randomUUID())
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + GUEST_SESSION_TTL_SECONDS)
    .sign(secretKey);
}

/**
 * Verify a guest session token. Returns the session, or null when the token is
 * absent, malformed, expired, or signed with the wrong key — the caller mints
 * a fresh session in every one of those cases.
 */
export async function verifyGuestSessionToken(
  token: string | undefined,
): Promise<GuestSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: [ALGORITHM] });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
    return { sessionId: payload.sub };
  } catch {
    // Any failure — bad signature, expiry, malformed token — means "no session".
    return null;
  }
}
