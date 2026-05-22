import type { ReactNode, SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Visible field label, also used as the accessible name. */
  label: string;
  /** The `<option>` elements. */
  children: ReactNode;
}

/** Labelled dropdown — the form primitive for choosing a category and the like. */
export function SelectField({ label, className, id, name, children, ...props }: SelectFieldProps) {
  const fieldId = id ?? name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-forest-900">{label}</span>
      <select
        id={fieldId}
        name={name}
        className={cn(
          'h-11 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900',
          'outline-none transition-colors',
          'focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
