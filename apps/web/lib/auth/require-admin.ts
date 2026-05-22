/**
 * `requireAdmin` — resolve the admin behind the current request.
 *
 * Used by `/api/admin/*` route handlers and admin Server Components. It reads
 * and verifies the access-token cookie only — no database round-trip — so it
 * is cheap enough to call on every admin request.
 */
import { cookies } from 'next/headers';

import {
  ADMIN_ACCESS_COOKIE,
  verifyAdminAccessToken,
  type AdminClaims,
} from '@/lib/auth/admin-session';
import { AuthError } from '@/lib/errors';

/** Return the current admin, or null — the non-throwing variant. */
export async function getAdminOrNull(): Promise<AdminClaims | null> {
  const token = cookies().get(ADMIN_ACCESS_COOKIE)?.value;
  return verifyAdminAccessToken(token);
}

/** Return the current admin, or throw `AuthError` (→ 401) when there is none. */
export async function requireAdmin(): Promise<AdminClaims> {
  const admin = await getAdminOrNull();
  if (!admin) {
    throw new AuthError('Please sign in to continue.');
  }
  return admin;
}
