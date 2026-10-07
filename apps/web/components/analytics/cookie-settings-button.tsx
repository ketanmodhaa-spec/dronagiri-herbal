'use client';

import { CONSENT_REOPEN_EVENT } from '@/lib/analytics/consent';

/** Footer control that reopens the consent banner so a visitor can change their mind. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT))}
    >
      Cookie Settings
    </button>
  );
}
