// Sentry browser SDK — injected into the client bundle by withSentryConfig.
import * as Sentry from '@sentry/nextjs';

import { config } from './lib/config';

Sentry.init({
  dsn: config.sentry.dsn,
  enabled: config.sentry.enabled,
  environment: config.sentry.environment,
  tracesSampleRate: config.sentry.tracesSampleRate,
  // Session Replay is intentionally disabled — revisit once the store has traffic.
});
