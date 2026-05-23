import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The shared @dronagiri/db package ships TypeScript source — Next must
  // compile it rather than treat it as a pre-built node_modules dependency.
  transpilePackages: ['@dronagiri/db'],
  images: {
    // Product photography lives on R2 behind our own CDN domain — whitelist
    // it so next/image can optimise the assets. Anything not in this list
    // is refused at request time (we never want to proxy arbitrary URLs).
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.dronagiriherbal.in' },
    ],
  },
  experimental: {
    // Required on Next.js 14 so instrumentation.ts runs (becomes default in Next 15).
    instrumentationHook: true,
    // Prisma's query engine is a native binary — keep the client out of the
    // server bundle so it loads from disk at runtime.
    serverComponentsExternalPackages: ['@prisma/client'],
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
