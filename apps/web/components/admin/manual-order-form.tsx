'use client';

/**
 * Create an order for a customer who asked on WhatsApp or by phone. Sarita
 * fills in who and what; the server prices it, and the order page that opens
 * next has the payment link to send.
 *
 * The running total here is a preview only — the server recomputes prices and
 * shipping from the catalogue and the policy, and never reads a total from
 * this form.
 */
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, type FormEvent } from 'react';

import { PincodeNote } from '@/components/address/pincode-note';
import { usePincodeLookup } from '@/components/address/use-pincode-lookup';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { TextareaField } from '@/components/ui/textarea-field';
import { formatPrice } from '@/lib/format';

export interface OrderableProduct {
  id: string;
  name: string;
  sizeLabel: string | null;
  pricePaise: number;
  stockQty: number;
}

interface ManualOrderFormProps {
  products: OrderableProduct[];
  stateNames: string[];
  defaultState: string;
  freeShippingThresholdPaise: number;
  flatShippingPaise: number;
}

interface Line {
  key: number;
  productId: string;
  quantity: string;
}

const EMPTY_ADDRESS = {
  phone: '',
  recipientName: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  pincode: '',
};

export function ManualOrderForm({
  products,
  stateNames,
  defaultState,
  freeShippingThresholdPaise,
  flatShippingPaise,
}: ManualOrderFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [state, setState] = useState(defaultState);
  const [lines, setLines] = useState<Line[]>([{ key: 0, productId: '', quantity: '1' }]);
  const [waiveShipping, setWaiveShipping] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  // Bulk and business buyers: a separate billing party, optionally with a GSTIN.
  const [separateBilling, setSeparateBilling] = useState(false);
  const [bill, setBill] = useState({ name: '', line1: '', line2: '', city: '', pincode: '', state: defaultState });
  const [gstin, setGstin] = useState('');
  const [businessName, setBusinessName] = useState('');
  // One key per form: a double tap or a retry after a slow network makes one order.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillDelivery = useCallback((patch: { city?: string; state?: string }) => {
    if (patch.city !== undefined) setAddress((current) => ({ ...current, city: patch.city ?? current.city }));
    if (patch.state !== undefined) setState(patch.state);
  }, []);
  const fillBilling = useCallback(
    (patch: { city?: string; state?: string }) => setBill((current) => ({ ...current, ...patch })),
    [],
  );
  const deliveryPin = usePincodeLookup({ pincode: address.pincode, city: address.city, state }, fillDelivery);
  const billingPin = usePincodeLookup(bill, fillBilling);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const subtotalPaise = lines.reduce((sum, line) => {
    const product = productById.get(line.productId);
    const quantity = Number(line.quantity);
    return product && Number.isInteger(quantity) && quantity > 0 ? sum + product.pricePaise * quantity : sum;
  }, 0);
  const belowThreshold = subtotalPaise < freeShippingThresholdPaise;
  const shippingPaise = belowThreshold && !waiveShipping ? flatShippingPaise : 0;

  const setField = (field: keyof typeof EMPTY_ADDRESS, value: string) =>
    setAddress((current) => ({ ...current, [field]: value }));

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const addLine = () =>
    setLines((current) => [...current, { key: Math.max(...current.map((line) => line.key)) + 1, productId: '', quantity: '1' }]);

  const removeLine = (key: number) => setLines((current) => current.filter((line) => line.key !== key));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const items = lines
      .filter((line) => line.productId)
      .map((line) => ({ productId: line.productId, quantity: Number(line.quantity) }));
    if (items.length === 0) {
      setError('Add at least one product.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: {
            recipientName: address.recipientName,
            phone: address.phone.replace(/\D/g, '').slice(-10),
            line1: address.line1,
            line2: address.line2 || undefined,
            landmark: address.landmark || undefined,
            city: address.city,
            state,
            pincode: address.pincode,
          },
          billing: separateBilling
            ? {
                billingAddress: {
                  name: bill.name.trim() || businessName.trim(),
                  line1: bill.line1,
                  line2: bill.line2 || undefined,
                  city: bill.city,
                  state: bill.state,
                  pincode: bill.pincode,
                },
                business: gstin.trim() ? { gstin: gstin.trim(), businessName: businessName.trim() } : undefined,
              }
            : {},
          items,
          waiveShipping,
          internalNote: internalNote || undefined,
          idempotencyKey,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: { id: string }; error?: { message?: string } }
        | null;
      if (response.ok && payload?.data) {
        router.push(`/admin/orders/${payload.data.id}`);
        return;
      }
      setError(
        response.status === 401
          ? 'Your session has expired. Refresh the page to sign in again.'
          : (payload?.error?.message ?? 'Could not create the order. Please try again.'),
      );
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-forest-100 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Customer</h2>
        <TextField
          label="Mobile number"
          name="phone"
          inputMode="numeric"
          autoComplete="off"
          placeholder="10-digit mobile"
          hint="The customer's identity. The pay link is sent here on WhatsApp."
          value={address.phone}
          onChange={(event) => setField('phone', event.target.value)}
          required
        />
        <TextField
          label="Name"
          name="recipientName"
          value={address.recipientName}
          onChange={(event) => setField('recipientName', event.target.value)}
          required
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-forest-100 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Delivery address</h2>
        <TextField
          label="House, building, street"
          name="line1"
          value={address.line1}
          onChange={(event) => setField('line1', event.target.value)}
          required
        />
        <TextField
          label="Area (optional)"
          name="line2"
          value={address.line2}
          onChange={(event) => setField('line2', event.target.value)}
        />
        <TextField
          label="Landmark (optional)"
          name="landmark"
          value={address.landmark}
          onChange={(event) => setField('landmark', event.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="PIN code"
            name="pincode"
            inputMode="numeric"
            maxLength={6}
            value={address.pincode}
            onChange={(event) => setField('pincode', event.target.value)}
            required
          />
          <TextField
            label="City"
            name="city"
            value={address.city}
            onChange={(event) => setField('city', event.target.value)}
            required
          />
        </div>
        <SelectField label="State" name="state" value={state} onChange={(event) => setState(event.target.value)}>
          {stateNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </SelectField>
        <PincodeNote lookup={deliveryPin} state={state} audience="admin" address="delivery" />
      </section>

      <section className="space-y-4 rounded-2xl border border-forest-100 bg-white p-5">
        <CheckboxField
          label="Bill to a business, or a different address"
          hint="For bulk and business buyers. With a GSTIN, their GST invoice shows it so they can claim input tax credit."
          checked={separateBilling}
          onChange={(event) => setSeparateBilling(event.target.checked)}
        />
        {separateBilling && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="GSTIN (optional)"
                name="gstin"
                maxLength={15}
                placeholder="e.g. 24ABCDE1234F1Z5"
                value={gstin}
                onChange={(event) => setGstin(event.target.value.toUpperCase())}
              />
              <TextField
                label="Business / billing name"
                name="businessName"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
              />
            </div>
            <TextField
              label="Billing address — house, building, street"
              name="billLine1"
              value={bill.line1}
              onChange={(event) => setBill((current) => ({ ...current, line1: event.target.value }))}
            />
            <TextField
              label="Area (optional)"
              name="billLine2"
              value={bill.line2}
              onChange={(event) => setBill((current) => ({ ...current, line2: event.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="PIN code"
                name="billPincode"
                inputMode="numeric"
                maxLength={6}
                value={bill.pincode}
                onChange={(event) => setBill((current) => ({ ...current, pincode: event.target.value }))}
              />
              <TextField
                label="City"
                name="billCity"
                value={bill.city}
                onChange={(event) => setBill((current) => ({ ...current, city: event.target.value }))}
              />
            </div>
            <SelectField
              label="Billing state — must be the GSTIN's state"
              name="billState"
              value={bill.state}
              onChange={(event) => setBill((current) => ({ ...current, state: event.target.value }))}
            >
              {stateNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </SelectField>
            <PincodeNote lookup={billingPin} state={bill.state} audience="admin" address="billing" />
          </>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-forest-100 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Products</h2>
        {lines.map((line, index) => {
          const chosen = productById.get(line.productId);
          return (
            <div key={line.key} className="space-y-2 border-b border-forest-50 pb-4 last:border-0 last:pb-0">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <SelectField
                    label={`Product ${index + 1}`}
                    name={`product-${line.key}`}
                    value={line.productId}
                    onChange={(event) => setLine(line.key, { productId: event.target.value })}
                  >
                    <option value="">Choose a product…</option>
                    {products.map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                        disabled={product.stockQty === 0 || lines.some((other) => other.key !== line.key && other.productId === product.id)}
                      >
                        {product.name}
                        {product.sizeLabel ? ` (${product.sizeLabel})` : ''} — {formatPrice(product.pricePaise)}
                        {product.stockQty === 0 ? ' · out of stock' : ''}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="w-20">
                  <TextField
                    label="Qty"
                    name={`qty-${line.key}`}
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(event) => setLine(line.key, { quantity: event.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-stone">
                <span>{chosen ? `${chosen.stockQty} in stock` : ''}</span>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(line.key)} className="text-red-700 hover:underline">
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <Button type="button" variant="secondary" size="sm" onClick={addLine}>
          + Add another product
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-forest-100 bg-white p-5">
        <dl className="space-y-1 text-sm text-forest-900">
          <div className="flex justify-between">
            <dt>Products</dt>
            <dd>{formatPrice(subtotalPaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{shippingPaise === 0 ? 'Free' : formatPrice(shippingPaise)}</dd>
          </div>
          <div className="flex justify-between border-t border-forest-100 pt-2 text-base font-semibold">
            <dt>Customer pays</dt>
            <dd>{formatPrice(subtotalPaise + shippingPaise)}</dd>
          </div>
        </dl>
        {belowThreshold && subtotalPaise > 0 && (
          <CheckboxField
            label="Waive shipping"
            hint={`Normally ${formatPrice(flatShippingPaise)} below ${formatPrice(freeShippingThresholdPaise)}`}
            checked={waiveShipping}
            onChange={(event) => setWaiveShipping(event.target.checked)}
          />
        )}
        <TextareaField
          label="Note for yourself (optional)"
          name="internalNote"
          rows={2}
          hint="Only you see this — e.g. “Muhurt order, Dussehra 2026”."
          value={internalNote}
          onChange={(event) => setInternalNote(event.target.value)}
        />
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? 'Creating…' : 'Create order and get pay link'}
      </Button>
    </form>
  );
}
