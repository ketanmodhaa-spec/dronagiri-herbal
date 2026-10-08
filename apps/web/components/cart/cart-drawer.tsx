'use client';

import Link from 'next/link';
import { useEffect, useRef, type KeyboardEvent } from 'react';

import { CartItem } from '@/components/cart/cart-item';
import { useCart } from '@/components/cart/cart-provider';
import { FreeShippingBar } from '@/components/cart/free-shipping-bar';
import { Button } from '@/components/ui/button';
import { CloseIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The cart, sliding in from the right — full width on phones. Opens on a
 * successful add and on the header cart icon.
 *
 * A modal dialog: Esc and the backdrop close it, Tab is held inside it, the
 * page behind does not scroll, and focus returns to whatever opened it. When
 * closed it stays mounted but `invisible`, so the slide can animate and the
 * panel is out of the tab order and the accessibility tree.
 */
export function CartDrawer() {
  const { cart, drawerOpen, closeDrawer } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusTo.current?.focus();
    };
  }, [drawerOpen]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const lines = cart?.lines ?? [];
  const itemCount = cart?.itemCount ?? 0;
  const removed = cart?.removedProductNames ?? [];

  return (
    <div
      className={cn(
        // Visibility flips on at once when opening, and off only after the slide-out ends.
        'fixed inset-0 z-[60] transition-[visibility] duration-300',
        drawerOpen ? 'visible' : 'invisible',
      )}
    >
      <div
        onClick={closeDrawer}
        className={cn(
          'absolute inset-0 bg-forest-900/40 transition-opacity duration-300',
          drawerOpen ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        onKeyDown={handleKeyDown}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col bg-cream shadow-2xl transition-transform duration-300 ease-out sm:max-w-md',
          drawerOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-forest-100 px-5 py-4">
          <h2 id="cart-drawer-title" className="font-display text-xl font-semibold text-forest-900">
            Your cart{itemCount > 0 && <span className="text-stone"> ({itemCount})</span>}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="flex h-11 w-11 items-center justify-center rounded-full text-forest-800 hover:bg-forest-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        {removed.length > 0 && (
          <p className="mx-5 mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {removed.join(', ')} {removed.length === 1 ? 'is' : 'are'} no longer available and{' '}
            {removed.length === 1 ? 'was' : 'were'} removed from your cart.
          </p>
        )}

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
            <p className="text-stone">Your cart is empty.</p>
            <Link
              href="/shop"
              onClick={closeDrawer}
              className="font-medium text-forest-700 underline underline-offset-2 hover:text-forest-800"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-forest-100 overflow-y-auto px-5">
              {lines.map((line) => (
                <CartItem key={line.productId} line={line} />
              ))}
            </ul>

            <footer className="space-y-4 border-t border-forest-100 bg-white px-5 py-5">
              {cart && <FreeShippingBar progress={cart.freeShipping} />}
              <div className="flex items-baseline justify-between">
                <span className="text-stone">Subtotal</span>
                <span className="font-display text-xl font-semibold text-forest-900">
                  {formatPrice(cart?.subtotalPaise ?? 0)}
                </span>
              </div>
              <Button size="lg" disabled className="w-full">
                Proceed to checkout
              </Button>
              <p className="text-center text-xs text-stone">
                Online checkout opens soon. To order now, message{' '}
                <a
                  href="https://wa.me/919429029840"
                  className="font-medium text-forest-700 underline underline-offset-2"
                >
                  +91 94290 29840
                </a>{' '}
                on WhatsApp.
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
