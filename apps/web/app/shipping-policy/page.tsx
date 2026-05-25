import type { Metadata } from 'next';

import { LegalPage } from '@/components/shop/legal-page';
import { loadLegal } from '@/lib/content/legal';
import { absoluteUrl } from '@/lib/seo/site';

const content = loadLegal('shipping-policy');
const lastUpdated = '23 May 2026';
const draft = false;

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'Where Dronagiri Herbal ships, how long it takes, and what it costs.',
  alternates: { canonical: absoluteUrl('/shipping-policy') },
  robots: draft ? { index: false, follow: true } : { index: true, follow: true },
};

export default function ShippingPolicyPage() {
  return (
    <LegalPage
      title="Shipping Policy"
      lastUpdated={lastUpdated}
      content={content}
      draft={draft}
    />
  );
}
