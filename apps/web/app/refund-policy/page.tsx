import type { Metadata } from 'next';

import { LegalPage } from '@/components/shop/legal-page';
import { loadLegal } from '@/lib/content/legal';
import { absoluteUrl } from '@/lib/seo/site';

const content = loadLegal('refund-policy');
const lastUpdated = '23 May 2026';
const draft = false;

export const metadata: Metadata = {
  title: 'Refund & Return Policy',
  description:
    'When and how you can return a Dronagiri Herbal product, and how refunds are processed.',
  alternates: { canonical: absoluteUrl('/refund-policy') },
  robots: draft ? { index: false, follow: true } : { index: true, follow: true },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Return Policy"
      lastUpdated={lastUpdated}
      content={content}
      draft={draft}
    />
  );
}
