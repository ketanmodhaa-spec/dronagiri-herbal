'use client';

/**
 * One product's review form on the buyer's review page: stars, a few words,
 * the name to show. Submits to /api/reviews with the page's signed token.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { TextField } from '@/components/ui/text-field';
import { TextareaField } from '@/components/ui/textarea-field';
import { cn } from '@/lib/cn';

interface ReviewFormProps {
  token: string;
  productId: string;
  productName: string;
  suggestedName: string;
  city: string;
}

const STAR_LABELS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent'];

export function ReviewForm({ token, productId, productName, suggestedName, city }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [displayName, setDisplayName] = useState(suggestedName);
  const [showCity, setShowCity] = useState(false);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0) {
      setError('Choose a star rating.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          productId,
          rating,
          title: title.trim() || undefined,
          body,
          displayName,
          showCity,
          website: website || undefined,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (response.ok) {
        setDone(true);
      } else {
        setError(payload?.error?.message ?? 'Could not send your review. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setBusy(false);
  }

  if (done) {
    return (
      <p role="status" className="rounded-xl bg-forest-100 p-4 text-sm text-forest-900">
        Thank you! Your review of {productName} will appear on the site once we have checked it.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-forest-900">Your rating</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-label={`${star} star${star === 1 ? '' : 's'} — ${STAR_LABELS[star]}`}
              aria-pressed={rating === star}
              className={cn(
                'text-3xl leading-none transition-colors',
                star <= rating ? 'text-gold-dark' : 'text-forest-200 hover:text-gold',
              )}
            >
              ★
            </button>
          ))}
          {rating > 0 && <span className="ml-2 text-sm text-stone">{STAR_LABELS[rating]}</span>}
        </div>
      </fieldset>

      <TextField
        label="Title (optional)"
        name={`title-${productId}`}
        maxLength={80}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <TextareaField
        label="Your review"
        name={`body-${productId}`}
        rows={4}
        maxLength={2000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        hint="How did it feel, smell, work for you? Good or bad, we publish honest reviews. Please don't include phone numbers, or claims that it cured a medical condition."
      />
      <TextField
        label="Show my name as"
        name={`name-${productId}`}
        maxLength={40}
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
      />
      <CheckboxField
        label={`Show my city (${city})`}
        name={`city-${productId}`}
        checked={showCity}
        onChange={(event) => setShowCity(event.target.checked)}
      />

      {/* Honeypot — invisible to people; bots fill it in. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            name="website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Send review'}
      </Button>
    </form>
  );
}
