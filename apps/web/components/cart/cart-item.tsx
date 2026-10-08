'use client';

import type { CartLineView } from '@dronagiri/types';
import Image from 'next/image';
import Link from 'next/link';

import { limitMessage } from '@/components/cart/cart-copy';
import { useCart } from '@/components/cart/cart-provider';
import { LeafIcon } from '@/components/ui/icons';
import { QtySelector, type QtyChangeSource } from '@/components/ui/qty-selector';
import { useToast } from '@/components/ui/toast';
import { formatPrice } from '@/lib/format';

/**
 * How long a quantity edit waits before it is sent. A − / + tap waits for the
 * customer to stop tapping (bot-protection layer 1); typing waits for a pause
 * between keystrokes; leaving the box sends at once.
 */
const WRITE_DELAY_MS: Record<QtyChangeSource, number> = {
  step: 300,
  type: 400,
  commit: 0,
};

/** One line in the cart drawer. */
export function CartItem({ line }: { line: CartLineView }) {
  const { displayQuantity, setQuantity, removeItem, closeDrawer } = useCart();
  const showToast = useToast();
  const quantity = displayQuantity(line.productId);
  const outOfStock = line.status === 'OUT_OF_STOCK';

  return (
    <li className="flex gap-4 py-5">
      <Link
        href={`/products/${line.slug}`}
        onClick={closeDrawer}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-forest-100 to-forest-200"
      >
        {line.image ? (
          <Image
            src={line.image.url}
            alt={line.image.alt ?? line.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <LeafIcon className="absolute inset-0 m-auto h-8 w-8 text-forest-600" />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/products/${line.slug}`}
              onClick={closeDrawer}
              className="font-medium text-forest-900 hover:text-forest-700"
            >
              {line.name}
            </Link>
            {line.sizeLabel && <p className="text-xs text-stone-light">{line.sizeLabel}</p>}
          </div>
          <p className="shrink-0 font-medium text-forest-900">{formatPrice(line.lineTotalPaise)}</p>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-stone">{formatPrice(line.unitPricePaise)} each</span>
          {line.priceChanged && (
            <>
              <span className="text-stone-light line-through">
                {formatPrice(line.priceSnapshotForBadgeOnly)}
              </span>
              <span className="rounded-full bg-gold-light px-2 py-0.5 text-xs font-medium text-gold-dark">
                Price updated
              </span>
            </>
          )}
        </div>

        {outOfStock && (
          <p className="mt-2 text-sm font-medium text-red-700">
            Out of stock — remove it to continue.
          </p>
        )}
        {line.status === 'EXCEEDS_STOCK' && (
          <p className="mt-2 text-sm font-medium text-amber-800">
            Only {line.maxQuantity} left — please reduce the quantity.
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          {outOfStock ? (
            <span />
          ) : (
            <QtySelector
              value={quantity}
              max={line.maxQuantity}
              label={`Quantity of ${line.name}`}
              onChange={(next, source) => setQuantity(line.productId, next, WRITE_DELAY_MS[source])}
              onLimit={() => showToast(limitMessage(line.maxQuantity, line.limitedBy))}
            />
          )}
          <button
            type="button"
            onClick={() => void removeItem(line.productId)}
            className="min-h-11 rounded-full px-3 text-sm text-stone underline underline-offset-2 hover:text-forest-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
          >
            Remove<span className="sr-only"> {line.name}</span>
          </button>
        </div>
      </div>
    </li>
  );
}
