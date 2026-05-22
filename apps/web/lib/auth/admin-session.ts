/**
 * Admin session — the access token and its cookies.
 *
 * The access token is a short-lived RS256 JWT: signed in Node with the private
 * key, verified anywhere — the Edge middleware included — with the public key.
 * RS256 is asymmetric, so a verifier never holds signing power.
 *
 * Keys are imported lazily and cached. The Edge middleware only ever needs the
 * public key; lazy imports keep a missing env var from crashing every request
 * at module-evaluation time — it fails at the call site instead, with a clear
 * message.
 *
 * This module imports no DB code, so it stays safe for the Edge runtime.
 */
import { SignJWT, importPKCS8, importSPKI, jwtVerify } from 'jose';

import { serverConfig } from '@/lib/config.server';

const ALGORITHM = 'RS256';
const ISSUER = 'dronagiri-admin';

/** Access token lifetime — 8 hours (security rule 2). */
export const ADMIN_ACCESS_TTL_SECONDS = 8 * 60 * 60;
/** Refresh token lifetime — 30 days. */
export const ADMIN_REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Cookie carrying the access token — sent on every admin page and API request. */
export const ADMIN_ACCESS_COOKIE = 'dh_admin_access';
/** Cookie carrying the refresh token. */
export const ADMIN_REFRESH_COOKIE = 'dh_admin_refresh';
/** The refresh cookie is scoped to this path alone — it is transmitted nowhere else. */
export const ADMIN_REFRESH_COOKIE_PATH = '/api/admin/auth/refresh';

/**
 * Admin role — mirrors the Prisma `AdminRole` enum, redeclared here so this
 * Edge-safe module never has to import the DB package.
 */
export type AdminRoleName = 'OWNER' | 'STAFF';

/** The admin identity carried inside an access token. */
export interface AdminClaims {
  id: string;
  email: string;
  name: string;
  role: AdminRoleName;
}

/**
 * Normalise a key from the environment into a PEM string.
 *
 * The admin keys are stored base64-encoded — the whole PEM, encoded, a common
 * way to keep a multi-line key in a single env value. A raw PEM, or one with
 * escaped newlines, is accepted just as well, so the keys can be re-stored
 * later in whichever form without a code change.
 */
function toPem(raw: string): string {
  const value = raw.trim();
  const pem = value.startsWith('-----BEGIN') ? value : atob(value);
  return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem;
}

let privateKeyPromise: ReturnType<typeof importPKCS8> | undefined;
let publicKeyPromise: ReturnType<typeof importSPKI> | undefined;

function getPrivateKey(): ReturnType<typeof importPKCS8> {
  privateKeyPromise ??= importPKCS8(toPem(serverConfig.admin.jwtPrivateKey), ALGORITHM);
  return privateKeyPromise;
}
function getPublicKey(): ReturnType<typeof importSPKI> {
  publicKeyPromise ??= importSPKI(toPem(serverConfig.admin.jwtPublicKey), ALGORITHM);
  return publicKeyPromise;
}

/** Sign an 8-hour access token for an authenticated admin. */
export async function signAdminAccessToken(claims: AdminClaims): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: claims.email, name: claims.name, role: claims.role })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.id)
    .setIssuer(ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(now + ADMIN_ACCESS_TTL_SECONDS)
    .sign(await getPrivateKey());
}

/**
 * Verify an access token. Returns the admin claims, or null when the token is
 * absent, malformed, expired, or signed with the wrong key.
 */
export async function verifyAdminAccessToken(
  token: string | undefined,
): Promise<AdminClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await getPublicKey(), {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
    });
    const { sub, email, name, role } = payload as Record<string, unknown>;
    if (
      typeof sub !== 'string' ||
      typeof email !== 'string' ||
      typeof name !== 'string' ||
      (role !== 'OWNER' && role !== 'STAFF')
    ) {
      return null;
    }
    return { id: sub, email, name, role };
  } catch {
    // Any failure — bad signature, expiry, malformed token — means "no admin".
    return null;
  }
}

/** Attributes for a cookie this module manages — the shape `cookies.set()` accepts. */
export interface AdminCookie {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

function buildCookie(name: string, value: string, path: string, maxAge: number): AdminCookie {
  return {
    name,
    value,
    httpOnly: true,
    secure: serverConfig.isProduction,
    sameSite: 'lax',
    path,
    maxAge,
  };
}

/** Access-token cookie — readable site-wide, scoped to the admin by the JWT itself. */
export function adminAccessCookie(token: string): AdminCookie {
  return buildCookie(ADMIN_ACCESS_COOKIE, token, '/', ADMIN_ACCESS_TTL_SECONDS);
}
/** Refresh-token cookie — path-scoped so the browser sends it only to the refresh endpoint. */
export function adminRefreshCookie(token: string): AdminCookie {
  return buildCookie(
    ADMIN_REFRESH_COOKIE,
    token,
    ADMIN_REFRESH_COOKIE_PATH,
    ADMIN_REFRESH_TTL_SECONDS,
  );
}
/** A maxAge-0 access cookie — clears it on logout or a failed refresh. */
export function clearedAdminAccessCookie(): AdminCookie {
  return buildCookie(ADMIN_ACCESS_COOKIE, '', '/', 0);
}
/** A maxAge-0 refresh cookie — must carry the same path to actually delete. */
export function clearedAdminRefreshCookie(): AdminCookie {
  return buildCookie(ADMIN_REFRESH_COOKIE, '', ADMIN_REFRESH_COOKIE_PATH, 0);
}
