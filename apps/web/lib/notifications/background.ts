/**
 * Run a notification after the response has gone out (CLAUDE.md: fulfilment
 * never depends on a notification). On Vercel, `after` keeps the function
 * alive until the task finishes, so nothing is cut off mid-send.
 *
 * Outside a request — a script or a test — there is no response to wait for,
 * and the task simply runs now. Either way a failure is logged (and so reaches
 * Sentry), never thrown back into the order action that triggered it.
 */
import { after } from 'next/server';

export function runAfterResponse(label: string, task: () => Promise<void>): void {
  const guarded = (): Promise<void> =>
    task().catch((error: unknown) => {
      console.error(`[notify] ${label} failed`, error);
    });
  try {
    after(guarded);
  } catch (error) {
    // `after` throws outside a request scope; there is nothing to defer past.
    if (!(error instanceof Error)) throw error;
    void guarded();
  }
}
