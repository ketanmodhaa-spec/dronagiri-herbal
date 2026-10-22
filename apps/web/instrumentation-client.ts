// Sentry browser SDK — Next.js loads this file in the browser before the app starts.
import * as Sentry from '@sentry/nextjs';

import { config } from './lib/config';

Sentry.init({
  dsn: config.sentry.dsn,
  enabled: config.sentry.enabled,
  environment: config.sentry.environment,
  tracesSampleRate: config.sentry.tracesSampleRate,
  // Errors thrown by visitors' browser extensions are not ours to fix.
  denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-(web-)?extension:\/\//],
  // A failed FontFace.load() rejects with this exact DOMException. Our fonts are
  // self-hosted CSS (next/font) and never call FontFace, so it only comes from
  // extensions or bots probing fonts — and it carries no stack for denyUrls to match.
  ignoreErrors: [/^NetworkError: A network error occurred\.$/],
  // Session Replay is intentionally disabled — revisit once the store has traffic.
});

// Lets Sentry time client-side navigations between pages.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
