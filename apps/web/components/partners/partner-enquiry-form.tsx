'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import {
  INDIAN_STATES,
  PARTNER_BACKGROUNDS,
  PARTNER_INVESTMENTS,
  PARTNER_TYPES,
  type PartnerType,
} from '@dronagiri/validators';

import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { CheckIcon } from '@/components/ui/icons';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { TextareaField } from '@/components/ui/textarea-field';
import { cn } from '@/lib/cn';
import {
  PARTNER_BACKGROUND_LABEL,
  PARTNER_INVESTMENT_LABEL,
  PARTNER_TYPE_COPY,
} from '@/lib/partners/partner-labels';

type FieldName =
  | 'name'
  | 'phone'
  | 'email'
  | 'businessName'
  | 'city'
  | 'stateCode'
  | 'pincode'
  | 'gstin'
  | 'background'
  | 'investment'
  | 'message'
  | 'website';

const EMPTY_FIELDS: Record<FieldName, string> = {
  name: '',
  phone: '',
  email: '',
  businessName: '',
  city: '',
  stateCode: '',
  pincode: '',
  gstin: '',
  background: '',
  investment: '',
  message: '',
  website: '',
};

/**
 * The "become a distributor / dealer" form. Only partner type, name, phone,
 * city, state and consent are required — a short form gets more real leads.
 * The server re-validates everything; this component only collects.
 */
export function PartnerEnquiryForm() {
  const [partnerType, setPartnerType] = useState<PartnerType | null>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function setField(name: FieldName, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!partnerType) {
      setError('Choose how you would like to partner with us.');
      return;
    }
    setSubmitting(true);

    try {
      const response = await fetch('/api/partner-enquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...fields, partnerType, consent }),
      });
      if (response.ok) {
        setSubmitted(true);
        return;
      }
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      setError(payload?.error?.message ?? 'Could not send your enquiry. Please try again.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div role="status" className="rounded-2xl border border-forest-100 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-800 text-forest-50">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h3 className="mt-4 font-display text-2xl font-semibold text-forest-900">
          Thank you, {fields.name.split(' ')[0]}!
        </h3>
        <p className="mx-auto mt-2 max-w-md text-stone">
          We have received your enquiry. Sarita or our team will call or WhatsApp you on{' '}
          <span className="font-medium text-forest-900">+91 {fields.phone}</span> to talk about
          your area.
        </p>
        <p className="mt-4 text-sm text-stone">
          Want to talk sooner? WhatsApp us on{' '}
          <a
            href="https://wa.me/919429029840"
            className="font-medium text-forest-700 underline underline-offset-2 hover:text-forest-800"
          >
            +91 94290 29840
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="relative space-y-6 rounded-2xl border border-forest-100 bg-white p-5 shadow-sm sm:p-8"
    >
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-forest-900">
          I would like to become a… <span className="text-red-700">*</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {PARTNER_TYPES.map((type) => {
            const selected = partnerType === type;
            return (
              <label
                key={type}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                  selected
                    ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700'
                    : 'border-forest-200 hover:border-forest-400',
                )}
              >
                <input
                  type="radio"
                  name="partnerType"
                  value={type}
                  checked={selected}
                  onChange={() => setPartnerType(type)}
                  disabled={submitting}
                  className="mt-1 h-4 w-4 text-forest-800 focus:ring-forest-600/30"
                />
                <span>
                  <span className="block font-medium text-forest-900">
                    {PARTNER_TYPE_COPY[type].label}
                  </span>
                  <span className="mt-0.5 block text-xs text-stone">
                    {PARTNER_TYPE_COPY[type].description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Your name *"
          name="name"
          autoComplete="name"
          required
          value={fields.name}
          onChange={(event) => setField('name', event.target.value)}
          disabled={submitting}
        />
        <TextField
          label="Mobile number *"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          placeholder="10-digit mobile"
          hint="We will call or WhatsApp you on this number."
          required
          value={fields.phone}
          onChange={(event) => setField('phone', event.target.value.replace(/\D/g, ''))}
          disabled={submitting}
        />
        <TextField
          label="City / town *"
          name="city"
          autoComplete="address-level2"
          required
          value={fields.city}
          onChange={(event) => setField('city', event.target.value)}
          disabled={submitting}
        />
        <SelectField
          label="State *"
          name="stateCode"
          required
          value={fields.stateCode}
          onChange={(event) => setField('stateCode', event.target.value)}
          disabled={submitting}
        >
          <option value="">Choose your state</option>
          {INDIAN_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="PIN code"
          name="pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={fields.pincode}
          onChange={(event) => setField('pincode', event.target.value.replace(/\D/g, ''))}
          disabled={submitting}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={fields.email}
          onChange={(event) => setField('email', event.target.value)}
          disabled={submitting}
        />
        <TextField
          label="Business / shop name"
          name="businessName"
          autoComplete="organization"
          value={fields.businessName}
          onChange={(event) => setField('businessName', event.target.value)}
          disabled={submitting}
        />
        <TextField
          label="GSTIN"
          name="gstin"
          maxLength={15}
          hint="If your business is GST-registered."
          value={fields.gstin}
          onChange={(event) => setField('gstin', event.target.value.toUpperCase())}
          disabled={submitting}
        />
        <SelectField
          label="Your current business"
          name="background"
          value={fields.background}
          onChange={(event) => setField('background', event.target.value)}
          disabled={submitting}
        >
          <option value="">Choose one</option>
          {PARTNER_BACKGROUNDS.map((background) => (
            <option key={background} value={background}>
              {PARTNER_BACKGROUND_LABEL[background]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Investment you can plan"
          name="investment"
          value={fields.investment}
          onChange={(event) => setField('investment', event.target.value)}
          disabled={submitting}
        >
          <option value="">Prefer to discuss</option>
          {PARTNER_INVESTMENTS.map((investment) => (
            <option key={investment} value={investment}>
              {PARTNER_INVESTMENT_LABEL[investment]}
            </option>
          ))}
        </SelectField>
      </div>

      <TextareaField
        label="Anything you would like us to know"
        name="message"
        rows={3}
        maxLength={1000}
        placeholder="e.g. the area you cover, shops you already supply, questions about margins"
        value={fields.message}
        onChange={(event) => setField('message', event.target.value)}
        disabled={submitting}
      />

      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={fields.website}
            onChange={(event) => setField('website', event.target.value)}
          />
        </label>
      </div>

      <CheckboxField
        name="consent"
        label="I agree that Dronagiri Herbal may call, WhatsApp or email me about this enquiry. *"
        checked={consent}
        onChange={(event) => setConsent(event.target.checked)}
        disabled={submitting}
      />
      <p className="-mt-3 pl-6 text-xs text-stone">
        We use these details only to respond to your enquiry. See our{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-forest-800">
          Privacy Policy
        </Link>
        .
      </p>

      {/* Greyed out until consent is ticked; the server still enforces consent. */}
      <Button type="submit" size="lg" disabled={submitting || !consent} className="w-full sm:w-auto">
        {submitting ? 'Sending…' : 'Send enquiry'}
      </Button>
    </form>
  );
}
