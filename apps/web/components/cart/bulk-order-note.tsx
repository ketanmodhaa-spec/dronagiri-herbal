/**
 * Shown when a customer reaches the per-product cap: bulk buyers are welcome,
 * they just order through Sarita (pricing, stock and shipping are arranged
 * by hand). Links to her own WhatsApp — the shop's API number is not read by
 * a person — and to the distributor page for resellers.
 */
import Link from 'next/link';

import { MAX_LINE_QUANTITY } from '@dronagiri/validators';

import { cn } from '@/lib/cn';

const SARITA_WHATSAPP = '919429029840';

export function BulkOrderNote({ productName, className }: { productName: string; className?: string }) {
  const message = `Namaste! I'd like more than ${MAX_LINE_QUANTITY} of ${productName}. Could you share bulk pricing?`;
  return (
    <p className={cn('text-sm text-stone', className)}>
      Need more than {MAX_LINE_QUANTITY}?{' '}
      <a
        href={`https://wa.me/${SARITA_WHATSAPP}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-forest-800 underline underline-offset-2"
      >
        Ask about bulk pricing
      </a>{' '}
      or{' '}
      <Link href="/become-a-distributor" className="font-medium text-forest-800 underline underline-offset-2">
        become a distributor
      </Link>
      .
    </p>
  );
}
