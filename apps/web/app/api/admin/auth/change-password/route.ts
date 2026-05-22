/**
 * POST /api/admin/auth/change-password — change the signed-in admin's password.
 *
 * Requires the current password even though the caller is authenticated, so a
 * hijacked session cannot silently take over the account. On success every
 * session is revoked and this browser's cookies are cleared.
 */
import type { NextRequest } from 'next/server';

import { adminChangePasswordSchema } from '@dronagiri/validators';

import { changeAdminPassword } from '@/lib/admin/admin-auth-service';
import { clearedAdminAccessCookie, clearedAdminRefreshCookie } from '@/lib/auth/admin-session';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const admin = await requireAdmin();

    const body: unknown = await req.json().catch(() => null);
    const parsed = adminChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      // The field-level message here ("Use at least 10 characters") is helpful,
      // not sensitive — surface it so the owner knows what to fix.
      const message = parsed.error.issues[0]?.message ?? 'Enter a valid password.';
      throw new ValidationError(message);
    }

    await changeAdminPassword(admin.id, parsed.data.currentPassword, parsed.data.newPassword);

    const response = jsonData({ ok: true });
    response.cookies.set(clearedAdminAccessCookie());
    response.cookies.set(clearedAdminRefreshCookie());
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
