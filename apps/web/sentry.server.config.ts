// Sentry Node.js SDK — loaded by instrumentation.ts on the Node runtime.
import * as Sentry from '@sentry/nextjs';

import { config } from './lib/config';

Sentry.init({
  dsn: config.sentry.dsn,
  enabled: config.sentry.enabled,
  environment: config.sentry.environment,
  tracesSampleRate: config.sentry.tracesSampleRate,
  // Route handlers and webhooks catch their own errors and log them with
  // console.error, so they never reach Sentry as uncaught exceptions. Forward
  // every console.error instead — one switch that covers all of them.
  integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
});
