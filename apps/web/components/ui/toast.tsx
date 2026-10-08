'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/** How long a toast stays on screen. */
const TOAST_DURATION_MS = 3000;

/**
 * Leading-edge throttle window. The first toast for a message shows at once;
 * repeats of the same message inside this window are dropped, so hammering a
 * disabled + button produces one toast, not a stack.
 */
const TOAST_THROTTLE_MS = 2000;

/** At most this many toasts are visible together; the oldest gives way. */
const MAX_VISIBLE = 3;

interface ToastItem {
  id: number;
  message: string;
}

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast | null>(null);

/** Hosts the toast stack and its live region. Mount once, above anything that toasts. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lastShownAt = useRef(new Map<string, number>());
  const nextId = useRef(0);

  const showToast = useCallback<ShowToast>((message) => {
    const now = Date.now();
    const last = lastShownAt.current.get(message);
    if (last !== undefined && now - last < TOAST_THROTTLE_MS) return;
    lastShownAt.current.set(message, now);

    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* Always mounted, so screen readers are already watching it when a toast arrives. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <p
            key={toast.id}
            className="max-w-sm rounded-full bg-forest-900 px-5 py-3 text-center text-sm font-medium text-white shadow-lg"
          >
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Show a toast. Must be called beneath a `ToastProvider`. */
export function useToast(): ShowToast {
  const showToast = useContext(ToastContext);
  if (!showToast) {
    throw new Error('useToast must be used inside a ToastProvider.');
  }
  return showToast;
}
