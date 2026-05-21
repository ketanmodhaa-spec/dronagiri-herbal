// Sentry Node.js SDK — loaded by instrumentation.ts on the Node runtime.
import * as Sentry from '@sentry/nextjs';

import { config } from './lib/config';

Sentry.init({
  dsn: config.sentry.dsn,
  enabled: config.sentry.enabled,
  environment: config.sentry.environment,
  tracesSampleRate: config.sentry.tracesSampleRate,
});
