'use client';

/**
 * Checkout — who it goes to, who is billed, consent; then on to payment.
 *
 * The cart shown here is the server's (useCart), and the request sends no
 * items or amounts: the server places the order from the session's cart at
 * catalogue prices. The form is validated with the same schema the server
 * uses, so every message appears under the field it is about.
 */
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type ReactNode,
} from 'react';

import type { CartView } from '@dronagiri/types';
import {
  checkoutRequestSchema,
  INDIAN_STATES,
  normaliseIndianMobile,
  shippingAddressSchema,
} from '@dronagiri/validators';

import { PincodeNote } from '@/components/address/pincode-note';
import { usePincodeLookup } from '@/components/address/use-pincode-lookup';
import { useCart } from '@/components/cart/cart-provider';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { Container } from '@/components/ui/container';
import { LeafIcon, LockIcon } from '@/components/ui/icons';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';

interface CheckoutFormProps {
  /** Flat shipping below the free-shipping threshold, in paise (the policy's ₹49). */
  flatShippingPaise: number;
  /** The marketing-consent wording, exactly as it is stored with each consent. */
  consentText: string;
}

const DELIVERY = { phone: '', recipientName: '', line1: '', line2: '', landmark: '', city: '', pincode: '', state: '' };
const BILLING = { name: '', line1: '', line2: '', city: '', pincode: '', state: '' };

type Errors = Record<string, string>;

/** Checked the moment the customer leaves the field, so a typo shows before the final button. */
type CheckedField = 'phone' | 'recipientName';

const blankToUndefined = (value: string) => (value.trim() ? value.trim() : undefined);

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-forest-100 bg-white p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-3 font-display text-xl font-semibold text-forest-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-800 font-body text-sm text-white">
          {step}
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Steps() {
  const steps = ['Cart', 'Details', 'Payment'];
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Checkout progress">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          <span
            aria-current={index === 1 ? 'step' : undefined}
            className={cn(index === 1 ? 'font-semibold text-forest-900' : 'text-stone', index < 1 && 'text-forest-700')}
          >
            {step}
          </span>
          {index < steps.length - 1 && <span className="text-stone-light">›</span>}
        </li>
      ))}
    </ol>
  );
}

function OrderLines({ cart }: { cart: CartView }) {
  return (
    <ul className="divide-y divide-forest-100">
      {cart.lines.map((line) => (
        <li key={line.productId} className="flex items-center gap-3 py-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-forest-50">
            {line.image ? (
              <Image src={line.image.url} alt={line.image.alt ?? line.name} fill sizes="56px" className="object-cover" />
            ) : (
              <LeafIcon className="absolute inset-0 m-auto h-6 w-6 text-forest-600" />
            )}
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-800 px-1 text-[11px] font-semibold text-white">
              {line.quantity}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-forest-900">{line.name}</p>
            {line.sizeLabel && <p className="text-xs text-stone">{line.sizeLabel}</p>}
          </div>
          <span className="text-sm text-forest-900">{formatPrice(line.lineTotalPaise)}</span>
        </li>
      ))}
    </ul>
  );
}

function Totals({ cart, shippingPaise }: { cart: CartView; shippingPaise: number }) {
  return (
    <dl className="space-y-2 border-t border-forest-100 pt-4 text-sm">
      <div className="flex justify-between text-stone">
        <dt>Subtotal</dt>
        <dd>{formatPrice(cart.subtotalPaise)}</dd>
      </div>
      <div className="flex justify-between text-stone">
        <dt>Shipping</dt>
        <dd>{shippingPaise === 0 ? 'Free' : formatPrice(shippingPaise)}</dd>
      </div>
      {!cart.freeShipping.unlocked && (
        <p className="text-xs text-stone-light">
          Free shipping on orders of {formatPrice(cart.freeShipping.thresholdPaise)} or more.
        </p>
      )}
      <div className="flex justify-between border-t border-forest-100 pt-3 font-display text-lg font-semibold text-forest-900">
        <dt>Total</dt>
        <dd>{formatPrice(cart.subtotalPaise + shippingPaise)}</dd>
      </div>
      <p className="text-xs text-stone">Prices include GST.</p>
    </dl>
  );
}

export function CheckoutForm({ flatShippingPaise, consentText }: CheckoutFormProps) {
  const router = useRouter();
  const { cart, closeDrawer, openDrawer } = useCart();
  const [delivery, setDelivery] = useState(DELIVERY);
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState(BILLING);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [gstin, setGstin] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  // One key per visit to checkout: a double tap or a retry places one order.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<{ message: string; reviewCart: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const fillDelivery = useCallback(
    (patch: Partial<typeof DELIVERY>) => setDelivery((current) => ({ ...current, ...patch })),
    [],
  );
  const fillBilling = useCallback(
    (patch: Partial<typeof BILLING>) => setBilling((current) => ({ ...current, ...patch })),
    [],
  );
  const deliveryPin = usePincodeLookup(delivery, fillDelivery);
  const billingPin = usePincodeLookup(billing, fillBilling);

  // Arriving from the cart drawer: close it once, so the form is not hidden
  // behind it — not on every render, or "Edit cart" could never open it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => closeDrawer(), []);

  // A GSTIN's first two digits are its state: preselect it for the billing address.
  useEffect(() => {
    if (!businessOpen) return;
    const state = INDIAN_STATES.find((entry) => entry.code === gstin.trim().slice(0, 2));
    if (state && gstin.trim().length >= 2) setBilling((current) => ({ ...current, state: state.name }));
  }, [businessOpen, gstin]);

  if (cart === null) {
    return (
      <Container className="py-16">
        <p className="text-center text-stone">Loading your cart…</p>
      </Container>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <Container className="max-w-xl py-16 text-center">
        <h1 className="font-display text-3xl font-semibold text-forest-900">Your cart is empty</h1>
        <p className="mt-3 text-stone">Add a product or two, then come back to check out.</p>
        <Button href="/shop" size="lg" className="mt-8">
          Browse the collection
        </Button>
      </Container>
    );
  }

  const shippingPaise = cart.freeShipping.unlocked ? 0 : flatShippingPaise;
  const totalPaise = cart.subtotalPaise + shippingPaise;
  const needsBilling = !billingSame || businessOpen;

  const setDeliveryField = (field: keyof typeof DELIVERY, value: string) =>
    setDelivery((current) => ({ ...current, [field]: value }));
  const setBillingField = (field: keyof typeof BILLING, value: string) =>
    setBilling((current) => ({ ...current, [field]: value }));

  /** Flag or clear one delivery field's error from its current value. */
  function checkDeliveryField(field: CheckedField, raw: string) {
    const value = field === 'phone' ? normaliseIndianMobile(raw) : raw;
    const result = shippingAddressSchema.shape[field].safeParse(value);
    const path = `shippingAddress.${field}`;
    setErrors((current) => {
      const next = { ...current };
      if (result.success) delete next[path];
      else next[path] = result.error.issues[0]?.message ?? 'Please check this field';
      return next;
    });
  }

  /** Typing fixes an error as soon as the value is right; leaving the field flags a wrong one. */
  const checkedFieldProps = (field: CheckedField) => ({
    value: delivery[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setDeliveryField(field, event.target.value);
      if (errors[`shippingAddress.${field}`]) checkDeliveryField(field, event.target.value);
    },
    onBlur: (event: FocusEvent<HTMLInputElement>) => {
      if (event.target.value.trim()) checkDeliveryField(field, event.target.value);
    },
  });

  function openBusiness() {
    setBusinessOpen(true);
    setBillingSame(false);
  }

  function buildRequest() {
    return {
      shippingAddress: {
        recipientName: delivery.recipientName.trim(),
        phone: normaliseIndianMobile(delivery.phone),
        line1: delivery.line1.trim(),
        line2: blankToUndefined(delivery.line2),
        landmark: blankToUndefined(delivery.landmark),
        city: delivery.city.trim(),
        state: delivery.state,
        pincode: delivery.pincode.trim(),
      },
      billing: {
        billingAddress: needsBilling
          ? {
              name: (billing.name.trim() || businessName.trim()),
              line1: billing.line1.trim(),
              line2: blankToUndefined(billing.line2),
              city: billing.city.trim(),
              state: billing.state,
              pincode: billing.pincode.trim(),
            }
          : undefined,
        business: businessOpen ? { gstin: gstin.trim(), businessName: businessName.trim() } : undefined,
      },
      marketingConsent: marketing,
      acceptTerms,
      idempotencyKey,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const request = buildRequest();
    const parsed = checkoutRequestSchema.safeParse(request);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        next[key] ??= issue.message;
      }
      setErrors(next);
      document.getElementById(`field-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: { payPath: string }; error?: { code?: string; message?: string } }
        | null;
      if (response.ok && payload?.data) {
        router.push(payload.data.payPath);
        return;
      }
      setFormError({
        message: payload?.error?.message ?? 'We could not place your order. Please try again.',
        reviewCart: payload?.error?.code === 'CART_CHANGED' || payload?.error?.code === 'STOCK_SHORT',
      });
    } catch {
      setFormError({ message: 'We could not reach the shop. Check your connection and try again.', reviewCart: false });
    }
    setBusy(false);
  }

  const err = (path: string) => errors[path];
  const id = (path: string) => `field-${path}`;

  return (
    <Container className="py-8 md:py-12">
      <Steps />
      <h1 className="mt-3 font-display text-3xl font-semibold text-forest-900 sm:text-4xl">Checkout</h1>

      {/* On a phone the summary comes first, folded; on a wide screen it sits beside the form. */}
      <details className="mt-6 rounded-2xl border border-forest-100 bg-white p-4 lg:hidden">
        <summary className="flex cursor-pointer items-center justify-between font-medium text-forest-900">
          <span>Order summary · {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'}</span>
          <span className="font-display text-lg">{formatPrice(totalPaise)}</span>
        </summary>
        <div className="mt-3">
          <OrderLines cart={cart} />
          <Totals cart={cart} shippingPaise={shippingPaise} />
        </div>
      </details>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={submit} noValidate className="space-y-6">
          <Section step={1} title="Delivery address">
            <TextField
              id={id('shippingAddress.phone')}
              label="Mobile number"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="10-digit mobile"
              hint="Order updates come to this number on WhatsApp."
              {...checkedFieldProps('phone')}
              error={err('shippingAddress.phone')}
            />
            <TextField
              id={id('shippingAddress.recipientName')}
              label="Full name"
              autoComplete="name"
              {...checkedFieldProps('recipientName')}
              error={err('shippingAddress.recipientName')}
            />
            <TextField
              id={id('shippingAddress.line1')}
              label="House / flat, building, street"
              autoComplete="address-line1"
              value={delivery.line1}
              onChange={(event) => setDeliveryField('line1', event.target.value)}
              error={err('shippingAddress.line1')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id={id('shippingAddress.line2')}
                label="Area (optional)"
                autoComplete="address-line2"
                value={delivery.line2}
                onChange={(event) => setDeliveryField('line2', event.target.value)}
                error={err('shippingAddress.line2')}
              />
              <TextField
                id={id('shippingAddress.landmark')}
                label="Landmark (optional)"
                value={delivery.landmark}
                onChange={(event) => setDeliveryField('landmark', event.target.value)}
                error={err('shippingAddress.landmark')}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                id={id('shippingAddress.pincode')}
                label="PIN code"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={delivery.pincode}
                onChange={(event) => setDeliveryField('pincode', event.target.value)}
                error={err('shippingAddress.pincode')}
              />
              <TextField
                id={id('shippingAddress.city')}
                label="City"
                autoComplete="address-level2"
                value={delivery.city}
                onChange={(event) => setDeliveryField('city', event.target.value)}
                error={err('shippingAddress.city')}
              />
              <SelectField
                id={id('shippingAddress.state')}
                label="State"
                autoComplete="address-level1"
                value={delivery.state}
                onChange={(event) => setDeliveryField('state', event.target.value)}
                error={err('shippingAddress.state')}
              >
                <option value="">Choose…</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <PincodeNote lookup={deliveryPin} state={delivery.state} audience="customer" address="delivery" />
            {!businessOpen && (
              <CheckboxField
                name="billingSame"
                label="Billing address is the same as delivery"
                checked={billingSame}
                onChange={(event) => setBillingSame(event.target.checked)}
              />
            )}
          </Section>

          {needsBilling && (
            <Section step={2} title="Billing address">
              {businessOpen ? (
                <p className="text-sm text-stone">
                  The address your GSTIN is registered at — it appears on your GST invoice.
                </p>
              ) : (
                <p className="text-sm text-stone">For a gift or an office — the bill goes to this name and address.</p>
              )}
              {!businessOpen && (
                <TextField
                  id={id('billing.billingAddress.name')}
                  label="Name on the bill"
                  autoComplete="billing name"
                  value={billing.name}
                  onChange={(event) => setBillingField('name', event.target.value)}
                  error={err('billing.billingAddress.name')}
                />
              )}
              <TextField
                id={id('billing.billingAddress.line1')}
                label="House / flat, building, street"
                autoComplete="billing address-line1"
                value={billing.line1}
                onChange={(event) => setBillingField('line1', event.target.value)}
                error={err('billing.billingAddress.line1')}
              />
              <TextField
                id={id('billing.billingAddress.line2')}
                label="Area (optional)"
                autoComplete="billing address-line2"
                value={billing.line2}
                onChange={(event) => setBillingField('line2', event.target.value)}
                error={err('billing.billingAddress.line2')}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  id={id('billing.billingAddress.pincode')}
                  label="PIN code"
                  inputMode="numeric"
                  autoComplete="billing postal-code"
                  maxLength={6}
                  value={billing.pincode}
                  onChange={(event) => setBillingField('pincode', event.target.value)}
                  error={err('billing.billingAddress.pincode')}
                />
                <TextField
                  id={id('billing.billingAddress.city')}
                  label="City"
                  autoComplete="billing address-level2"
                  value={billing.city}
                  onChange={(event) => setBillingField('city', event.target.value)}
                  error={err('billing.billingAddress.city')}
                />
                <SelectField
                  id={id('billing.billingAddress.state')}
                  label="State"
                  value={billing.state}
                  onChange={(event) => setBillingField('state', event.target.value)}
                  error={err('billing.billingAddress.state')}
                >
                  <option value="">Choose…</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state.code} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <PincodeNote lookup={billingPin} state={billing.state} audience="customer" address="billing" />
            </Section>
          )}

          <section className="rounded-2xl border border-dashed border-forest-200 bg-white/60 p-5 sm:p-6">
            {businessOpen ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-forest-900">Business purchase</h2>
                    <p className="mt-1 text-sm text-stone">
                      Your GST invoice will show your GSTIN, so you can claim input tax credit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBusinessOpen(false)}
                    className="shrink-0 text-sm text-stone underline underline-offset-2 hover:text-forest-800"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id={id('billing.business.gstin')}
                    label="GSTIN"
                    placeholder="15 characters, e.g. 24ABCDE1234F1Z5"
                    maxLength={15}
                    autoCapitalize="characters"
                    value={gstin}
                    onChange={(event) => setGstin(event.target.value.toUpperCase())}
                    error={err('billing.business.gstin')}
                  />
                  <TextField
                    id={id('billing.business.businessName')}
                    label="Business name (as on GST certificate)"
                    autoComplete="organization"
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    error={err('billing.business.businessName')}
                  />
                </div>
              </div>
            ) : (
              <button type="button" onClick={openBusiness} className="w-full text-left">
                <span className="font-display text-lg font-semibold text-forest-900">Buying for your business?</span>
                <span className="mt-1 block text-sm text-stone">
                  Add your GSTIN to get a GST invoice you can claim input tax credit on.{' '}
                  <span className="font-medium text-forest-800 underline underline-offset-2">Add GSTIN</span>
                </span>
              </button>
            )}
          </section>

          <Section step={needsBilling ? 3 : 2} title="Confirm and pay">
            <CheckboxField
              id={id('acceptTerms')}
              name="acceptTerms"
              label="I agree to the Terms, the Privacy Policy and the Refund Policy."
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
            />
            <p className="-mt-2 pl-7 text-xs text-stone">
              <Link href="/terms" target="_blank" className="underline underline-offset-2">Terms</Link>
              {' · '}
              <Link href="/privacy" target="_blank" className="underline underline-offset-2">Privacy Policy</Link>
              {' · '}
              <Link href="/refund-policy" target="_blank" className="underline underline-offset-2">Refund Policy</Link>
            </p>
            {err('acceptTerms') && (
              <p role="alert" className="-mt-2 pl-7 text-xs text-red-700">
                {err('acceptTerms')}
              </p>
            )}
            <CheckboxField
              name="marketingConsent"
              label={consentText}
              hint="Optional — order updates come either way."
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
            />

            {formError && (
              <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                <p>{formError.message}</p>
                {formError.reviewCart && (
                  <button type="button" onClick={openDrawer} className="mt-1 font-medium underline underline-offset-2">
                    Review your cart
                  </button>
                )}
              </div>
            )}

            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy ? 'Placing your order…' : `Continue to payment · ${formatPrice(totalPaise)}`}
            </Button>
            <p className="flex items-center justify-center gap-2 text-xs text-stone">
              <LockIcon className="h-3.5 w-3.5" />
              Secure payment by Razorpay — UPI, cards and netbanking.
            </p>
          </Section>
        </form>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-forest-100 bg-white p-6">
            <h2 className="font-display text-xl font-semibold text-forest-900">Order summary</h2>
            <div className="mt-2">
              <OrderLines cart={cart} />
            </div>
            <Totals cart={cart} shippingPaise={shippingPaise} />
            <button
              type="button"
              onClick={openDrawer}
              className="mt-4 text-sm text-forest-800 underline underline-offset-2"
            >
              Edit cart
            </button>
          </div>
        </aside>
      </div>
    </Container>
  );
}
