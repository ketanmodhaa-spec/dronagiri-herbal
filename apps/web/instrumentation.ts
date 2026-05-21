// Next.js instrumentation hook — boots the Sentry SDK for the active runtime.
// Enabled via experimental.instrumentationHook in next.config.mjs (Next 14).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
