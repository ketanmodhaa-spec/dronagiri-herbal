import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Label shown beside the checkbox. */
  label: string;
  /** Optional helper line shown beneath the label. */
  hint?: string;
}

/** Labelled checkbox — the form primitive for on/off flags like Active and Featured. */
export function CheckboxField({ label, hint, className, id, name, ...props }: CheckboxFieldProps) {
  const fieldId = id ?? name;
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={fieldId}
        name={name}
        type="checkbox"
        className={cn(
          'mt-0.5 h-4 w-4 rounded border-forest-300 text-forest-800',
          'focus:ring-2 focus:ring-forest-600/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
      <label htmlFor={fieldId} className="text-sm text-forest-900">
        {label}
        {hint && <span className="mt-0.5 block text-xs text-stone">{hint}</span>}
      </label>
    </div>
  );
}
