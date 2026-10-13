/**
 * Identifiers handed to customers: the order number they quote on WhatsApp,
 * and the tracking token in their order link.
 */
import { createHash, randomBytes } from 'node:crypto';

import type { DbTransaction } from '@dronagiri/db';

/** Calendar year in India — an order placed at 00:30 IST on 1 Jan is next year's. */
function istYear(now: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(now),
  );
}

/**
 * The next order number for this year, e.g. `DH-26-00042`. One atomic upsert
 * on the year's counter row, so concurrent orders can never share a number.
 * Inside the caller's transaction: a rolled-back order gives its number back.
 */
export async function nextOrderNumber(tx: DbTransaction, now = new Date()): Promise<string> {
  const year = istYear(now);
  const [row] = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "OrderNumberCounter" ("year", "lastNumber") VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE SET "lastNumber" = "OrderNumberCounter"."lastNumber" + 1
    RETURNING "lastNumber"
  `;
  if (!row) {
    throw new Error('Order number counter returned no row.');
  }
  return `DH-${String(year % 100).padStart(2, '0')}-${String(row.lastNumber).padStart(5, '0')}`;
}

/**
 * A fresh tracking token. The raw token goes to the customer in their order
 * link; only its SHA-256 hash is stored, so a database leak exposes no links.
 */
export function newTrackingToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, hash: createHash('sha256').update(token).digest('hex') };
}
