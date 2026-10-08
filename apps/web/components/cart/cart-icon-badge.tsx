'use client';

import { useCart } from '@/components/cart/cart-provider';
import { BagIcon } from '@/components/ui/icons';

/**
 * Header cart button with a live item count. The count stays hidden until the
 * first cart read lands, so it never flashes "0" for a returning shopper.
 */
export function CartIconBadge() {
  const { cart, openDrawer } = useCart();
  const count = cart?.itemCount ?? 0;
  const label =
    cart === null ? 'Cart' : `Cart, ${count} ${count === 1 ? 'item' : 'items'}`;

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={label}
      className="relative flex h-11 w-11 items-center justify-center rounded-full text-forest-800 transition-colors hover:bg-forest-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
    >
      <BagIcon className="h-6 w-6" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-semibold text-forest-900"
        >
          {count}
        </span>
      )}
    </button>
  );
}
