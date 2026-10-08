'use client';

import type { CartMutationResult, CartView } from '@dronagiri/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { clampedAddMessage, limitMessage } from '@/components/cart/cart-copy';
import { useToast } from '@/components/ui/toast';

/**
 * A cart read older than this is refreshed when the tab regains focus. Every
 * mutation already returns a fresh cart, so this only matters for a tab left
 * open. Display only — the server re-prices from the catalogue on every call.
 */
const STALE_AFTER_MS = 20_000;

type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

const NETWORK_ERROR_MESSAGE = 'Could not reach the server. Check your connection and try again.';

/** Call a cart endpoint and unwrap the `{ data } | { error }` envelope. */
async function cartRequest<T>(method: string, url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      cache: 'no-store',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await response.json().catch(() => null)) as
      | { data?: T; error?: { code?: string; message?: string } }
      | null;
    if (response.ok && json?.data !== undefined) {
      return { ok: true, data: json.data };
    }
    return {
      ok: false,
      code: json?.error?.code ?? 'UNKNOWN',
      message: json?.error?.message ?? 'Something went wrong. Please try again.',
    };
  } catch {
    return { ok: false, code: 'NETWORK', message: NETWORK_ERROR_MESSAGE };
  }
}

/** Per-line write queue: the latest requested quantity wins, one request in flight. */
interface LineQueue {
  timer: number | null;
  inFlight: boolean;
  pending: number | null;
}

interface CartContextValue {
  /** Null until the first read completes. */
  cart: CartView | null;
  /** The quantity to show for a line — an unsent edit wins over the server value. */
  displayQuantity: (productId: string) => number;
  /** Add units; opens the drawer on success. Resolves false when nothing was added. */
  addItem: (productId: string, quantity: number) => Promise<boolean>;
  /** Queue a quantity write for a line, sent after `delayMs` (0 = now). */
  setQuantity: (productId: string, quantity: number, delayMs: number) => void;
  removeItem: (productId: string) => Promise<void>;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const showToast = useToast();
  const [cart, setCart] = useState<CartView | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, number>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastFetchedAt = useRef(0);
  const queues = useRef(new Map<string, LineQueue>());
  // Responses can return out of order; a cart from an older request never
  // overwrites one from a newer request.
  const requestSeq = useRef(0);
  const appliedSeq = useRef(0);

  const nextSeq = useCallback((): number => {
    requestSeq.current += 1;
    return requestSeq.current;
  }, []);

  const refresh = useCallback(async () => {
    const seq = nextSeq();
    const result = await cartRequest<{ cart: CartView }>('GET', '/api/cart');
    if (result.ok && seq >= appliedSeq.current) {
      appliedSeq.current = seq;
      setCart(result.data.cart);
      lastFetchedAt.current = Date.now();
    }
  }, [nextSeq]);

  /**
   * Show the cart a mutation returned. If a newer response has already been
   * shown, this one is dropped and the cart re-read, since the server may
   * have applied the two writes in either order.
   */
  const applyCart = useCallback(
    (next: CartView, seq: number) => {
      if (seq < appliedSeq.current) {
        void refresh();
        return;
      }
      appliedSeq.current = seq;
      setCart(next);
      lastFetchedAt.current = Date.now();
    },
    [refresh],
  );

  const clearOptimistic = useCallback((productId: string) => {
    setOptimistic((current) => {
      if (!(productId in current)) return current;
      const { [productId]: _cleared, ...rest } = current;
      return rest;
    });
  }, []);

  // First read, then re-read on return to the tab when stale and no write is pending.
  useEffect(() => {
    void refresh();
    function handleReturn() {
      if (document.visibilityState !== 'visible') return;
      const writesPending = [...queues.current.values()].some(
        (queue) => queue.inFlight || queue.pending !== null,
      );
      if (!writesPending && Date.now() - lastFetchedAt.current > STALE_AFTER_MS) {
        void refresh();
      }
    }
    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleReturn);
    return () => {
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleReturn);
    };
  }, [refresh]);

  const queueFor = useCallback((productId: string): LineQueue => {
    let queue = queues.current.get(productId);
    if (!queue) {
      queue = { timer: null, inFlight: false, pending: null };
      queues.current.set(productId, queue);
    }
    return queue;
  }, []);

  const flush = useCallback(
    async (productId: string): Promise<void> => {
      const queue = queueFor(productId);
      queue.timer = null;
      // A request already in flight picks up the pending value when it returns.
      if (queue.inFlight || queue.pending === null) return;

      const quantity = queue.pending;
      queue.pending = null;
      queue.inFlight = true;
      const seq = nextSeq();
      const result = await cartRequest<CartMutationResult>(
        'PATCH',
        `/api/cart/items/${encodeURIComponent(productId)}`,
        { quantity },
      );
      queue.inFlight = false;

      // The line was removed while this write was in flight — its answer is stale.
      if (queues.current.get(productId) !== queue) return;

      if (result.ok) {
        applyCart(result.data.cart, seq);
        if (result.data.notice) {
          showToast(limitMessage(result.data.lineQuantity, result.data.notice));
        }
      } else {
        showToast(result.message);
        queue.pending = null;
        void refresh();
      }

      if (queue.pending !== null) {
        // A newer quantity arrived mid-flight; send it unless its own timer will.
        if (queue.timer === null) void flush(productId);
      } else {
        clearOptimistic(productId);
      }
    },
    [applyCart, clearOptimistic, nextSeq, queueFor, refresh, showToast],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number, delayMs: number) => {
      setOptimistic((current) => ({ ...current, [productId]: quantity }));
      const queue = queueFor(productId);
      queue.pending = quantity;
      if (queue.timer !== null) window.clearTimeout(queue.timer);
      if (delayMs <= 0) {
        void flush(productId);
      } else {
        queue.timer = window.setTimeout(() => void flush(productId), delayMs);
      }
    },
    [flush, queueFor],
  );

  const addItem = useCallback(
    async (productId: string, quantity: number): Promise<boolean> => {
      const seq = nextSeq();
      const result = await cartRequest<CartMutationResult>('POST', '/api/cart/items', {
        productId,
        quantity,
      });
      if (!result.ok) {
        showToast(result.message);
        return false;
      }
      applyCart(result.data.cart, seq);
      setDrawerOpen(true);
      if (result.data.notice) {
        showToast(clampedAddMessage(result.data.notice, result.data.lineQuantity, result.data.added));
      }
      return true;
    },
    [applyCart, nextSeq, showToast],
  );

  const removeItem = useCallback(
    async (productId: string): Promise<void> => {
      // Drop any queued quantity write for this line — it is about to vanish.
      const queue = queues.current.get(productId);
      if (queue && queue.timer !== null) window.clearTimeout(queue.timer);
      queues.current.delete(productId);
      clearOptimistic(productId);
      setCart((current) =>
        current
          ? { ...current, lines: current.lines.filter((line) => line.productId !== productId) }
          : current,
      );

      const seq = nextSeq();
      const result = await cartRequest<{ cart: CartView }>(
        'DELETE',
        `/api/cart/items/${encodeURIComponent(productId)}`,
      );
      if (result.ok) {
        applyCart(result.data.cart, seq);
      } else {
        showToast(result.message);
        void refresh();
      }
    },
    [applyCart, clearOptimistic, nextSeq, refresh, showToast],
  );

  const displayQuantity = useCallback(
    (productId: string): number =>
      optimistic[productId] ??
      cart?.lines.find((line) => line.productId === productId)?.quantity ??
      0,
    [cart, optimistic],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      displayQuantity,
      addItem,
      setQuantity,
      removeItem,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
    }),
    [cart, displayQuantity, addItem, setQuantity, removeItem, drawerOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** The cart. Must be called beneath a `CartProvider`. */
export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error('useCart must be used inside a CartProvider.');
  }
  return value;
}
