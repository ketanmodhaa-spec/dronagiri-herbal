/**
 * Central application configuration.
 *
 * Per CLAUDE.md, application code reads environment variables only through
 * this module. (`next.config.mjs` — build tooling — is the sole exception.)
 * Only NEXT_PUBLIC_* variables are referenced here, so this file is safe to
 * import from client components and the Sentry client config alike.
 */

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? '';

const sentryEnvironment =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';

/** Public base URL for Cloudflare R2 objects — trailing slash stripped. */
const cdnUrl = (process.env.NEXT_PUBLIC_CDN_URL ?? '').replace(/\/+$/, '');

export const config = {
  /** Base URL uploaded images are served from. Empty until R2's public URL is set. */
  cdnUrl,
  sentry: {
    dsn: sentryDsn,
    /** With no DSN configured, Sentry.init becomes a no-op. */
    enabled: sentryDsn.length > 0,
    environment: sentryEnvironment,
    /** Performance tracing: full locally, 10% in production. Session Replay is off. */
    tracesSampleRate: sentryEnvironment === 'production' ? 0.1 : 1,
  },
} as const;
