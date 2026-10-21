import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible field label, also used as the accessible name. */
  label: string;
  /** Short helper line shown below the input — explain anything non-obvious. */
  hint?: string;
  /** What is wrong with the value — shown in place of the hint, and announced. */
  error?: string;
}

/**
 * Labelled text input — the form primitive shared by the admin and checkout
 * screens. The label is bound to the input, so a tap anywhere on it focuses
 * the field (it matters on a phone).
 */
export function TextField({ label, hint, error, className, id, name, ...props }: TextFieldProps) {
  const fieldId = id ?? name;
  const noteId = error || hint ? `${fieldId}-note` : undefined;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-forest-900">{label}</span>
      <input
        id={fieldId}
        name={name}
        aria-describedby={noteId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'h-11 w-full rounded-lg border bg-white px-3 text-sm text-forest-900',
          'outline-none transition-colors placeholder:text-stone-light',
          'focus:ring-2',
          error
            ? 'border-red-600 focus:border-red-600 focus:ring-red-600/30'
            : 'border-forest-200 focus:border-forest-600 focus:ring-forest-600/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
      {error ? (
        <span id={noteId} role="alert" className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      ) : hint ? (
        <span id={noteId} className="mt-1 block text-xs text-stone">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
