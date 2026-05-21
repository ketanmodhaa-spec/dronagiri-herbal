import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { CheckIcon } from '@/components/ui/icons';

interface TrustBadgeProps {
  children: ReactNode;
  /** 'light' sits on pale backgrounds; 'dark' sits on deep-forest sections. */
  tone?: 'light' | 'dark';
}

/** A small certification / reassurance pill — KVIC, WHO GMP, COD, and the like. */
export function TrustBadge({ children, tone = 'light' }: TrustBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
        tone === 'light'
          ? 'bg-white text-forest-900 ring-1 ring-forest-100'
          : 'bg-white/10 text-forest-50 ring-1 ring-white/15',
      )}
    >
      <CheckIcon className="h-3 w-3 shrink-0 text-gold" />
      {children}
    </span>
  );
}
