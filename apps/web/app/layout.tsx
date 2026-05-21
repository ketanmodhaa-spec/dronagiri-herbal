import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';

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
  metadataBase: new URL('https://dronagiriherbal.in'),
  title: {
    default: 'Dronagiri Herbal — Sanjivani for Hair & Skin Care',
    template: '%s · Dronagiri Herbal',
  },
  description:
    'Handcrafted Ayurvedic hair and skin care from Ahmedabad. 100% natural, ' +
    'WHO-GMP certified, KVIC registered. Cash on delivery and free shipping across India.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${playfairDisplay.variable} ${dmSans.variable}`}>{children}</body>
    </html>
  );
}
