/**
 * Admin login — credentials for the admin panel.
 *
 * The email is trimmed and lower-cased so it matches the stored address
 * regardless of how it was typed. The password is checked only for presence
 * and a sane maximum length — strength rules belong to account creation, not
 * to the login gate, and the cap blunts denial-of-service via a huge bcrypt
 * input.
 */
import { z } from 'zod';

export const adminLoginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: 'Enter a valid email address' })),
  password: z.string().min(1, 'Password is required').max(200, 'Password is too long'),
});

export type AdminLogin = z.infer<typeof adminLoginSchema>;

/**
 * Admin change-password — run by an already-authenticated admin.
 *
 * The current password is required even though the session is authenticated:
 * it stops a hijacked session from silently changing the credentials. Length
 * is the single strongest password rule and the only one applied here — it
 * keeps the gate usable for a non-technical owner — and the new password must
 * differ from the current one.
 */
export const adminChangePasswordSchema = z
  .strictObject({
    currentPassword: z
      .string()
      .min(1, 'Enter your current password')
      .max(200, 'Password is too long'),
    newPassword: z
      .string()
      .min(10, 'Use at least 10 characters')
      .max(200, 'Password is too long'),
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    error: 'The new password must be different from the current one',
    path: ['newPassword'],
  });

export type AdminChangePassword = z.infer<typeof adminChangePasswordSchema>;
