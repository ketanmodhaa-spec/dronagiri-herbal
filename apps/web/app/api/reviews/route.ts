/**
 * POST /api/reviews — a verified buyer submits a review of one product from
 * their order. The signed token in the body is the proof of purchase; the
 * review waits for Sarita before it is shown.
 */
import type { NextRequest } from 'next/server';

import { reviewSubmitSchema } from '@dronagiri/validators';

import { RateLimitError, ValidationError } from '@/lib/errors';
import { clientIp, errorResponse, jsonData } from '@/lib/http';
import { getReviewSubmitLimiter } from '@/lib/ratelimit';
import { SecurityEvent, recordSecurityEvent, requestDetails } from '@/lib/security/security-events';
import { submitReview } from '@/lib/reviews/review-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { success } = await getReviewSubmitLimiter().limit(clientIp(req) ?? 'unknown');
    if (!success) {
      recordSecurityEvent(SecurityEvent.RATE_LIMITED, { ...requestDetails(req), source: 'review-submit' });
      throw new RateLimitError();
    }

    const body: unknown = await req.json().catch(() => null);
    // Honeypot filled in: a bot. Answer as if it worked and store nothing.
    if (typeof body === 'object' && body !== null && 'website' in body && body.website) {
      return jsonData({ ok: true });
    }
    const parsed = reviewSubmitSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Please check your review.');
    }

    await submitReview(parsed.data);
    return jsonData({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
