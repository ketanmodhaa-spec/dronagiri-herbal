/**
 * POST /api/partner-enquiries — the "become a distributor / dealer" form.
 *
 * Public and unauthenticated, so it is defended in layers: an IP rate limit
 * before any work, strict Zod validation, and a honeypot field — a filled
 * honeypot gets the same success response as a real enquiry but is never
 * stored, so a bot learns nothing.
 */
import type { NextRequest } from 'next/server';

import { partnerEnquirySchema } from '@dronagiri/validators';

import { RateLimitError, ValidationError } from '@/lib/errors';
import { clientIp, errorResponse, jsonData } from '@/lib/http';
import { submitPartnerEnquiry } from '@/lib/partners/partner-enquiry-service';
import { getPartnerEnquiryLimiter } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { success } = await getPartnerEnquiryLimiter().limit(clientIp(req) ?? 'unknown');
    if (!success) {
      throw new RateLimitError(
        'We have already received your enquiry. Please wait a while before sending another.',
      );
    }

    const body: unknown = await req.json().catch(() => null);
    const isBot =
      typeof body === 'object' &&
      body !== null &&
      'website' in body &&
      typeof body.website === 'string' &&
      body.website.length > 0;
    if (isBot) {
      return jsonData({ received: true });
    }

    const parsed = partnerEnquirySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Please check the form and try again.');
    }

    await submitPartnerEnquiry(parsed.data);
    return jsonData({ received: true });
  } catch (error) {
    return errorResponse(error);
  }
}
