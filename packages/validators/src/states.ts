/**
 * Indian states and union territories, keyed by their GST state code.
 *
 * The code is what GST cares about: it opens every GSTIN (`24…` is Gujarat)
 * and it decides the tax type on an invoice — a delivery inside the seller's
 * state is taxed CGST + SGST, anywhere else IGST. Storing the state as one of
 * these codes rather than free text is what makes that decision exact.
 *
 * Codes follow the GST portal's current list, including the merged Dadra and
 * Nagar Haveli and Daman and Diu (26) and Ladakh (38). Retired codes (25, 28)
 * are deliberately absent.
 */
import { z } from 'zod';

export const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
] as const;

export type IndianStateCode = (typeof INDIAN_STATES)[number]['code'];

const STATE_CODES = INDIAN_STATES.map((state) => state.code) as [
  IndianStateCode,
  ...IndianStateCode[],
];

/** A GST state code from `INDIAN_STATES`. */
export const indianStateCodeSchema = z.enum(STATE_CODES, { error: 'Choose a state' });

/** The display name for a GST state code. */
export function stateName(code: IndianStateCode): string {
  const state = INDIAN_STATES.find((entry) => entry.code === code);
  if (!state) {
    // Unreachable for a value typed as IndianStateCode; guards against unchecked casts.
    throw new Error(`Unknown GST state code: ${code}`);
  }
  return state.name;
}
