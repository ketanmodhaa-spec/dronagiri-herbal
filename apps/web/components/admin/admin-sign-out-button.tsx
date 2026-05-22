'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

/** Signs the admin out, then returns to the login screen. */
export function AdminSignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => {
      /* logout still proceeds — the cookies are cleared on the next sign-in */
    });
    router.replace('/admin/login');
  }

  return (
    <Button variant="secondary" size="sm" onClick={signOut} disabled={busy}>
      {busy ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
