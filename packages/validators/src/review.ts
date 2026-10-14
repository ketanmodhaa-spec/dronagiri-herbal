/**
 * Product reviews — what a verified buyer submits, and what Sarita does with
 * it. The review token (from the buyer's personal link) is the proof of
 * purchase; the honeypot field catches form-filling bots.
 */
import { z } from 'zod';

import { cuidSchema } from './primitives';

export const REVIEW_REJECT_REASONS = [
  'ABUSIVE',
  'PERSONAL_INFO',
  'MEDICAL_CLAIM',
  'SPAM',
  'NOT_ABOUT_PRODUCT',
] as const;

export type ReviewRejectReason = (typeof REVIEW_REJECT_REASONS)[number];

export const reviewSubmitSchema = z.strictObject({
  token: z.string().min(20).max(80),
  productId: cuidSchema,
  rating: z.number().int().min(1, 'Choose a star rating').max(5, 'Choose a star rating'),
  title: z.string().trim().max(80, 'Keep the title under 80 characters').optional(),
  body: z
    .string()
    .trim()
    .min(10, 'Tell us a little more — at least a sentence')
    .max(2000, 'Please keep it under 2000 characters'),
  displayName: z.string().trim().min(2, 'Enter the name to show').max(40, 'Name is too long'),
  showCity: z.boolean(),
  /** Honeypot — hidden from people, filled in by bots. Must be empty. */
  website: z.string().max(0).optional(),
});

export type ReviewSubmit = z.infer<typeof reviewSubmitSchema>;

export const reviewModerationSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('PUBLISH') }),
  z.strictObject({
    action: z.literal('REJECT'),
    reason: z.enum(REVIEW_REJECT_REASONS, { error: 'Choose a reason' }),
  }),
  /** Sarita's public reply. An empty reply removes it. */
  z.strictObject({
    action: z.literal('REPLY'),
    reply: z.string().trim().max(1000, 'Please keep the reply under 1000 characters'),
  }),
]);

export type ReviewModeration = z.infer<typeof reviewModerationSchema>;
