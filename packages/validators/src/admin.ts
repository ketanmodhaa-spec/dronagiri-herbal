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
