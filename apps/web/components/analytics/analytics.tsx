'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import {
  CONSENT_REOPEN_EVENT,
  type ConsentChoice,
  readConsent,
  writeConsent,
} from '@/lib/analytics/consent';
import { GA_MEASUREMENT_ID, prepareAnalytics } from '@/lib/analytics/gtag';

/**
 * Cookie-consent banner + consent-gated Google Analytics.
 *
 * Nothing is requested from Google until the visitor taps Accept: gtag.js is
 * not even downloaded before then. Declining is as easy as accepting and is
 * remembered just the same. The admin panel is never tracked and never shows
 * the banner.
 */
export function Analytics() {
  const pathname = usePathname();
  // `undefined` until mounted — the stored choice is only readable in the
  // browser, and rendering nothing on the server avoids a banner flash.
  const [choice, setChoice] = useState<ConsentChoice | null | undefined>(undefined);
  const [loadGa, setLoadGa] = useState(false);

  useEffect(() => {
    setChoice(readConsent());
    const reopen = () => setChoice(null);
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
  }, []);

  useEffect(() => {
    // Once loaded, gtag.js stays for the rest of the visit; withdrawing
    // consent takes full effect from the next page load.
    if (choice === 'granted' && prepareAnalytics()) setLoadGa(true);
  }, [choice]);

  if (pathname.startsWith('/admin')) return null;

  const decide = (next: ConsentChoice) => {
    writeConsent(next);
    setChoice(next);
  };

  return (
    <>
      {loadGa && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
      )}

      {choice === null && (
        <div
          role="region"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-forest-100 bg-white shadow-[0_-8px_24px_rgba(26,61,43,0.08)]"
        >
          <Container className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-stone">
              We use Google Analytics cookies to understand how our site is used. No
              advertising cookies.{' '}
              <Link href="/privacy" className="font-medium text-forest-800 underline">
                Privacy Policy
              </Link>
            </p>
            <div className="flex shrink-0 gap-3">
              <Button variant="secondary" size="sm" onClick={() => decide('denied')}>
                Decline
              </Button>
              <Button size="sm" onClick={() => decide('granted')}>
                Accept
              </Button>
            </div>
          </Container>
        </div>
      )}
    </>
  );
}
