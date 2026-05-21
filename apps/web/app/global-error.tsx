'use client';

// App Router global error boundary — the last line of defence. It reports the
// failure to Sentry, then renders a minimal standalone page; because it
// replaces the root layout, it must provide its own <html> and <body>.
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred. Please refresh the page or try again shortly.</p>
      </body>
    </html>
  );
}
