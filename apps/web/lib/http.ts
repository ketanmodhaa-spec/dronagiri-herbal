/**
 * API response helpers — the one place the `{ data }` / `{ error }` envelope
 * from CLAUDE.md is constructed, so every route answers in the same shape.
 */
import { NextResponse } from 'next/server';

import { AppError } from '@/lib/errors';

/**
 * The client's IP address — the first entry of `x-forwarded-for`, which
 * Vercel's edge sets and overwrites. Null when the header is absent (local dev).
 */
export function clientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first ? first : null;
}

/**
 * Roughly where the client is — "Ahmedabad, GJ, IN" — from the geo headers
 * Vercel's edge adds. Null when they are absent (local dev).
 */
export function clientPlace(req: Request): string | null {
  const parts = ['x-vercel-ip-city', 'x-vercel-ip-country-region', 'x-vercel-ip-country']
    .map((name) => req.headers.get(name))
    .filter((value): value is string => value !== null && value.length > 0)
    .map(decodeHeaderValue);
  return parts.length > 0 ? parts.join(', ') : null;
}

/** Vercel URL-encodes the city ("New%20Delhi"); a malformed escape is shown as sent. */
function decodeHeaderValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    return value;
  }
}

/** Success envelope — `{ "data": ... }`. */
export function jsonData<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

/** Error envelope — `{ "error": { "code", "message" } }`. */
export function jsonError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Map a thrown value to an error response. A known `AppError` keeps its code
 * and status; anything else is an unexpected fault — logged server-side, then
 * returned as an opaque 500 so internals never reach the client.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return jsonError(error.code, error.message, error.status);
  }
  console.error('[api] unhandled error', error);
  return jsonError('INTERNAL', 'Something went wrong. Please try again.', 500);
}
