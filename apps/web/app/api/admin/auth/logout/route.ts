/**
 * POST /api/admin/auth/logout — end the session.
 *
 * The refresh cookie never reaches this path by design, so the admin is
 * identified from the access cookie and all of her refresh tokens are revoked
 * — logout is logout-everywhere. The endpoint always succeeds: even an
 * unauthenticated call clears the cookies.
 */
import { revokeAllAdminSessions } from '@/lib/admin/admin-auth-service';
import { clearedAdminAccessCookie, clearedAdminRefreshCookie } from '@/lib/auth/admin-session';
import { getAdminOrNull } from '@/lib/auth/require-admin';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  try {
    const admin = await getAdminOrNull();
    if (admin) {
      await revokeAllAdminSessions(admin.id);
    }
    const response = jsonData({ ok: true });
    response.cookies.set(clearedAdminAccessCookie());
    response.cookies.set(clearedAdminRefreshCookie());
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
