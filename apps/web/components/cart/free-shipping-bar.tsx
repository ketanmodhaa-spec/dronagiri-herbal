import type { FreeShippingProgress } from '@dronagiri/types';

import { formatPrice } from '@/lib/format';

/**
 * Progress toward free shipping. Rendered only for a non-empty cart (the
 * drawer decides); always visible then — the closer the customer is, the
 * more useful the hard number.
 */
export function FreeShippingBar({ progress }: { progress: FreeShippingProgress }) {
  const { thresholdPaise, remainingPaise, unlocked } = progress;
  const percent = Math.min(100, Math.round(((thresholdPaise - remainingPaise) / thresholdPaise) * 100));

  return (
    <div>
      <p className="text-sm font-medium text-forest-900">
        {unlocked ? (
          <>You&rsquo;ve unlocked free shipping ✓</>
        ) : (
          <>Add {formatPrice(remainingPaise)} for free shipping</>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progress toward free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-2 h-2 overflow-hidden rounded-full bg-forest-100"
      >
        <div
          className="h-full rounded-full bg-forest-600 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
