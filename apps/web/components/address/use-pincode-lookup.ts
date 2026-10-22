'use client';

/**
 * Looks a PIN code up in India Post's directory as it is typed, and fills in
 * the city and state the first time each new PIN is found — so a customer on
 * a phone types six digits instead of two more fields, and the state the
 * invoice depends on comes from the PIN rather than a guess from a long list.
 *
 * Filling happens once per PIN: after that the fields are the customer's, and
 * a state changed by hand stays changed (PincodeNote then flags the mismatch).
 */
import { useEffect, useRef, useState } from 'react';

export type PincodeLookup =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; pincode: string; district: string; states: string[]; areas: string[] }
  | { status: 'not-found'; pincode: string }
  /** The lookup itself failed (offline, server error) — say nothing, block nothing. */
  | { status: 'unavailable' };

type Answer = Exclude<PincodeLookup, { status: 'idle' | 'loading' | 'unavailable' }>;

const WELL_FORMED = /^[1-9]\d{5}$/;
const answers = new Map<string, Answer>();

async function fetchAnswer(pincode: string, signal: AbortSignal): Promise<Answer> {
  const response = await fetch(`/api/pincode/${pincode}`, { signal });
  if (!response.ok) throw new Error(`PIN lookup failed: ${response.status}`);
  const payload = (await response.json()) as {
    data: { found: false } | { found: true; district: string; states: string[]; areas: string[] };
  };
  return payload.data.found
    ? { status: 'found', pincode, district: payload.data.district, states: payload.data.states, areas: payload.data.areas }
    : { status: 'not-found', pincode };
}

interface AddressFields {
  pincode: string;
  city: string;
  state: string;
}

export function usePincodeLookup(
  address: AddressFields,
  fill: (patch: Partial<Pick<AddressFields, 'city' | 'state'>>) => void,
): PincodeLookup {
  const pincode = address.pincode.trim();
  const [lookup, setLookup] = useState<PincodeLookup>({ status: 'idle' });
  const filledFor = useRef<string | null>(null);

  useEffect(() => {
    if (!WELL_FORMED.test(pincode)) {
      setLookup({ status: 'idle' });
      return;
    }
    const known = answers.get(pincode);
    if (known) {
      setLookup(known);
      return;
    }
    const controller = new AbortController();
    setLookup({ status: 'loading' });
    fetchAnswer(pincode, controller.signal)
      .then((answer) => {
        answers.set(pincode, answer);
        setLookup(answer);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn('[pincode] lookup unavailable', error);
        setLookup({ status: 'unavailable' });
      });
    return () => controller.abort();
  }, [pincode]);

  useEffect(() => {
    if (lookup.status !== 'found' || filledFor.current === lookup.pincode) return;
    filledFor.current = lookup.pincode;
    const patch: Partial<Pick<AddressFields, 'city' | 'state'>> = {};
    const [pinState] = lookup.states;
    if (pinState && !lookup.states.includes(address.state)) patch.state = pinState;
    if (!address.city.trim()) patch.city = lookup.district;
    if (patch.state !== undefined || patch.city !== undefined) fill(patch);
  }, [lookup, address.state, address.city, fill]);

  return lookup;
}
