import type { Metadata } from 'next';

import { LegalPage } from '@/components/shop/legal-page';
import { loadLegal } from '@/lib/content/legal';
import { absoluteUrl } from '@/lib/seo/site';

const content = loadLegal('privacy');
const lastUpdated = '23 May 2026';
const draft = false;

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Dronagiri Herbal collects, uses and protects your personal data — under the IT Act and the DPDP Act.',
  alternates: { canonical: absoluteUrl('/privacy') },
  robots: draft ? { index: false, follow: true } : { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={lastUpdated}
      content={content}
      draft={draft}
    />
  );
}
