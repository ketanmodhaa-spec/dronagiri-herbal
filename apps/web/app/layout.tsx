import type { Metadata, Viewport } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';

import { JsonLd } from '@/components/seo/json-ld';
import { organizationJsonLd } from '@/lib/seo/json-ld';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SITE_TAGLINE } from '@/lib/seo/site';

import './globals.css';

/* Display face — headings, hero. Italic is used for the brand-story pull-quote. */
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

/* Body face — running text, UI, buttons. */
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Sitewide defaults — per-page Metadata exports override these where useful.
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  // Allow indexing site-wide; per-page metadata can override (e.g. drafts).
  robots: { index: true, follow: true },
  // Disambiguates the country/language pair for international SERPs.
  alternates: { languages: { 'en-IN': SITE_URL } },
  // Verification keys land here when search consoles are wired up.
  verification: {},
};

/* Brand colour for the mobile-browser chrome bar. */
export const viewport: Viewport = {
  themeColor: '#1F5C3A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${playfairDisplay.variable} ${dmSans.variable}`}>
        {/* Organization JSON-LD on every page — Google re-asserts the publisher
            from any URL it lands on, not just the homepage. */}
        <JsonLd data={organizationJsonLd()} />
        {children}
      </body>
    </html>
  );
}
