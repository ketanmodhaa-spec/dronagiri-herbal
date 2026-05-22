'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { Product } from '@dronagiri/db';

import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { TextareaField } from '@/components/ui/textarea-field';
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
    priceRupees: product ? String(product.pricePaise / 100) : '',
    compareRupees: product?.comparePaise ? String(product.comparePaise / 100) : '',
    sizeLabel: product?.sizeLabel ?? '',
    weightGrams: product?.weightGrams ? String(product.weightGrams) : '',
    lowStockThreshold: String(product?.lowStockThreshold ?? 10),
    sortOrder: String(product?.sortOrder ?? 0),
    openingStock: '0',
  };
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
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}
        </Button>
        <Button href="/admin/products" variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
