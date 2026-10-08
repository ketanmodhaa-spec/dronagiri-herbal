'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { MinusIcon, PlusIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/** How a quantity change was made — callers pace their network writes by it. */
export type QtyChangeSource =
  /** A − or + tap. */
  | 'step'
  /** A keystroke or paste in the number box. */
  | 'type'
  /** The number box was left (blur) or Enter was pressed — write now. */
  | 'commit';

interface QtySelectorProps {
  value: number;
  /** Highest selectable quantity. */
  max: number;
  min?: number;
  onChange: (quantity: number, source: QtyChangeSource) => void;
  /** Called when the customer tries to go past `max` — the caller explains why. */
  onLimit: () => void;
  /** Accessible name, e.g. "Quantity of Hibiscus Shampoo". */
  label: string;
  disabled?: boolean;
}

const STEP_BUTTON_CLASSES =
  'flex h-11 w-11 shrink-0 items-center justify-center text-forest-800 transition-colors ' +
  'hover:bg-forest-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ' +
  'focus-visible:ring-forest-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 ' +
  'aria-disabled:hover:bg-transparent';

/**
 * − [n] + quantity control.
 *
 * Buttons are 44×44 px. At the limit + stays focusable but `aria-disabled`,
 * so a tap still reaches `onLimit` and the customer is told why it stopped.
 * The number box is a text input with `inputMode="numeric"` (not
 * `type="number"`, which accepts `e`/`-` and changes on scroll); anything that
 * is not an ASCII digit is stripped as it is typed or pasted, and an empty or
 * zero entry reverts to the last valid value on blur.
 */
export function QtySelector({
  value,
  max,
  min = 1,
  onChange,
  onLimit,
  label,
  disabled = false,
}: QtySelectorProps) {
  const [text, setText] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Follow outside changes (a server clamp, a + tap) unless the customer is mid-edit.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setText(String(value));
    }
  }, [value]);

  const atMin = disabled || value <= min;
  const atMax = disabled || value >= max;

  function decrement() {
    if (atMin) return;
    onChange(value - 1, 'step');
  }

  function increment() {
    if (disabled) return;
    if (value >= max) {
      onLimit();
      return;
    }
    onChange(value + 1, 'step');
  }

  function handleTextChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits === '') {
      setText('');
      return;
    }
    let quantity = Number(digits);
    if (quantity < min) {
      // Leave a lone 0 visible while typing; blur reverts it.
      setText(digits);
      return;
    }
    if (quantity > max) {
      onLimit();
      quantity = max;
    }
    setText(String(quantity));
    onChange(quantity, 'type');
  }

  function commit() {
    const quantity = Number(text);
    if (text === '' || quantity < min) {
      setText(String(value));
      onChange(value, 'commit');
      return;
    }
    onChange(quantity, 'commit');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  return (
    <div
      className={cn(
        'inline-flex items-center overflow-hidden rounded-full border border-forest-600 bg-white',
        disabled && 'opacity-50',
      )}
    >
      <button
        type="button"
        onClick={decrement}
        aria-disabled={atMin}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className={STEP_BUTTON_CLASSES}
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={text}
        disabled={disabled}
        onChange={(event) => handleTextChange(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        aria-label={label}
        className="h-11 w-12 border-x border-forest-100 bg-transparent text-center text-base font-medium text-forest-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest-600"
      />
      <button
        type="button"
        onClick={increment}
        aria-disabled={atMax}
        aria-label={`Increase ${label.toLowerCase()}`}
        className={STEP_BUTTON_CLASSES}
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
