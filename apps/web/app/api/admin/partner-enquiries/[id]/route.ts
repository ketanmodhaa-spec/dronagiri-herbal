/**
 * PATCH /api/admin/partner-enquiries/[id] — move a lead along (status) and
 * keep private notes.
 */
import type { NextRequest } from 'next/server';

import { cuidSchema, partnerEnquiryUpdateSchema } from '@dronagiri/validators';

import { requireAdmin } from '@/lib/auth/require-admin';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import { updatePartnerEnquiry } from '@/lib/partners/partner-enquiry-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    await requireAdmin();
    if (!cuidSchema.safeParse(params.id).success) {
      throw new NotFoundError('That enquiry no longer exists.');
    }
    const body: unknown = await req.json().catch(() => null);
    const parsed = partnerEnquiryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Enter a valid update.');
    }
    const enquiry = await updatePartnerEnquiry(params.id, parsed.data);
    return jsonData({ enquiry: { id: enquiry.id, status: enquiry.status, internalNote: enquiry.internalNote } });
  } catch (error) {
    return errorResponse(error);
  }
}
