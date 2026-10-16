/**
 * Razorpay REST client — the calls the payment flow needs, over plain
 * `fetch` with HTTP Basic auth (key id : key secret).
 *
 * Responses are narrowed to the fields we actually read and checked at
 * runtime before use: a response missing a field we depend on is treated as a
 * provider fault, never trusted. Node runtime only (the secret must never
 * reach an edge bundle that does not need it).
 */
import { serverConfig } from '@/lib/config.server';
import { PaymentProviderError } from '@/lib/payments/payment-error';

/** Razorpay calls give up after this long — the caller can retry; a hung request cannot. */
const REQUEST_TIMEOUT_MS = 10_000;

/** A Razorpay order — one per Order of ours; it can carry several payment attempts. */
export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  status: 'created' | 'attempted' | 'paid';
}

/** A single payment attempt against a Razorpay order. */
export interface RazorpayPayment {
  id: string;
  /** Null only for payments made outside the Orders API — we never create those. */
  order_id: string | null;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method: string;
  error_description: string | null;
}

/** Money returned against a captured payment. */
export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  notes: Record<string, string> | [];
}

/** Razorpay's error envelope: `{ error: { code, description } }`. */
interface RazorpayErrorBody {
  error?: { code?: string; description?: string };
}

/** Thrown for a Razorpay 4xx — carries Razorpay's own description for the logs. */
export class RazorpayApiError extends PaymentProviderError {
  readonly httpStatus: number;
  readonly description: string;

  constructor(httpStatus: number, description: string) {
    super();
    this.httpStatus = httpStatus;
    this.description = description;
  }
}

function authorizationHeader(): string {
  const { keyId, keySecret } = serverConfig.razorpay;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

async function request(method: 'GET' | 'POST', path: string, body?: object): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${serverConfig.razorpay.apiBase}${path}`, {
      method,
      headers: {
        Authorization: authorizationHeader(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`[razorpay] ${method} ${path} did not complete`, error);
    throw new PaymentProviderError();
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const description =
      (payload as RazorpayErrorBody | null)?.error?.description ?? `HTTP ${response.status}`;
    console.error(`[razorpay] ${method} ${path} failed: ${response.status} ${description}`);
    if (response.status >= 400 && response.status < 500) {
      throw new RazorpayApiError(response.status, description);
    }
    throw new PaymentProviderError();
  }
  return payload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * What to log about a malformed Razorpay object: its kind, id and field names
 * only. Payments carry the customer's phone and email, and error logs are
 * forwarded to Sentry — the values themselves never leave this process.
 */
function shapeSummary(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return { type: value === null ? 'null' : typeof value };
  return { entity: value.entity, id: value.id, fields: Object.keys(value) };
}

function asOrder(value: unknown): RazorpayOrder {
  if (
    !isRecord(value) ||
    value.entity !== 'order' ||
    typeof value.id !== 'string' ||
    !Number.isSafeInteger(value.amount) ||
    typeof value.currency !== 'string' ||
    typeof value.status !== 'string'
  ) {
    console.error('[razorpay] unexpected order shape', shapeSummary(value));
    throw new PaymentProviderError();
  }
  return value as unknown as RazorpayOrder;
}

function asPayment(value: unknown): RazorpayPayment {
  if (
    !isRecord(value) ||
    value.entity !== 'payment' ||
    typeof value.id !== 'string' ||
    !Number.isSafeInteger(value.amount) ||
    typeof value.currency !== 'string' ||
    typeof value.status !== 'string' ||
    (value.order_id !== null && typeof value.order_id !== 'string')
  ) {
    console.error('[razorpay] unexpected payment shape', shapeSummary(value));
    throw new PaymentProviderError();
  }
  return value as unknown as RazorpayPayment;
}

function asRefund(value: unknown): RazorpayRefund {
  if (
    !isRecord(value) ||
    value.entity !== 'refund' ||
    typeof value.id !== 'string' ||
    typeof value.payment_id !== 'string' ||
    !Number.isSafeInteger(value.amount) ||
    typeof value.status !== 'string'
  ) {
    console.error('[razorpay] unexpected refund shape', shapeSummary(value));
    throw new PaymentProviderError();
  }
  return value as unknown as RazorpayRefund;
}

/**
 * Create a Razorpay order for an amount we computed server-side. Razorpay
 * then refuses any payment against it for a different amount.
 */
export async function createRazorpayOrder(args: {
  amountPaise: number;
  /** Our order number — shown in the Razorpay dashboard. Max 40 characters. */
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  return asOrder(
    await request('POST', '/orders', {
      amount: args.amountPaise,
      currency: 'INR',
      receipt: args.receipt,
      notes: args.notes,
    }),
  );
}

/** Fetch a payment — the source of truth for its status and amount. */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  return asPayment(await request('GET', `/payments/${encodeURIComponent(paymentId)}`));
}

/**
 * Capture an authorized payment. Without capture, Razorpay refunds an
 * authorized payment automatically after a few days — so we never ship
 * against one that is merely authorized.
 */
export async function captureRazorpayPayment(args: {
  paymentId: string;
  amountPaise: number;
}): Promise<RazorpayPayment> {
  return asPayment(
    await request('POST', `/payments/${encodeURIComponent(args.paymentId)}/capture`, {
      amount: args.amountPaise,
      currency: 'INR',
    }),
  );
}

/**
 * Refund part or all of a captured payment, back to the original method.
 * `notes.refundId` carries our Refund row's id, so a refund whose response was
 * lost can still be matched up afterwards (see `listPaymentRefunds`).
 */
export async function createRazorpayRefund(args: {
  paymentId: string;
  amountPaise: number;
  refundId: string;
}): Promise<RazorpayRefund> {
  return asRefund(
    await request('POST', `/payments/${encodeURIComponent(args.paymentId)}/refund`, {
      amount: args.amountPaise,
      speed: 'normal',
      notes: { refundId: args.refundId },
    }),
  );
}

/** Every refund made against a payment. */
export async function listPaymentRefunds(paymentId: string): Promise<RazorpayRefund[]> {
  const payload = await request('GET', `/payments/${encodeURIComponent(paymentId)}/refunds?count=100`);
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    console.error('[razorpay] unexpected refund list shape', shapeSummary(payload));
    throw new PaymentProviderError();
  }
  return payload.items.map(asRefund);
}

/** Our Refund id, as stored in a Razorpay refund's notes — null if absent. */
export function refundIdFromNotes(refund: RazorpayRefund): string | null {
  const notes = refund.notes;
  return !Array.isArray(notes) && typeof notes.refundId === 'string' ? notes.refundId : null;
}
