'use client';

/**
 * Send an unpaid order's payment link — open WhatsApp with a ready-written
 * message, or copy the link. The link is stable: resend it any time until
 * the order is paid or lapses.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';

interface PayLinkPanelProps {
  url: string;
  /** 10-digit Indian mobile from the order. */
  phone: string;
  firstName: string;
  orderNumber: string;
  /** Already formatted, e.g. "₹548". */
  total: string;
}

export function PayLinkPanel({ url, phone, firstName, orderNumber, total }: PayLinkPanelProps) {
  const [copied, setCopied] = useState(false);

  const message =
    `Namaste ${firstName}! 🌿 Your Dronagiri Herbal order ${orderNumber} is ready. ` +
    `Total ${total}. Pay securely by UPI or card here: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-gold bg-gold-light/30 p-4">
      <p className="text-sm font-semibold text-forest-900">Waiting for payment — send the link</p>
      <p className="text-sm text-forest-900">
        The customer pays {total} on dronagiriherbal.in. The order confirms itself when the money
        arrives, then moves to “To pack”. Unpaid orders lapse after 24 hours.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button href={`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`} size="sm">
          Send pay link on WhatsApp
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void copy()}>
          {copied ? 'Link copied' : 'Copy pay link'}
        </Button>
      </div>
      <p className="break-all text-xs text-stone">{url}</p>
    </section>
  );
}
