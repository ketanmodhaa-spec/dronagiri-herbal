/**
 * Order tracking request.
 *
 * `trackingToken` is the raw, high-entropy token handed to the customer in
 * their confirmation message. The database stores only its SHA-256 hash
 * (`Order.trackingTokenHash`) — this schema validates the raw token's shape
 * before it is hashed and looked up. A malformed token is rejected here
 * rather than reaching the database.
 */
import { z } from 'zod';

export const orderTrackingSchema = z.strictObject({
  trackingToken: z
    .string()
    .trim()
    .min(16, 'Invalid tracking link')
    .max(128, 'Invalid tracking link')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid tracking link'),
});

export type OrderTracking = z.infer<typeof orderTrackingSchema>;
