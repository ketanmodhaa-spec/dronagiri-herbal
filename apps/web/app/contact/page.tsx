import type { Metadata } from 'next';

import { LegalPage } from '@/components/shop/legal-page';
import { loadLegal } from '@/lib/content/legal';
import { absoluteUrl } from '@/lib/seo/site';

const content = loadLegal('contact');
const lastUpdated = '23 May 2026';
const draft = false;

export const metadata: Metadata = {
  title: 'Contact & Grievance Redressal',
  description: 'How to reach Dronagiri Herbal — and how customer complaints are handled.',
  alternates: { canonical: absoluteUrl('/contact') },
  robots: draft ? { index: false, follow: true } : { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact & Grievance Redressal"
      lastUpdated={lastUpdated}
      content={content}
      draft={draft}
    />
  );
}
