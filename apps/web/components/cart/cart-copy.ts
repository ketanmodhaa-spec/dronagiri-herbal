/**
 * Customer-facing wording for cart limits and clamps — one place, so the
 * product page and the drawer always say the same thing.
 */
import type { CartNotice } from '@dronagiri/types';

/** Why the customer cannot go higher: "Max 5 per product" / "Only 3 in stock". */
export function limitMessage(limit: number, limitedBy: CartNotice): string {
  return limitedBy === 'STOCK' ? `Only ${limit} in stock` : `Max ${limit} per product`;
}

/** After an add was clamped: "Max 5 per product — added 2". */
export function clampedAddMessage(notice: CartNotice, lineQuantity: number, added: number): string {
  return `${limitMessage(lineQuantity, notice)} — added ${added}`;
}
