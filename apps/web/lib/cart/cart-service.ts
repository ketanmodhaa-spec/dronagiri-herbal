/**
 * Cart service — the one path every cart route goes through.
 *
 * Joins the Redis lines (cart-store) with live catalogue rows on every call:
 * prices and stock are never cached, and nothing a client sends is ever used
 * as a price. Stock is checked here but not reserved — reservation happens at
 * checkout (Phase 4).
 */
import type {
  CartLineStatus,
  CartLineView,
  CartMutationResult,
  CartNotice,
  CartView,
} from '@dronagiri/types';
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from '@dronagiri/validators';

import {
  addLine,
  clearLines,
  readLines,
  removeLines,
  setLineQuantity,
  type StoredCartLine,
} from '@/lib/cart/cart-store';
import { serverConfig } from '@/lib/config.server';
import { AppError } from '@/lib/errors';
import { getProductsForCart, type CartProductRow } from '@/lib/products/product-service';

/** A cart request that cannot be applied as asked. */
export class CartError extends AppError {}

/**
 * A price read from the catalogue. Money arithmetic below accepts only this
 * brand, so the badge-only snapshot (a plain number) cannot be passed into a
 * total by mistake — it is a compile error.
 */
declare const catalogPriceBrand: unique symbol;
type CatalogPricePaise = number & { readonly [catalogPriceBrand]: true };

function catalogPrice(product: CartProductRow): CatalogPricePaise {
  return product.pricePaise as CatalogPricePaise;
}

function lineTotalPaise(unitPrice: CatalogPricePaise, quantity: number): number {
  return unitPrice * quantity;
}

/** The most a line may hold right now: the per-line cap or the stock, whichever is lower. */
function lineLimit(stockQty: number): number {
  return Math.max(0, Math.min(MAX_LINE_QUANTITY, stockQty));
}

/** Which limit capped a quantity — stock when stock is the tighter of the two. */
function noticeFor(limit: number): CartNotice {
  return limit < MAX_LINE_QUANTITY ? 'STOCK' : 'MAX_PER_LINE';
}

function lineStatus(quantity: number, stockQty: number): CartLineStatus {
  if (stockQty <= 0) return 'OUT_OF_STOCK';
  if (quantity > stockQty) return 'EXCEEDS_STOCK';
  return 'OK';
}

/** A purchasable product, or a `PRODUCT_UNAVAILABLE` error. */
async function findPurchasableProduct(productId: string): Promise<CartProductRow> {
  const [product] = await getProductsForCart([productId]);
  if (!product || !product.isActive) {
    throw new CartError('PRODUCT_UNAVAILABLE', 'This product is no longer available.', 404);
  }
  return product;
}

/**
 * Price the stored lines against the live catalogue. Lines whose product was
 * deleted or deactivated are removed from the cart and named once in
 * `removedProductNames`, so the drawer can tell the customer why.
 */
async function buildCartView(sessionId: string, stored: StoredCartLine[]): Promise<CartView> {
  const products = await getProductsForCart(stored.map((line) => line.productId));
  const byId = new Map(products.map((product) => [product.id, product]));

  const lines: CartLineView[] = [];
  const withdrawnIds: string[] = [];
  const removedProductNames: string[] = [];

  for (const line of stored) {
    const product = byId.get(line.productId);
    if (!product || !product.isActive) {
      withdrawnIds.push(line.productId);
      if (product) removedProductNames.push(product.name);
      continue;
    }
    const unitPrice = catalogPrice(product);
    lines.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sizeLabel: product.sizeLabel,
      image: product.image,
      quantity: line.quantity,
      unitPricePaise: unitPrice,
      lineTotalPaise: lineTotalPaise(unitPrice, line.quantity),
      maxQuantity: lineLimit(product.stockQty),
      limitedBy: noticeFor(lineLimit(product.stockQty)),
      status: lineStatus(line.quantity, product.stockQty),
      priceChanged: line.priceSnapshotForBadgeOnly !== product.pricePaise,
      priceSnapshotForBadgeOnly: line.priceSnapshotForBadgeOnly,
    });
  }

  await removeLines(sessionId, withdrawnIds);

  const subtotalPaise = lines
    .filter((line) => line.status !== 'OUT_OF_STOCK')
    .reduce((sum, line) => sum + line.lineTotalPaise, 0);
  const thresholdPaise = serverConfig.shipping.freeThresholdPaise;

  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalPaise,
    freeShipping: {
      thresholdPaise,
      remainingPaise: Math.max(0, thresholdPaise - subtotalPaise),
      unlocked: subtotalPaise > 0 && subtotalPaise >= thresholdPaise,
    },
    removedProductNames,
  };
}

/** The current cart, priced live. */
export async function getCart(sessionId: string): Promise<CartView> {
  return buildCartView(sessionId, await readLines(sessionId));
}

/**
 * Add units of a product. The line is clamped to min(per-line cap, stock);
 * a clamp is reported as a `notice`, not an error. Refused outright only when
 * nothing can be added: out of stock, line already at its limit, or cart full.
 */
export async function addItem(
  sessionId: string,
  args: { productId: string; quantity: number },
): Promise<CartMutationResult> {
  const product = await findPurchasableProduct(args.productId);
  if (product.stockQty <= 0) {
    throw new CartError('OUT_OF_STOCK', 'This product is out of stock.', 409);
  }

  const limit = lineLimit(product.stockQty);
  const result = await addLine(sessionId, {
    productId: product.id,
    requested: args.quantity,
    limit,
    pricePaise: product.pricePaise,
    maxLines: MAX_CART_LINES,
  });

  if (result.kind === 'cart-full') {
    throw new CartError(
      'CART_FULL',
      `Your cart can hold up to ${MAX_CART_LINES} different products.`,
      409,
    );
  }
  if (result.kind === 'unchanged') {
    throw new CartError(
      'LIMIT_REACHED',
      noticeFor(limit) === 'STOCK'
        ? `Only ${limit} in stock — you already have ${result.quantity} in your cart.`
        : `Max ${MAX_LINE_QUANTITY} per product — you already have ${result.quantity} in your cart.`,
      409,
    );
  }

  const requestedTotal = result.previousQuantity + args.quantity;
  return {
    cart: await getCart(sessionId),
    notice: result.newQuantity < requestedTotal ? noticeFor(limit) : null,
    lineQuantity: result.newQuantity,
    added: result.newQuantity - result.previousQuantity,
  };
}

/**
 * Set a line's quantity. Clamped to stock with a notice; refused when the
 * product is out of stock (the customer can still remove the line).
 */
export async function setItemQuantity(
  sessionId: string,
  args: { productId: string; quantity: number },
): Promise<CartMutationResult> {
  const product = await findPurchasableProduct(args.productId);
  const limit = lineLimit(product.stockQty);
  if (limit === 0) {
    throw new CartError(
      'OUT_OF_STOCK',
      'This product is out of stock. Remove it from your cart to continue.',
      409,
    );
  }

  const applied = Math.min(args.quantity, limit);
  const updated = await setLineQuantity(sessionId, product.id, applied);
  if (!updated) {
    throw new CartError('LINE_NOT_FOUND', 'This product is not in your cart.', 404);
  }

  return {
    cart: await getCart(sessionId),
    notice: applied < args.quantity ? noticeFor(limit) : null,
    lineQuantity: applied,
    added: 0,
  };
}

/** Remove a line. Removing a product that is not in the cart is not an error. */
export async function removeItem(sessionId: string, productId: string): Promise<CartView> {
  await removeLines(sessionId, [productId]);
  return getCart(sessionId);
}

/** Empty the cart. */
export async function clearCart(sessionId: string): Promise<CartView> {
  await clearLines(sessionId);
  return getCart(sessionId);
}
