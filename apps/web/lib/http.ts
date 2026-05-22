/**
 * API response helpers — the one place the `{ data }` / `{ error }` envelope
 * from CLAUDE.md is constructed, so every route answers in the same shape.
 */
import { NextResponse } from 'next/server';

import { AppError } from '@/lib/errors';

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
