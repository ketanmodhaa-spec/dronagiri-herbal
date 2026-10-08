import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { stateName, type IndianStateCode } from '@dronagiri/validators';

import {
  PartnerEnquiryCard,
  type PartnerEnquiryCardData,
} from '@/components/admin/partner-enquiry-card';
import { getAdminOrNull } from '@/lib/auth/require-admin';
import {
  PARTNER_BACKGROUND_LABEL,
  PARTNER_INVESTMENT_LABEL,
  PARTNER_TYPE_COPY,
} from '@/lib/partners/partner-labels';
import { listPartnerEnquiries } from '@/lib/partners/partner-enquiry-service';

export const metadata: Metadata = { title: 'Distributor enquiries' };
export const dynamic = 'force-dynamic';

const receivedFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export default async function AdminEnquiriesPage() {
  if (!(await getAdminOrNull())) {
    redirect('/admin/login');
  }
  const enquiries = await listPartnerEnquiries();

  const cards: PartnerEnquiryCardData[] = enquiries.map((enquiry) => ({
    id: enquiry.id,
    typeLabel: PARTNER_TYPE_COPY[enquiry.partnerType].label,
    name: enquiry.name,
    phone: enquiry.phone,
    email: enquiry.email,
    businessName: enquiry.businessName,
    // stateCode was validated against INDIAN_STATES when the enquiry was written.
    location: [
      enquiry.city,
      stateName(enquiry.stateCode as IndianStateCode),
      enquiry.pincode,
    ]
      .filter(Boolean)
      .join(', '),
    gstin: enquiry.gstin,
    backgroundLabel: enquiry.background ? PARTNER_BACKGROUND_LABEL[enquiry.background] : null,
    investmentLabel: enquiry.investment ? PARTNER_INVESTMENT_LABEL[enquiry.investment] : null,
    message: enquiry.message,
    receivedAt: receivedFormatter.format(enquiry.createdAt),
    status: enquiry.status,
    internalNote: enquiry.internalNote,
  }));

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header>
        <Link href="/admin" className="text-sm text-forest-700 hover:text-forest-800">
          ← Dashboard
        </Link>
        <h1 className="mt-1 font-display text-2xl font-semibold text-forest-900">
          Distributor enquiries
        </h1>
        <p className="mt-1 text-sm text-stone">
          From the &ldquo;Become a distributor&rdquo; form, newest first. Each new one is also emailed
          to store@dronagiriherbal.in.
        </p>
      </header>

      {cards.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-forest-100 bg-white p-6 text-sm text-stone">
          No enquiries yet. They will appear here as soon as someone fills in the form.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {cards.map((card) => (
            <PartnerEnquiryCard key={card.id} enquiry={card} />
          ))}
        </div>
      )}
    </main>
  );
}
