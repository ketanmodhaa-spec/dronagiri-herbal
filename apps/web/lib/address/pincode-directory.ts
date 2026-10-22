/**
 * India Post PIN code directory — is a PIN real, and where is it?
 *
 * The data (pincode-directory.json, ~19,000 PINs) is built from India Post's
 * official directory by scripts/build-pincode-directory.mjs and ships with the
 * server. It never reaches the browser: the checkout asks /api/pincode/[pin].
 *
 * A PIN missing from the directory is not necessarily wrong — India Post adds
 * PINs between releases — so an unknown PIN never blocks an order. It holds the
 * paid order for Sarita to confirm the address instead.
 */
import { INDIAN_STATES, stateCodeForName, stateName, type IndianStateCode } from '@dronagiri/validators';

import directory from './pincode-directory.json';

export interface PincodeInfo {
  pincode: string;
  /** Usually one. A few PINs straddle a state border and list both. */
  stateCodes: IndianStateCode[];
  district: string;
  /** Up to three post office areas the PIN serves, best known first. */
  areas: string[];
}

const KNOWN_CODES = new Set<string>(INDIAN_STATES.map((state) => state.code));

function isStateCode(code: string): code is IndianStateCode {
  return KNOWN_CODES.has(code);
}

let index: Map<string, PincodeInfo> | null = null;

/** Parsed on first use: `pin|stateCodes|district|areas` per line. */
function pincodeIndex(): Map<string, PincodeInfo> {
  if (index) return index;
  index = new Map();
  for (const line of directory.pins.split('\n')) {
    const [pincode, codes, district, areas] = line.split('|');
    if (!pincode || !codes || !district || areas === undefined) continue;
    index.set(pincode, {
      pincode,
      stateCodes: codes.split(',').filter(isStateCode),
      district,
      areas: areas ? areas.split(';') : [],
    });
  }
  return index;
}

export function lookupPincode(pincode: string): PincodeInfo | null {
  return pincodeIndex().get(pincode.trim()) ?? null;
}

/**
 * Why a delivery address needs a human check before it ships, or null when
 * the PIN is in the directory and belongs to the chosen state.
 */
export function unverifiedDeliveryReason(pincode: string, state: string): string | null {
  const info = lookupPincode(pincode);
  if (!info) {
    return (
      `Delivery PIN ${pincode} is not in India Post's directory. ` +
      'Confirm the address with the customer on WhatsApp before packing.'
    );
  }
  const code = stateCodeForName(state);
  if (code && info.stateCodes.includes(code)) return null;
  const pinStates = info.stateCodes.map(stateName).join(' / ');
  return (
    `Delivery PIN ${pincode} is in ${pinStates}, but the address says ${state}. ` +
    'Confirm the address with the customer on WhatsApp before packing.'
  );
}
