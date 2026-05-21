// Sentry SDK for the Edge runtime — loaded by instrumentation.ts on edge.
import * as Sentry from '@sentry/nextjs';

import { config } from './lib/config';

Sentry.init({
  dsn: config.sentry.dsn,
  enabled: config.sentry.enabled,
  environment: config.sentry.environment,
  tracesSampleRate: config.sentry.tracesSampleRate,
});
