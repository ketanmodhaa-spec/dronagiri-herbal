'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LeafIcon } from '@/components/ui/icons';

interface ProductImageZoomProps {
  /** Image to display. When `null`, a branded placeholder takes its place. */
  image: {
    url: string;
    alt: string | null;
    width: number;
    height: number;
  } | null;
  /** Accessible name used when the image carries no alt text of its own. */
  productName: string;
}

/**
 * Product hero with a click-to-zoom lightbox.
 *
 * The hero is a server-rendered next/image (priority); clicking it opens a
 * full-screen modal showing the image at intrinsic resolution, contained to
 * the viewport. ESC, the close button, and a backdrop click all dismiss.
 * Body scroll is locked while the modal is open; focus returns to the hero
 * trigger on close.
 *
 * Mobile-first by design — there is no hover zoom (touch devices don't have
 * hover), but the lightbox itself works identically on phone and desktop.
 */
export function ProductImageZoom({ image, productName }: ProductImageZoomProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    // Return focus to the hero so keyboard users land where they left off.
    triggerRef.current?.focus();
  }, []);

  // ESC dismisses the modal; body scroll is locked while it's open.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus to the close button so keyboard users have a way out.
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  // No image yet — render the same placeholder the card uses, with no zoom.
  if (!image) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-100 to-forest-200">
        <div className="flex aspect-square items-center justify-center">
          <LeafIcon className="h-24 w-24 text-forest-600" />
        </div>
      </div>
    );
  }

  const altText = image.alt ?? productName;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open larger view of ${productName}`}
        className="group relative block w-full overflow-hidden rounded-2xl bg-gradient-to-br from-forest-100 to-forest-200 ring-1 ring-forest-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2"
      >
        <Image
          src={image.url}
          alt={altText}
          width={image.width}
          height={image.height}
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="aspect-square h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {/* Small hint badge so the affordance is discoverable */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-forest-800 shadow-sm backdrop-blur transition group-hover:bg-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M11 8v6" />
            <path d="M8 11h6" />
          </svg>
          Tap to zoom
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} — enlarged view`}
          // Backdrop click closes — but only when the click lands on the backdrop
          // itself (not the image), so the photo isn't dismissive to grab.
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-forest-900/90 p-4 backdrop-blur-sm md:p-8"
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="Close enlarged view"
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-forest-900 shadow-lg transition hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-forest-900 md:right-6 md:top-6"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          {/* The image. Contain-fitted so labels stay readable without cropping. */}
          <Image
            src={image.url}
            alt={altText}
            width={image.width}
            height={image.height}
            sizes="100vw"
            className="max-h-[90vh] w-auto max-w-[92vw] rounded-xl bg-white object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
