'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile widget — mostly invisible: Cloudflare shows a tick-box
 * only when it is unsure about the visitor (`interaction-only`).
 *
 * Tokens are single-use, so the form bumps `resetKey` after every submit to
 * get a fresh one. The server checks the token; this component only fetches it.
 */

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  appearance: 'always' | 'execute' | 'interaction-only';
  size: 'normal' | 'flexible' | 'compact';
  theme: 'light' | 'dark' | 'auto';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export interface TurnstileWidgetProps {
  siteKey: string;
  action: 'admin_login' | 'partner_enquiry';
  /** A fresh token, or null when it expired or was spent. */
  onToken: (token: string | null) => void;
  /** The challenge could not load or run. */
  onError: () => void;
  /** Change this to discard the current token and fetch a new one. */
  resetKey: number;
}

export function TurnstileWidget({ siteKey, action, onToken, onError, resetKey }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Cloudflare keeps the callbacks it was given at render; refs keep them current.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;

  function renderWidget() {
    const container = containerRef.current;
    if (!window.turnstile || !container || widgetIdRef.current !== null) return;
    widgetIdRef.current = window.turnstile.render(container, {
      sitekey: siteKey,
      action,
      appearance: 'interaction-only',
      size: 'flexible',
      theme: 'light',
      callback: (token) => onTokenRef.current(token),
      'expired-callback': () => onTokenRef.current(null),
      'error-callback': () => onErrorRef.current(),
    });
  }

  useEffect(() => {
    // Script already loaded by an earlier visit to a protected form.
    renderWidget();
    return () => {
      if (widgetIdRef.current !== null) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
    // Rendered once per mount; siteKey and action never change for a form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstResetKey = useRef(resetKey);
  useEffect(() => {
    if (resetKey === firstResetKey.current || widgetIdRef.current === null) return;
    onTokenRef.current(null);
    window.turnstile?.reset(widgetIdRef.current);
  }, [resetKey]);

  return (
    <>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onReady={renderWidget} />
      <div ref={containerRef} />
    </>
  );
}
