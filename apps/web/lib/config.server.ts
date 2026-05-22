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
 * secrets below physically cannot reach the browser.
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

  /**
   * Admin auth keys — read lazily via getters.
   *
   * This module is imported by the Edge middleware, which only ever needs the
   * public key (to verify access tokens). Lazy reads mean a missing value
   * surfaces as a clear error at the call site, not as a crash on every
   * request at module-evaluation time.
   */
  admin: {
    /** RS256 private key (PKCS#8 PEM) — signs admin access tokens. Node only. */
    get jwtPrivateKey(): string {
      return required('ADMIN_JWT_PRIVATE_KEY');
    },
    /** RS256 public key (SPKI PEM) — verifies admin access tokens. Edge-safe. */
    get jwtPublicKey(): string {
      return required('ADMIN_JWT_PUBLIC_KEY');
    },
  },

  /** Upstash Redis (REST) — backs rate limiting today, the cart later. */
  redis: {
    get url(): string {
      return required('UPSTASH_REDIS_REST_URL');
    },
    get token(): string {
      return required('UPSTASH_REDIS_REST_TOKEN');
    },
  },

  /** Cloudflare R2 (S3-compatible) — product and category image storage. */
  r2: {
    get accessKeyId(): string {
      return required('CLOUDFLARE_R2_ACCESS_KEY_ID');
    },
    get secretAccessKey(): string {
      return required('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    },
    get bucket(): string {
      return required('CLOUDFLARE_R2_BUCKET_NAME');
    },
    get endpoint(): string {
      return required('CLOUDFLARE_R2_ENDPOINT');
    },
  },
};
