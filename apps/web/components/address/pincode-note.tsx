/**
 * The line under an address that says where its PIN delivers — "Navrangpura,
 * Ahmadabad, Gujarat" — so a mistyped PIN shows up as the wrong place before
 * the order is placed. A PIN India Post does not list, or one from another
 * state, gets a warning but never blocks. For the delivery address the paid
 * order then waits in "Needs attention" for Sarita to confirm the address;
 * a billing address only has to be checked by whoever is typing it.
 */
import type { PincodeLookup } from '@/components/address/use-pincode-lookup';

interface PincodeNoteProps {
  lookup: PincodeLookup;
  /** The state currently chosen in the form. */
  state: string;
  /** Who is typing: the customer at checkout, or Sarita taking an order. */
  audience: 'customer' | 'admin';
  address: 'delivery' | 'billing';
}

const WARNING = 'rounded-lg bg-gold-light/40 px-3 py-2 text-sm text-forest-900';

/** What happens to an order whose delivery PIN could not be verified. */
const HOLD: Record<PincodeNoteProps['audience'], string> = {
  customer: ' If it is right, you can still place your order: we will confirm your address on WhatsApp before we ship.',
  admin: ' Once paid, the order waits in "Needs attention" until you confirm the address.',
};

export function PincodeNote(props: PincodeNoteProps) {
  return (
    <div aria-live="polite">
      <Message {...props} />
    </div>
  );
}

function Message({ lookup, state, audience, address }: PincodeNoteProps) {
  const hold = address === 'delivery' ? HOLD[audience] : '';

  if (lookup.status === 'not-found') {
    const check = audience === 'customer' ? 'please check it.' : 'check it with the customer.';
    return <p className={WARNING}>{`We couldn't find PIN ${lookup.pincode} in India Post's list — ${check}${hold}`}</p>;
  }

  if (lookup.status !== 'found') return null;

  const pinStates = lookup.states.join(' / ');
  if (state && !lookup.states.includes(state)) {
    const chosen = audience === 'customer' ? `you chose ${state}` : `the state says ${state}`;
    return (
      <p className={WARNING}>
        {`PIN ${lookup.pincode} is in ${pinStates}, but ${chosen}. Please check the PIN or the state.${hold}`}
      </p>
    );
  }

  // The main office names the area; the others are often internal units ("B D Cell …").
  const place = [...lookup.areas.slice(0, 1), lookup.district].join(', ');
  return (
    <p className="text-sm text-stone">
      {address === 'delivery' ? 'Delivering to ' : 'PIN area: '}
      <span className="font-medium text-forest-900">{place}</span>, {state || pinStates}
    </p>
  );
}
