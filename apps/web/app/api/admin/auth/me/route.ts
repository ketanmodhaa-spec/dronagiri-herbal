/**
 * GET /api/admin/auth/me — the current admin's identity.
 *
 * Returns only the safe projection — id, email, name, role. The password hash
 * and refresh tokens have no path into this response.
 */
import { toSafeAdmin } from '@/lib/admin/admin-auth-service';
import { requireAdmin } from '@/lib/auth/require-admin';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const admin = await requireAdmin();
    return jsonData({ admin: toSafeAdmin(admin) });
  } catch (error) {
    return errorResponse(error);
  }
}
