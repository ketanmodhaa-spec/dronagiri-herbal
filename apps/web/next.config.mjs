import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required on Next.js 14 so instrumentation.ts runs (becomes default in Next 15).
  experimental: {
    instrumentationHook: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: 'dronagiriherbalin',
  project: 'javascript-nextjs',
  // Build-time only. Undefined until SENTRY_AUTH_TOKEN is added to Doppler —
  // source-map upload is then skipped; runtime error monitoring is unaffected.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Route Sentry traffic through our own domain so ad-blockers don't drop errors.
  tunnelRoute: '/monitoring',
});
