/**
 * POST /api/admin/auth/login — exchange email + password for an admin session.
 */
import type { NextRequest } from 'next/server';

import { adminLoginSchema } from '@dronagiri/validators';

import {
  authenticateAdmin,
  sessionContextFromRequest,
  startAdminSession,
  toSafeAdmin,
} from '@/lib/admin/admin-auth-service';
import { adminAccessCookie, adminRefreshCookie } from '@/lib/auth/admin-session';
import { RateLimitError, ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import { getAdminLoginLimiter } from '@/lib/ratelimit';

/** bcrypt, Prisma and the Node crypto module — this route must run on Node. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const context = sessionContextFromRequest(req);

    // Rate-limit by client IP before doing any real work.
    const { success } = await getAdminLoginLimiter().limit(context.ipAddress ?? 'unknown');
    if (!success) {
      throw new RateLimitError();
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      // Generic message — never reveal which field failed.
      throw new ValidationError('Enter a valid email and password.');
    }

    const admin = await authenticateAdmin(parsed.data.email, parsed.data.password);
    const session = await startAdminSession(admin, context);

    const response = jsonData({ admin: toSafeAdmin(session.admin) });
    response.cookies.set(adminAccessCookie(session.accessToken));
    response.cookies.set(adminRefreshCookie(session.refreshToken));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
