/**
 * POST /api/reviews/[id]/helpful — a visitor's thumbs-up on a published
 * review. One per visitor (guest session) per review; repeats change nothing.
 */
import type { NextRequest } from 'next/server';

import { cuidSchema } from '@dronagiri/validators';

import { requireGuestSession } from '@/lib/auth/require-guest-session';
import { NotFoundError, RateLimitError } from '@/lib/errors';
import { clientIp, errorResponse, jsonData } from '@/lib/http';
import { getReviewVoteLimiter } from '@/lib/ratelimit';
import { markHelpful } from '@/lib/reviews/review-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext): Promise<Response> {
  const params = await context.params;
  try {
    const sessionId = await requireGuestSession();
    if (!cuidSchema.safeParse(params.id).success) {
      throw new NotFoundError('That review is not available.');
    }
    const { success } = await getReviewVoteLimiter().limit(clientIp(req) ?? 'unknown');
    if (!success) {
      throw new RateLimitError('Too many votes. Please wait a few minutes.');
    }
    const helpfulCount = await markHelpful(params.id, sessionId);
    return jsonData({ helpfulCount }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
