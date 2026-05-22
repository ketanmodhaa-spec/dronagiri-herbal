import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible field label, also used as the accessible name. */
  label: string;
}

/**
 * Labelled text input — the form primitive shared by the admin and, later,
 * checkout screens. The label is bound to the input, so a tap anywhere on it
 * focuses the field (it matters on a phone).
 */
export function TextField({ label, className, id, name, ...props }: TextFieldProps) {
  const fieldId = id ?? name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-forest-900">{label}</span>
      <input
        id={fieldId}
        name={name}
        className={cn(
          'h-11 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900',
          'outline-none transition-colors placeholder:text-stone-light',
          'focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
    </label>
  );
}
