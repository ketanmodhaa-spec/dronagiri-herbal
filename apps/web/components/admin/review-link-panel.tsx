'use client';

/**
 * Ask a delivered order's buyer for a review — copy their personal link, or
 * open WhatsApp with a ready-written message. Until review requests go out
 * automatically (Meta templates), Sarita sends it with one tap.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';

interface ReviewLinkPanelProps {
  url: string;
  /** 10-digit Indian mobile from the order. */
  phone: string;
  firstName: string;
  reviewCount: number;
  productCount: number;
}

export function ReviewLinkPanel({ url, phone, firstName, reviewCount, productCount }: ReviewLinkPanelProps) {
  const [copied, setCopied] = useState(false);

  const message =
    `Namaste ${firstName}! 🌿 Thank you for your order from Dronagiri Herbal. ` +
    `We would love to hear how you like it — good or bad. It takes a minute: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-forest-900">
        {reviewCount === 0
          ? 'No review yet.'
          : `${reviewCount} of ${productCount} product${productCount === 1 ? '' : 's'} reviewed.`}{' '}
        The link works for 180 days and only for this order.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button href={`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`} size="sm">
          Ask for a review on WhatsApp
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void copy()}>
          {copied ? 'Link copied' : 'Copy review link'}
        </Button>
      </div>
    </div>
  );
}
