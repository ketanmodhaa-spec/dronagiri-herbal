'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { TURNSTILE_TOKEN_HEADER } from '@dronagiri/validators';

import { TurnstileWidget } from '@/components/security/turnstile-widget';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { TextField } from '@/components/ui/text-field';

/** Phone-first admin sign-in form. Posts to the login API; never trusts the client. */
export function AdminLoginForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnstileToken) return;
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', [TURNSTILE_TOKEN_HEADER]: turnstileToken },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        // Signed in — the middleware will now let the dashboard through.
        router.replace('/admin');
        return;
      }
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      setError(payload?.error?.message ?? 'Could not sign in. Please try again.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    // The token was spent on this attempt — fetch a fresh one for the next.
    setTurnstileResetKey((key) => key + 1);
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-2xl border border-forest-100 bg-white p-6 shadow-sm"
    >
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={submitting}
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={submitting}
      />
      <TurnstileWidget
        siteKey={turnstileSiteKey}
        action="admin_login"
        onToken={setTurnstileToken}
        onError={() => setError('The security check could not load. Refresh the page and try again.')}
        resetKey={turnstileResetKey}
      />
      <Button type="submit" disabled={submitting || !turnstileToken} className="w-full">
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
