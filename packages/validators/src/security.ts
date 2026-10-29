/**
 * Cloudflare Turnstile token — proof that a real browser filled the form.
 *
 * Sent as a request header rather than in the body, so the form schemas stay
 * exactly the data the form submits. Cloudflare documents tokens of up to
 * 2048 characters.
 */
import { z } from 'zod';

export const TURNSTILE_TOKEN_HEADER = 'x-turnstile-token';

export const turnstileTokenSchema = z.string().min(1).max(2048);
