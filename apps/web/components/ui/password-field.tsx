'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';

import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Visible field label, also used as the accessible name. */
  label: string;
};

/**
 * Password input with a reveal toggle.
 *
 * The toggle lets a non-technical owner see exactly what is in the box — it
 * catches password-manager autofill, which is otherwise invisible behind the
 * dots and the source of most "wrong password" confusion.
 */
export function PasswordField({
  label,
  className,
  id,
  name,
  disabled,
  ...props
}: PasswordFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? name ?? generatedId;
  const [revealed, setRevealed] = useState(false);

  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-forest-900">{label}</span>
      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type={revealed ? 'text' : 'password'}
          disabled={disabled}
          className={cn(
            'h-11 w-full rounded-lg border border-forest-200 bg-white pl-3 pr-11 text-sm text-forest-900',
            'outline-none transition-colors placeholder:text-stone-light',
            'focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30',
            'disabled:cursor-not-allowed disabled:opacity-60',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setRevealed((shown) => !shown)}
          disabled={disabled}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-stone transition-colors hover:text-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {revealed ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </div>
    </label>
  );
}
