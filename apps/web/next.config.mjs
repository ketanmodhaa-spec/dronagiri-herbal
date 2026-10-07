import { withSentryConfig } from '@sentry/nextjs';

/**
 * Baseline security headers on every response. HSTS is already sent by
 * Vercel. The CSP deliberately leaves script/style sources open — it only
 * locks down framing, <base>, plugins and form targets, which need no nonce
 * plumbing and cannot break Next's inline bootstrap or GA.
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  // Legacy twin of frame-ancestors for browsers that predate CSP level 2.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/**
 * Addresses people (and payment-gateway reviewers) type by habit. Each points
 * at the real page with a permanent redirect so nobody lands on a 404.
 */
const aliasRedirects = [
  ['/privacy-policy', '/privacy'],
  ['/refund', '/refund-policy'],
  ['/refunds', '/refund-policy'],
  ['/return-policy', '/refund-policy'],
  ['/returns', '/refund-policy'],
  ['/cancellation-policy', '/refund-policy'],
  ['/shipping', '/shipping-policy'],
  ['/delivery-policy', '/shipping-policy'],
  ['/terms-and-conditions', '/terms'],
  ['/terms-of-service', '/terms'],
  ['/contact-us', '/contact'],
  ['/about-us', '/about'],
  ['/products', '/shop'],
].map(([source, destination]) => ({ source, destination, permanent: true }));

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return aliasRedirects;
  },
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
