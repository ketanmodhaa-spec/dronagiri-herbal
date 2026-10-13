/**
 * Payment errors — every failure on the money path carries one of these, so a
 * route can tell a customer-fixable problem from a provider outage.
 */
import { AppError } from '@/lib/errors';

/** 400 — the payment cannot be accepted: bad signature, amount mismatch, wrong order state. */
export class PaymentError extends AppError {
  constructor(message: string, code = 'PAYMENT_REJECTED') {
    super(code, message, 400);
  }
}

/** 502 — Razorpay could not be reached or answered with an error. Safe to retry. */
export class PaymentProviderError extends AppError {
  constructor(message = 'The payment service is not responding. Please try again.') {
    super('PAYMENT_PROVIDER_ERROR', message, 502);
  }
}
