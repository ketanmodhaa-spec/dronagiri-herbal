import type { Metadata } from 'next';

import { LegalPage } from '@/components/shop/legal-page';
import { loadLegal } from '@/lib/content/legal';

const content = loadLegal('terms');
const lastUpdated = '23 May 2026';
/** Flip to `false` once the lawyer has signed off and the [CONFIRM] items are filled in. */
const draft = true;

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'The terms governing your use of dronagiriherbal.in and purchases from Dronagiri Herbal.',
  robots: draft ? { index: false, follow: true } : { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      lastUpdated={lastUpdated}
      content={content}
      draft={draft}
    />
  );
}
