/**
 * Visitor consent for analytics cookies.
 *
 * The choice lives in localStorage on the visitor's own device — it is a
 * per-browser preference, not something the server needs to know. Storage
 * can be unavailable (private mode, blocked site data), so every access is
 * guarded and an unreadable choice is treated as "not yet asked".
 */

export type ConsentChoice = 'granted' | 'denied';

const STORAGE_KEY = 'dh-analytics-consent';

/** Fired on window when the footer asks to reopen the banner. */
export const CONSENT_REOPEN_EVENT = 'dh:consent-reopen';

export function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[consent] storage unreadable; treating as unanswered', error);
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch (error) {
    // The choice still applies for this page view; it just won't persist.
    // eslint-disable-next-line no-console
    console.warn('[consent] storage unwritable; choice applies to this visit only', error);
  }
}
