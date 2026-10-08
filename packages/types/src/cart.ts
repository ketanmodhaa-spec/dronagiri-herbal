/**
 * Cart response shapes — what `/api/cart*` sends back.
 *
 * Every price here is computed server-side from the live catalogue on each
 * request. The one exception is `priceSnapshotForBadgeOnly`, which exists
 * only to drive the "Price updated" badge and is never used for money.
 */

/** Where a cart line stands against current stock. */
export type CartLineStatus =
  /** Purchasable as it stands. */
  | 'OK'
  /** Stock is zero — the line stays visible but cannot be bought. */
  | 'OUT_OF_STOCK'
  /** The line holds more than is now in stock; the customer must reduce it. */
  | 'EXCEEDS_STOCK';

export interface CartLineImage {
  url: string;
  alt: string | null;
  width: number;
  height: number;
}

export interface CartLineView {
  productId: string;
  slug: string;
  name: string;
  sizeLabel: string | null;
  image: CartLineImage | null;
  quantity: number;
  /** Live catalogue price, in paise. */
  unitPricePaise: number;
  /** `unitPricePaise × quantity`, in paise. */
  lineTotalPaise: number;
  /** Largest quantity this line may hold right now: min(per-line cap, stock). */
  maxQuantity: number;
  /** Which of the two sets `maxQuantity` — drives the wording of the limit toast. */
  limitedBy: CartNotice;
  status: CartLineStatus;
  /** True when the live price differs from the price the customer first added at. */
  priceChanged: boolean;
  /**
   * The price when this line was first added. NOT AUTHORITATIVE — shown struck
   * through beside the live price when `priceChanged`, and nothing else.
   */
  priceSnapshotForBadgeOnly: number;
}

export interface FreeShippingProgress {
  thresholdPaise: number;
  /** Paise still needed to qualify; 0 once unlocked. */
  remainingPaise: number;
  unlocked: boolean;
}

export interface CartView {
  /** Lines in the order they were first added. */
  lines: CartLineView[];
  /** Total units across all lines — the header badge count. */
  itemCount: number;
  /** Sum of line totals, excluding out-of-stock lines, in paise. */
  subtotalPaise: number;
  freeShipping: FreeShippingProgress;
  /** Products dropped from the cart on this read because they were withdrawn. */
  removedProductNames: string[];
}

/** Why a requested quantity was reduced before it was applied. */
export type CartNotice =
  /** Capped by the per-line maximum. */
  | 'MAX_PER_LINE'
  /** Capped by available stock. */
  | 'STOCK';

/** Response of `POST /api/cart/items` and `PATCH /api/cart/items/:productId`. */
export interface CartMutationResult {
  cart: CartView;
  /** Set when the quantity applied is lower than the quantity requested. */
  notice: CartNotice | null;
  /** The line's quantity after the change. */
  lineQuantity: number;
  /** Units actually added by this request (POST only; 0 for PATCH). */
  added: number;
}
