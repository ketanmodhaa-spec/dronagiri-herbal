'use client';

import { useEffect, useState } from 'react';

import { limitMessage } from '@/components/cart/cart-copy';
import { useCart } from '@/components/cart/cart-provider';
import { Button } from '@/components/ui/button';
import { QtySelector } from '@/components/ui/qty-selector';
import { useToast } from '@/components/ui/toast';

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  /** Stock as rendered on the page. The server re-checks it on add. */
  stockQty: number;
  /** The per-line cap (`MAX_LINE_QUANTITY`), passed down from the server. */
  maxPerLine: number;
}

/**
 * Quantity selector + Add to cart, for the product page.
 *
 * The selector tops out at what can still be added: min(per-line cap, stock)
 * minus what is already in the cart. − / + only change the number on screen;
 * nothing is sent until Add is pressed, and Add is disabled while its request
 * is in flight.
 */
export function AddToCartButton({ productId, productName, stockQty, maxPerLine }: AddToCartButtonProps) {
  const { displayQuantity, addItem, openDrawer } = useCart();
  const showToast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const lineLimit = Math.min(maxPerLine, stockQty);
  const limitedBy = stockQty < maxPerLine ? 'STOCK' : 'MAX_PER_LINE';
  const inCart = displayQuantity(productId);
  const addable = Math.max(0, lineLimit - inCart);

  // Keep the selection within what can still be added as the cart changes.
  useEffect(() => {
    if (addable >= 1 && quantity > addable) setQuantity(addable);
  }, [addable, quantity]);

  if (stockQty <= 0) {
    return (
      <Button size="lg" disabled>
        Out of stock
      </Button>
    );
  }

  if (addable === 0) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button size="lg" variant="secondary" onClick={openDrawer}>
          View cart
        </Button>
        <span className="text-sm text-stone">
          {limitMessage(lineLimit, limitedBy)} — you have {inCart} in your cart.
        </span>
      </div>
    );
  }

  async function handleAdd() {
    setAdding(true);
    const added = await addItem(productId, quantity);
    setAdding(false);
    if (added) setQuantity(1);
  }

  function handleLimit() {
    const message = limitMessage(lineLimit, limitedBy);
    showToast(inCart > 0 ? `${message} — ${inCart} already in your cart` : message);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <QtySelector
        value={quantity}
        max={addable}
        label={`Quantity of ${productName}`}
        onChange={(next) => setQuantity(next)}
        onLimit={handleLimit}
        disabled={adding}
      />
      <Button size="lg" onClick={() => void handleAdd()} disabled={adding}>
        {adding ? 'Adding…' : 'Add to cart'}
      </Button>
    </div>
  );
}
