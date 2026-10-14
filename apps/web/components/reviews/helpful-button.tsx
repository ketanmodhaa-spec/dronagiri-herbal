'use client';

import { useState } from 'react';

/** "Helpful" thumbs-up on a review — one per visitor; the server ignores repeats. */
export function HelpfulButton({ reviewId, initialCount }: { reviewId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function vote() {
    setBusy(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, { method: 'POST' });
      const payload = (await response.json().catch(() => null)) as { data?: { helpfulCount: number } } | null;
      if (response.ok && payload?.data) {
        setCount(payload.data.helpfulCount);
        setVoted(true);
      }
    } catch {
      // A lost vote is harmless — leave the button as it was.
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={() => void vote()}
      disabled={busy || voted}
      aria-pressed={voted}
      className="inline-flex items-center gap-1.5 rounded-full border border-forest-200 px-3 py-1 text-xs text-forest-800 transition-colors hover:bg-forest-50 disabled:cursor-default disabled:opacity-80"
    >
      <span aria-hidden="true">👍</span>
      {voted ? 'Thanks' : 'Helpful'}
      {count > 0 && <span className="text-stone">({count})</span>}
    </button>
  );
}
