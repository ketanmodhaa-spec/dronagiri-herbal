import type { ReactNode, SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Visible field label, also used as the accessible name. */
  label: string;
  /** The `<option>` elements. */
  children: ReactNode;
  /** What is wrong with the choice — shown beneath, and announced. */
  error?: string;
}

/** Labelled dropdown — the form primitive for choosing a category, a state and the like. */
export function SelectField({ label, error, className, id, name, children, ...props }: SelectFieldProps) {
  const fieldId = id ?? name;
  const errorId = error ? `${fieldId}-error` : undefined;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-forest-900">{label}</span>
      <select
        id={fieldId}
        name={name}
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'h-11 w-full rounded-lg border bg-white px-3 text-sm text-forest-900',
          'outline-none transition-colors focus:ring-2',
          error
            ? 'border-red-600 focus:border-red-600 focus:ring-red-600/30'
            : 'border-forest-200 focus:border-forest-600 focus:ring-forest-600/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span id={errorId} role="alert" className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}
