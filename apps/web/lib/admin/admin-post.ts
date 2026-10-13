/**
 * Browser-side POST to an admin API route, unwrapping the standard
 * `{ data }` / `{ error }` envelope. Never throws: the caller gets either the
 * data or a message fit to show Sarita.
 */
export type AdminPostResult<T> = { ok: true; data: T } | { ok: false; message: string };

export async function adminPost<T>(url: string, body?: object): Promise<AdminPostResult<T>> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => null)) as
      | { data?: T; error?: { message?: string } }
      | null;
    if (response.ok && payload?.data !== undefined) {
      return { ok: true, data: payload.data };
    }
    if (response.status === 401) {
      return { ok: false, message: 'Your session has expired. Refresh the page to sign in again.' };
    }
    return { ok: false, message: payload?.error?.message ?? 'Something went wrong. Please try again.' };
  } catch {
    return { ok: false, message: 'Could not reach the server. Check your connection and try again.' };
  }
}
