import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** When set, the button renders as a Next.js link instead of a <button>. */
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  /** Click handler — ignored when `href` is set (the button renders as a link). */
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-full font-body font-medium ' +
  'whitespace-nowrap transition-colors duration-200 focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-forest-800 text-white hover:bg-forest-700 active:bg-forest-900',
  secondary: 'border border-forest-600 bg-white text-forest-800 hover:bg-forest-50',
  ghost: 'text-forest-800 hover:bg-forest-100',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-14 px-8 text-base',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  type = 'button',
  disabled = false,
  onClick,
  className,
  'aria-label': ariaLabel,
}: ButtonProps) {
  const classes = cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);

  if (href !== undefined) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={classes}
    >
      {children}
    </button>
  );
}
