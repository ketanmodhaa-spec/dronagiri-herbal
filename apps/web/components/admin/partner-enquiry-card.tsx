'use client';

import { useState } from 'react';

import {
  PARTNER_ENQUIRY_STATUSES,
  type PartnerEnquiryStatus,
} from '@dronagiri/validators';

import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { TextareaField } from '@/components/ui/textarea-field';
import { PARTNER_STATUS_LABEL } from '@/lib/partners/partner-labels';

/** Everything the card shows — pre-formatted on the server. */
export interface PartnerEnquiryCardData {
  id: string;
  typeLabel: string;
  name: string;
  phone: string;
  email: string | null;
  businessName: string | null;
  location: string;
  gstin: string | null;
  backgroundLabel: string | null;
  investmentLabel: string | null;
  message: string | null;
  receivedAt: string;
  status: PartnerEnquiryStatus;
  internalNote: string | null;
}

/**
 * One lead in Sarita's list: contact it in one tap (call / WhatsApp), then
 * record where it stands and any notes.
 */
export function PartnerEnquiryCard({ enquiry }: { enquiry: PartnerEnquiryCardData }) {
  const [status, setStatus] = useState(enquiry.status);
  const [note, setNote] = useState(enquiry.internalNote ?? '');
  const [saved, setSaved] = useState({ status: enquiry.status, note: enquiry.internalNote ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = status !== saved.status || note !== saved.note;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/partner-enquiries/${enquiry.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, internalNote: note }),
      });
      if (response.ok) {
        setSaved({ status, note });
      } else {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(payload?.error?.message ?? 'Could not save. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setSaving(false);
  }

  return (
    <article className="rounded-2xl border border-forest-100 bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-medium text-forest-800">
            {enquiry.typeLabel}
          </span>
          <h2 className="mt-2 font-display text-lg font-semibold text-forest-900">{enquiry.name}</h2>
          {enquiry.businessName && <p className="text-sm text-stone">{enquiry.businessName}</p>}
          <p className="text-sm text-stone">{enquiry.location}</p>
        </div>
        <p className="text-xs text-stone">{enquiry.receivedAt}</p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button href={`tel:+91${enquiry.phone}`} size="sm">
          Call +91 {enquiry.phone}
        </Button>
        <Button href={`https://wa.me/91${enquiry.phone}`} size="sm" variant="secondary">
          WhatsApp
        </Button>
        {enquiry.email && (
          <Button href={`mailto:${enquiry.email}`} size="sm" variant="ghost">
            Email
          </Button>
        )}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {enquiry.backgroundLabel && (
          <div>
            <dt className="inline text-stone">Current business: </dt>
            <dd className="inline text-forest-900">{enquiry.backgroundLabel}</dd>
          </div>
        )}
        {enquiry.investmentLabel && (
          <div>
            <dt className="inline text-stone">Investment: </dt>
            <dd className="inline text-forest-900">{enquiry.investmentLabel}</dd>
          </div>
        )}
        {enquiry.gstin && (
          <div>
            <dt className="inline text-stone">GSTIN: </dt>
            <dd className="inline font-mono text-forest-900">{enquiry.gstin}</dd>
          </div>
        )}
        {enquiry.email && (
          <div>
            <dt className="inline text-stone">Email: </dt>
            <dd className="inline break-all text-forest-900">{enquiry.email}</dd>
          </div>
        )}
      </dl>

      {enquiry.message && (
        <p className="mt-3 whitespace-pre-line rounded-lg bg-forest-50 p-3 text-sm text-forest-900">
          {enquiry.message}
        </p>
      )}

      <div className="mt-4 grid gap-3 border-t border-forest-100 pt-4 sm:grid-cols-[180px_1fr]">
        <SelectField
          label="Status"
          name={`status-${enquiry.id}`}
          value={status}
          onChange={(event) => setStatus(event.target.value as PartnerEnquiryStatus)}
          disabled={saving}
        >
          {PARTNER_ENQUIRY_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PARTNER_STATUS_LABEL[value]}
            </option>
          ))}
        </SelectField>
        <TextareaField
          label="Your notes (private)"
          name={`note-${enquiry.id}`}
          rows={2}
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={saving}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {dirty && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </article>
  );
}
