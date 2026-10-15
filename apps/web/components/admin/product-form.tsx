'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import type { Product } from '@dronagiri/db';
import {
  PRODUCT_AROMAS,
  PRODUCT_HAIR_FINISHES,
  PRODUCT_SKIN_FINISHES,
  PRODUCT_TEXTURES,
  type ProductAroma,
} from '@dronagiri/validators';

import { Button } from '@/components/ui/button';
import type { DuplicateProduct } from '@/lib/admin/admin-product-service';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { TextareaField } from '@/components/ui/textarea-field';
import {
  AROMA_HINTS,
  AROMA_LABELS,
  FINISH_LABELS,
  ROUTINE_LABELS,
  TEXTURE_LABELS,
} from '@/lib/products/sensory-labels';
import { slugify } from '@/lib/slug';

interface CategoryOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface ProductFormProps {
  mode: 'create' | 'edit';
  categories: CategoryOption[];
  /** Present in edit mode — prefills the form. */
  product?: Product;
}

/** Form fields are held as strings; numbers are parsed at submit time. */
interface FormState {
  name: string;
  nameGu: string;
  slug: string;
  sku: string;
  categoryId: string;
  tagline: string;
  taglineGu: string;
  description: string;
  descriptionGu: string;
  benefits: string;
  benefitsGu: string;
  ingredients: string;
  ingredientsGu: string;
  howToUse: string;
  howToUseGu: string;
  /** Sensory profile — '' means "not set". */
  texture: string;
  finish: string;
  routine: string;
  routineNote: string;
  routineNoteGu: string;
  priceRupees: string;
  compareRupees: string;
  sizeLabel: string;
  weightGrams: string;
  lowStockThreshold: string;
  sortOrder: string;
  openingStock: string;
}

function initialState(product?: Product): FormState {
  return {
    name: product?.name ?? '',
    nameGu: product?.nameGu ?? '',
    slug: product?.slug ?? '',
    sku: product?.sku ?? '',
    categoryId: product?.categoryId ?? '',
    tagline: product?.tagline ?? '',
    taglineGu: product?.taglineGu ?? '',
    description: product?.description ?? '',
    descriptionGu: product?.descriptionGu ?? '',
    benefits: product?.benefits ?? '',
    benefitsGu: product?.benefitsGu ?? '',
    ingredients: product?.ingredients ?? '',
    ingredientsGu: product?.ingredientsGu ?? '',
    howToUse: product?.howToUse ?? '',
    howToUseGu: product?.howToUseGu ?? '',
    texture: product?.texture ?? '',
    finish: product?.finish ?? '',
    routine: product?.routine ?? '',
    routineNote: product?.routineNote ?? '',
    routineNoteGu: product?.routineNoteGu ?? '',
    priceRupees: product ? String(product.pricePaise / 100) : '',
    compareRupees: product?.comparePaise ? String(product.comparePaise / 100) : '',
    sizeLabel: product?.sizeLabel ?? '',
    weightGrams: product?.weightGrams ? String(product.weightGrams) : '',
    lowStockThreshold: String(product?.lowStockThreshold ?? 10),
    sortOrder: String(product?.sortOrder ?? 0),
    openingStock: '0',
  };
}

/** A select's '' (not set) becomes undefined, so the schema leaves the field empty. */
function choiceOrUndefined(value: string): string | undefined {
  return value.length > 0 ? value : undefined;
}

/** Rupees string → integer paise. Empty/invalid yields a value the schema rejects. */
function toPaise(rupees: string): number {
  return Math.round(Number(rupees) * 100);
}
/** Numeric field → number, or undefined when blank (lets the schema default apply). */
function numOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? Number(trimmed) : undefined;
}

export function ProductForm({ mode, categories, product }: ProductFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(product));
  const [slugLocked, setSlugLocked] = useState(mode === 'edit');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [aromas, setAromas] = useState<ProductAroma[]>(product?.aromas ?? []);
  const [duplicate, setDuplicate] = useState<DuplicateProduct | null>(null);

  // Warn as soon as the name and size match a product already entered, not
  // after the whole form is filled in. Saving is re-checked on the server.
  const productId = product?.id;
  useEffect(() => {
    const name = form.name.trim();
    if (name.length < 3) {
      setDuplicate(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ name });
      if (form.sizeLabel.trim()) query.set('size', form.sizeLabel.trim());
      if (productId) query.set('excludeId', productId);
      fetch(`/api/admin/products/duplicate?${query.toString()}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<{ data?: { duplicate: DuplicateProduct | null } }>)
        .then((result) => setDuplicate(result.data?.duplicate ?? null))
        .catch((fetchError: unknown) => {
          // Aborted because the name changed again, or offline: the server
          // still refuses a duplicate on save, so the early warning can wait.
          if (!(fetchError instanceof DOMException && fetchError.name === 'AbortError')) {
            // eslint-disable-next-line no-console
            console.warn('[product-form] duplicate check failed', fetchError);
          }
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.name, form.sizeLabel, productId]);

  // Kept in the canonical list order, whatever order they were ticked in.
  function toggleAroma(aroma: ProductAroma, on: boolean) {
    setAromas((current) =>
      PRODUCT_AROMAS.filter((candidate) => (candidate === aroma ? on : current.includes(candidate))),
    );
  }

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  // In create mode the slug follows the name until the admin edits it directly.
  function onNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: !slugLocked && mode === 'create' ? slugify(value) : current.slug,
    }));
  }

  // Changing a live product's slug breaks its existing links — warn, don't block.
  const slugWarning =
    mode === 'edit' &&
    product !== undefined &&
    product.isActive &&
    form.slug.trim() !== product.slug;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      nameGu: form.nameGu.trim(),
      slug: form.slug.trim(),
      sku: form.sku.trim(),
      categoryId: form.categoryId,
      tagline: form.tagline.trim(),
      taglineGu: form.taglineGu.trim(),
      description: form.description.trim(),
      descriptionGu: form.descriptionGu.trim(),
      benefits: form.benefits.trim(),
      benefitsGu: form.benefitsGu.trim(),
      ingredients: form.ingredients.trim(),
      ingredientsGu: form.ingredientsGu.trim(),
      howToUse: form.howToUse.trim(),
      howToUseGu: form.howToUseGu.trim(),
      texture: choiceOrUndefined(form.texture),
      aromas,
      finish: choiceOrUndefined(form.finish),
      routine: choiceOrUndefined(form.routine),
      // A time note without leave-on / rinse-off would never be shown; drop it.
      routineNote: form.routine ? form.routineNote.trim() : '',
      routineNoteGu: form.routine ? form.routineNoteGu.trim() : '',
      pricePaise: toPaise(form.priceRupees),
      comparePaise: form.compareRupees.trim() ? toPaise(form.compareRupees) : undefined,
      sizeLabel: form.sizeLabel.trim(),
      weightGrams: numOrUndefined(form.weightGrams),
      lowStockThreshold: numOrUndefined(form.lowStockThreshold),
      sortOrder: numOrUndefined(form.sortOrder),
      isActive,
      isFeatured,
      ...(mode === 'create' ? { openingStock: numOrUndefined(form.openingStock) ?? 0 } : {}),
    };

    try {
      const response = await fetch(
        mode === 'create' ? '/api/admin/products' : `/api/admin/products/${product?.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json().catch(() => null)) as
        | { data?: { product?: { id: string } }; error?: { message?: string } }
        | null;

      if (response.ok && result?.data?.product) {
        if (mode === 'create') {
          router.replace(`/admin/products/${result.data.product.id}`);
          router.refresh();
          return;
        }
        setMessage('Saved.');
        router.refresh();
      } else {
        setError(result?.error?.message ?? 'Could not save the product. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-forest-100 px-3 py-2 text-sm text-forest-800">
          {message}
        </p>
      )}

      {duplicate && (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Product already entered</p>
          <p className="mt-1">
            “{duplicate.name}”{duplicate.sizeLabel ? `, ${duplicate.sizeLabel}` : ''} (SKU{' '}
            {duplicate.sku}) is already in the catalogue
            {duplicate.isActive ? '' : ', marked inactive'}. It cannot be entered twice.{' '}
            <Link href={`/admin/products/${duplicate.id}`} className="font-medium underline">
              Open {duplicate.isActive ? 'it' : 'it and tick Active'}
            </Link>
          </p>
        </div>
      )}

      {/* ── Basics ─────────────────────────────────────────────────────── */}
      <section className="space-y-4 rounded-2xl border border-forest-100 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Product name"
            value={form.name}
            onChange={(e) => onNameChange(e.target.value)}
            required
          />
          <TextField
            label="Name (Gujarati)"
            value={form.nameGu}
            onChange={(e) => set('nameGu', e.target.value)}
          />
          <div>
            <TextField
              label="URL slug"
              hint="Used in the product's web link. Lowercase letters and dashes only."
              value={form.slug}
              onChange={(e) => {
                setSlugLocked(true);
                set('slug', e.target.value);
              }}
              required
            />
            {slugWarning && (
              <p className="mt-1 text-xs text-amber-700">
                ⚠ This product is live. Changing its slug breaks existing links and search
                rankings.
              </p>
            )}
          </div>
          <TextField
            label="SKU"
            hint="Short code you'll type in WhatsApp to restock — e.g. HPP, JH, ASH."
            value={form.sku}
            onChange={(e) => set('sku', e.target.value)}
            required
          />
          <SelectField
            label="Category"
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            required
          >
            <option value="" disabled>
              Select a category…
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </SelectField>
        </div>
      </section>

      {/* ── Pricing & size ─────────────────────────────────────────────── */}
      <section className="space-y-4 rounded-2xl border border-forest-100 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">Pricing &amp; size</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Price (₹)"
            type="number"
            min="0"
            step="0.01"
            value={form.priceRupees}
            onChange={(e) => set('priceRupees', e.target.value)}
            required
          />
          <TextField
            label="Compare-at price (₹) — optional"
            type="number"
            min="0"
            step="0.01"
            value={form.compareRupees}
            onChange={(e) => set('compareRupees', e.target.value)}
          />
          <TextField
            label="Size label — e.g. 100 ml"
            value={form.sizeLabel}
            onChange={(e) => set('sizeLabel', e.target.value)}
          />
          <TextField
            label="Weight (grams) — optional"
            type="number"
            min="0"
            value={form.weightGrams}
            onChange={(e) => set('weightGrams', e.target.value)}
          />
        </div>
      </section>

      {/* ── Inventory & display ────────────────────────────────────────── */}
      <section className="space-y-4 rounded-2xl border border-forest-100 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">Inventory &amp; display</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {mode === 'create' && (
            <TextField
              label="Opening stock"
              type="number"
              min="0"
              value={form.openingStock}
              onChange={(e) => set('openingStock', e.target.value)}
            />
          )}
          <TextField
            label="Low-stock alert at"
            type="number"
            min="0"
            value={form.lowStockThreshold}
            onChange={(e) => set('lowStockThreshold', e.target.value)}
          />
          <TextField
            label="Sort order"
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(e) => set('sortOrder', e.target.value)}
          />
        </div>
        {mode === 'edit' && (
          <p className="text-xs text-stone">
            Stock is adjusted separately, below — every change is recorded in the ledger.
          </p>
        )}
        <div className="flex flex-wrap gap-6 pt-1">
          <CheckboxField
            label="Active"
            hint="Visible in the shop"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <CheckboxField
            label="Featured"
            hint="Shown on the homepage"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
        </div>
      </section>

      {/* ── How it feels ───────────────────────────────────────────────── */}
      <section className="space-y-4 rounded-2xl border border-forest-100 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">How it feels</h2>
        <p className="text-xs text-stone">
          Shown to customers on the product page. Leave any of these blank and that line is
          simply not shown.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Texture"
            value={form.texture}
            onChange={(e) => set('texture', e.target.value)}
          >
            <option value="">Not set</option>
            {PRODUCT_TEXTURES.map((texture) => (
              <option key={texture} value={texture}>
                {TEXTURE_LABELS[texture]}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="How it leaves skin or hair"
            value={form.finish}
            onChange={(e) => set('finish', e.target.value)}
          >
            <option value="">Not set</option>
            <optgroup label="Skin feels">
              {PRODUCT_SKIN_FINISHES.map((finish) => (
                <option key={finish} value={finish}>
                  {FINISH_LABELS[finish]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Hair feels">
              {PRODUCT_HAIR_FINISHES.map((finish) => (
                <option key={finish} value={finish}>
                  {FINISH_LABELS[finish]}
                </option>
              ))}
            </optgroup>
          </SelectField>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-forest-900">
            Aroma <span className="font-normal text-stone">— tick all that apply</span>
          </legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {PRODUCT_AROMAS.map((aroma) => (
              <CheckboxField
                key={aroma}
                id={`aroma-${aroma}`}
                label={AROMA_LABELS[aroma]}
                hint={AROMA_HINTS[aroma]}
                checked={aromas.includes(aroma)}
                onChange={(e) => toggleAroma(aroma, e.target.checked)}
              />
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Routine"
            value={form.routine}
            onChange={(e) => set('routine', e.target.value)}
          >
            <option value="">Not set</option>
            <option value="LEAVE_ON">{ROUTINE_LABELS.LEAVE_ON}</option>
            <option value="RINSE_OFF">{ROUTINE_LABELS.RINSE_OFF}</option>
          </SelectField>
          <TextField
            label="Time needed — optional"
            hint="Short, e.g. 2 hrs on hair · shampoo after 24 hrs"
            maxLength={80}
            value={form.routineNote}
            onChange={(e) => set('routineNote', e.target.value)}
            disabled={!form.routine}
          />
          <TextField
            label="Time needed (Gujarati)"
            maxLength={80}
            value={form.routineNoteGu}
            onChange={(e) => set('routineNoteGu', e.target.value)}
            disabled={!form.routine}
          />
        </div>
      </section>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <section className="space-y-4 rounded-2xl border border-forest-100 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">Content</h2>
        <p className="text-xs text-stone">
          English is required for the description. Gujarati can be filled in over time.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Tagline"
            value={form.tagline}
            onChange={(e) => set('tagline', e.target.value)}
          />
          <TextField
            label="Tagline (Gujarati)"
            value={form.taglineGu}
            onChange={(e) => set('taglineGu', e.target.value)}
          />
        </div>
        <TextareaField
          label="Description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          required
        />
        <TextareaField
          label="Description (Gujarati)"
          value={form.descriptionGu}
          onChange={(e) => set('descriptionGu', e.target.value)}
        />
        <TextareaField
          label="Benefits"
          value={form.benefits}
          onChange={(e) => set('benefits', e.target.value)}
        />
        <TextareaField
          label="Benefits (Gujarati)"
          value={form.benefitsGu}
          onChange={(e) => set('benefitsGu', e.target.value)}
        />
        <TextareaField
          label="Ingredients"
          value={form.ingredients}
          onChange={(e) => set('ingredients', e.target.value)}
        />
        <TextareaField
          label="Ingredients (Gujarati)"
          value={form.ingredientsGu}
          onChange={(e) => set('ingredientsGu', e.target.value)}
        />
        <TextareaField
          label="How to use"
          value={form.howToUse}
          onChange={(e) => set('howToUse', e.target.value)}
        />
        <TextareaField
          label="How to use (Gujarati)"
          value={form.howToUseGu}
          onChange={(e) => set('howToUseGu', e.target.value)}
        />
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting || duplicate !== null}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}
        </Button>
        <Button href="/admin/products" variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
