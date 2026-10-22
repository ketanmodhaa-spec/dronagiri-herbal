/**
 * GET /api/pincode/[pin] — where a PIN code is, for address forms.
 *
 * Answers `{ found: true, district, states, areas }` from India Post's
 * directory, or `{ found: false }` for a well-formed PIN it does not list.
 * Public data, so no session and no rate limit; the edge caches each answer
 * for a day and repeat lookups never reach the function.
 */
import { indianPincodeSchema, stateName } from '@dronagiri/validators';

import { lookupPincode } from '@/lib/address/pincode-directory';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';

const CACHE = { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' };

interface RouteContext {
  params: Promise<{ pin: string }>;
}

export async function GET(_req: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  try {
    const parsed = indianPincodeSchema.safeParse(params.pin);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Enter a valid 6-digit PIN code');
    }
    const info = lookupPincode(parsed.data);
    if (!info) return jsonData({ found: false as const }, { headers: CACHE });
    return jsonData(
      {
        found: true as const,
        district: info.district,
        states: info.stateCodes.map(stateName),
        areas: info.areas,
      },
      { headers: CACHE },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
