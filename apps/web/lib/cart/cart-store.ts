/**
 * Cart store — the Redis half of the cart. No catalogue knowledge, no prices
 * of record: it holds product ids and quantities against a guest session.
 *
 * One hash per session:
 *
 *   cart:{sessionId}   field = productId
 *                      value = {"quantity":3,"priceSnapshotForBadgeOnly":29900,"addedAt":1791380326000}
 *                      TTL   = 7 days, renewed on every read and write
 *
 * `priceSnapshotForBadgeOnly` is the catalogue price at the moment the line was
 * first added. It is written once and never updated while the line exists; it
 * only lets the cart show a "Price updated" badge. Money is always computed
 * from live catalogue prices in cart-service.
 *
 * Writes that depend on current state run as Lua scripts, so each is atomic —
 * two rapid adds cannot both read 4 and both write 5+.
 */
import { getRedis } from '@/lib/redis';

/** Cart lifetime in Redis — matches the guest session lifetime. */
export const CART_TTL_SECONDS = 7 * 24 * 60 * 60;

function cartKey(sessionId: string): string {
  return `cart:${sessionId}`;
}

export interface StoredCartLine {
  productId: string;
  quantity: number;
  /** Catalogue price when first added — badge display only, never for money. */
  priceSnapshotForBadgeOnly: number;
  /** Unix milliseconds when first added — keeps line order stable. */
  addedAt: number;
}

function isWholeNumber(value: unknown, min: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
}

/** Validate a stored value, so a malformed one can never reach pricing. */
function parseStoredLine(productId: string, value: unknown): StoredCartLine | null {
  if (typeof value !== 'object' || value === null) return null;
  const { quantity, priceSnapshotForBadgeOnly, addedAt } = value as Record<string, unknown>;
  if (
    !isWholeNumber(quantity, 1) ||
    !isWholeNumber(priceSnapshotForBadgeOnly, 0) ||
    !isWholeNumber(addedAt, 0)
  ) {
    return null;
  }
  return { productId, quantity, priceSnapshotForBadgeOnly, addedAt };
}

/**
 * Add to a line, capped at `limit`. Creates the line (with its price snapshot)
 * when absent, refusing once the cart already holds `maxLines` lines.
 *
 * KEYS[1] cart hash
 * ARGV    productId, requested, limit, pricePaise, nowMs, ttlSeconds, maxLines
 * Returns {newQuantity, previousQuantity}; {-1, 0} when the cart is full.
 */
const ADD_SCRIPT = `
local raw = redis.call('HGET', KEYS[1], ARGV[1])
local existing = 0
local line
if raw then
  line = cjson.decode(raw)
  existing = tonumber(line.quantity)
else
  if redis.call('HLEN', KEYS[1]) >= tonumber(ARGV[7]) then
    return {-1, 0}
  end
  line = { priceSnapshotForBadgeOnly = tonumber(ARGV[4]), addedAt = tonumber(ARGV[5]) }
end
local target = math.min(existing + tonumber(ARGV[2]), tonumber(ARGV[3]))
if target <= existing then
  return {existing, existing}
end
line.quantity = target
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(line))
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[6]))
return {target, existing}
`;

/**
 * Set an existing line's quantity, leaving its snapshot and position intact.
 *
 * KEYS[1] cart hash
 * ARGV    productId, quantity, ttlSeconds
 * Returns 1 when the line was updated, 0 when it does not exist.
 */
const SET_SCRIPT = `
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then
  return 0
end
local line = cjson.decode(raw)
line.quantity = tonumber(ARGV[2])
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(line))
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3]))
return 1
`;

/** Every line in the cart, oldest first. Malformed values are dropped and deleted. */
export async function readLines(sessionId: string): Promise<StoredCartLine[]> {
  const redis = getRedis();
  const key = cartKey(sessionId);
  const hash = await redis.hgetall<Record<string, unknown>>(key);
  if (!hash) return [];

  const lines: StoredCartLine[] = [];
  const malformed: string[] = [];
  for (const [productId, value] of Object.entries(hash)) {
    const line = parseStoredLine(productId, value);
    if (line) {
      lines.push(line);
    } else {
      malformed.push(productId);
    }
  }

  if (malformed.length > 0) {
    console.error('[cart] dropping malformed cart lines', { count: malformed.length });
    await redis.hdel(key, ...malformed);
  }
  if (lines.length > 0) {
    await redis.expire(key, CART_TTL_SECONDS);
  }
  return lines.sort((a, b) => a.addedAt - b.addedAt);
}

export type AddLineResult =
  | { kind: 'added'; newQuantity: number; previousQuantity: number }
  | { kind: 'unchanged'; quantity: number }
  | { kind: 'cart-full' };

/** Atomically add `requested` units to a line, never exceeding `limit`. */
export async function addLine(
  sessionId: string,
  args: { productId: string; requested: number; limit: number; pricePaise: number; maxLines: number },
): Promise<AddLineResult> {
  const [newQuantity, previousQuantity] = await getRedis().eval<
    (string | number)[],
    [number, number]
  >(
    ADD_SCRIPT,
    [cartKey(sessionId)],
    [
      args.productId,
      args.requested,
      args.limit,
      args.pricePaise,
      Date.now(),
      CART_TTL_SECONDS,
      args.maxLines,
    ],
  );

  if (newQuantity === -1) return { kind: 'cart-full' };
  if (newQuantity === previousQuantity) return { kind: 'unchanged', quantity: newQuantity };
  return { kind: 'added', newQuantity, previousQuantity };
}

/** Set an existing line's quantity. Returns false when the line is not in the cart. */
export async function setLineQuantity(
  sessionId: string,
  productId: string,
  quantity: number,
): Promise<boolean> {
  const updated = await getRedis().eval<(string | number)[], number>(
    SET_SCRIPT,
    [cartKey(sessionId)],
    [productId, quantity, CART_TTL_SECONDS],
  );
  return updated === 1;
}

/** Remove lines. Removing a line that is not there is a no-op. */
export async function removeLines(sessionId: string, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  await getRedis().hdel(cartKey(sessionId), ...productIds);
}

/** Empty the cart. */
export async function clearLines(sessionId: string): Promise<void> {
  await getRedis().del(cartKey(sessionId));
}
