/**
 * Server-only application configuration.
 *
 * The companion to lib/config.ts — which holds NEXT_PUBLIC_* values and is safe
 * in the client bundle. This module reads server secrets and must never be
 * imported from a Client Component.
 *
 * It is deliberately not guarded by the `server-only` package: this config is
 * also consumed by the Edge middleware, and `server-only` throws when imported
 * outside a React Server Component. The real protection is Next.js itself —
 * non-NEXT_PUBLIC_ variables are never emitted into the client bundle, so the
 * secret below physically cannot reach the browser.
 *
 * Per CLAUDE.md, application code reads environment variables only through the
 * config layer; this file is its server half.
 */

/** Read a required environment variable, failing fast when it is absent. */
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const serverConfig = {
  /** True only in the production deployment — drives e.g. the Secure cookie flag. */
  isProduction: process.env.NODE_ENV === 'production',
  guestSession: {
    /** HS256 signing secret for the guest session JWT — must be at least 32 bytes. */
    secret: required('GUEST_SESSION_SECRET'),
  },
} as const;
