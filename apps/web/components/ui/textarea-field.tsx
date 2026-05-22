import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Visible field label, also used as the accessible name. */
  label: string;
  /** Optional helper line shown beneath the field. */
  hint?: string;
}

/** Labelled multi-line input — the form primitive for long-form product copy. */
export function TextareaField({
  label,
  hint,
  className,
  id,
  name,
  rows = 4,
  ...props
}: TextareaFieldProps) {
  const fieldId = id ?? name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-forest-900">{label}</span>
      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        className={cn(
          'w-full rounded-lg border border-forest-200 bg-white px-3 py-2 text-sm leading-relaxed text-forest-900',
          'outline-none transition-colors placeholder:text-stone-light',
          'focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-stone">{hint}</span>}
    </label>
  );
}
