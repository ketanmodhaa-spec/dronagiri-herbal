/**
 * POST /api/admin/reviews/[id] — publish, reject (for a posting rule) or
 * reply to a review.
 */
import type { NextRequest } from 'next/server';

import { cuidSchema, reviewModerationSchema } from '@dronagiri/validators';

import { requireAdmin } from '@/lib/auth/require-admin';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import { publishReview, rejectReview, replyToReview } from '@/lib/reviews/review-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext): Promise<Response> {
  const params = await context.params;
  try {
    const admin = await requireAdmin();
    if (!cuidSchema.safeParse(params.id).success) {
      throw new NotFoundError('That review no longer exists.');
    }
    const body: unknown = await req.json().catch(() => null);
    const parsed = reviewModerationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid review action.');
    }

    const action = parsed.data;
    switch (action.action) {
      case 'PUBLISH':
        await publishReview(params.id, admin.id);
        break;
      case 'REJECT':
        await rejectReview(params.id, admin.id, action.reason);
        break;
      case 'REPLY':
        await replyToReview(params.id, action.reply);
        break;
    }
    return jsonData({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
