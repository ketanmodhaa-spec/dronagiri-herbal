/**
 * Shared field-level schemas and limits.
 *
 * Every validator in this package composes these primitives, so a rule — the
 * shape of an Indian phone number, the cap on a cart line — is defined exactly
 * once and stays identical across the web and mobile apps.
 */
import { z } from 'zod';

/** Indian mobile number: 10 digits, leading digit 6–9. No country code, no spaces. */
export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

/** Indian postal PIN code: exactly 6 digits. */
export const INDIAN_PINCODE_REGEX = /^\d{6}$/;

/** Largest quantity allowed on a single cart/order line. Stock is still re-checked server-side. */
export const MAX_LINE_QUANTITY = 99;

/** Largest number of distinct lines a single checkout may contain. */
export const MAX_CART_LINES = 50;

/** A 10-digit Indian mobile number — delivery contact and primary customer identity. */
export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(INDIAN_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number');

/** A 6-digit Indian PIN code. */
export const indianPincodeSchema = z
  .string()
  .trim()
  .regex(INDIAN_PINCODE_REGEX, 'Enter a valid 6-digit PIN code');

/** A database identifier — Prisma `cuid()`. Used wherever the client echoes back an id. */
export const cuidSchema = z.cuid({ error: 'Invalid identifier' });

/** A per-line item quantity: a whole number from 1 to {@link MAX_LINE_QUANTITY}. */
export const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(MAX_LINE_QUANTITY, `Quantity cannot exceed ${MAX_LINE_QUANTITY} per item`);

/**
 * A monetary amount in paise — a positive integer, capped at ₹1,00,000.
 *
 * Server-side only: it validates prices read from the database before a charge
 * is computed. It is deliberately never part of a client-facing request schema
 * — a client never sends a price. Exported so the service layer can assert
 * price sanity before charging.
 */
export const paisePriceSchema = z
  .number()
  .int('Price must be an integer in paise')
  .positive('Price must be greater than zero')
  .max(100_000_00, 'Price cannot exceed ₹1,00,000');
