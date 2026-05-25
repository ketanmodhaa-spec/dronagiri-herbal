import type { Metadata } from 'next';

import { LegalPage } from '@/components/shop/legal-page';
import { loadLegal } from '@/lib/content/legal';
import { absoluteUrl } from '@/lib/seo/site';

const content = loadLegal('data-deletion');
const lastUpdated = '25 May 2026';
const draft = false;

export const metadata: Metadata = {
  title: 'Data Deletion Request',
  description:
    'How to ask Dronagiri Herbal to delete your personal data, what we delete, ' +
    'and what we are required to keep under Indian tax law.',
  alternates: { canonical: absoluteUrl('/data-deletion') },
  robots: draft ? { index: false, follow: true } : { index: true, follow: true },
};

export default function DataDeletionPage() {
  return (
    <LegalPage
      title="Data Deletion Request"
      lastUpdated={lastUpdated}
      content={content}
      draft={draft}
    />
  );
}
