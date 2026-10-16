// Sentry browser SDK — Next.js loads this file in the browser before the app starts.
import * as Sentry from '@sentry/nextjs';

import { config } from './lib/config';

Sentry.init({
  dsn: config.sentry.dsn,
  enabled: config.sentry.enabled,
  environment: config.sentry.environment,
  tracesSampleRate: config.sentry.tracesSampleRate,
  // Session Replay is intentionally disabled — revisit once the store has traffic.
});

// Lets Sentry time client-side navigations between pages.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
