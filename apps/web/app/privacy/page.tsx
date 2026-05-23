import type { Metadata } from 'next';

import { LegalPage } from '@/components/shop/legal-page';
import { loadLegal } from '@/lib/content/legal';

const content = loadLegal('privacy');
const lastUpdated = '23 May 2026';
const draft = true;

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Dronagiri Herbal collects, uses and protects your personal data — under the IT Act and the DPDP Act.',
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
