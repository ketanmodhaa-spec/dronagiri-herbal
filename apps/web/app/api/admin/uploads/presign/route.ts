/**
 * POST /api/admin/uploads/presign — issue a presigned R2 upload URL.
 *
 * Shared by product and category image uploads. The object key is generated
 * server-side; the client never names the file.
 */
import type { NextRequest } from 'next/server';

import { imagePresignSchema } from '@dronagiri/validators';

import { presignImageUpload } from '@/lib/admin/admin-image-service';
import { requireAdmin } from '@/lib/auth/require-admin';
import { RateLimitError, ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import { getImagePresignLimiter } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await requireAdmin();

    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const { success } = await getImagePresignLimiter().limit(ip);
    if (!success) {
      throw new RateLimitError();
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = imagePresignSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid upload request.');
    }
    return jsonData(await presignImageUpload(parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
}
