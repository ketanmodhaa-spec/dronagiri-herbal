'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { AdminCategoryListItem } from '@/lib/admin/admin-category-service';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { TextField } from '@/components/ui/text-field';
import { TextareaField } from '@/components/ui/textarea-field';
import { slugify } from '@/lib/slug';

/** The category list, with inline add and edit. */
export function CategoryManager({ categories }: { categories: AdminCategoryListItem[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      {adding ? (
        <div className="rounded-2xl border border-forest-100 bg-white p-4">
          <CategoryForm mode="create" onDone={() => setAdding(false)} />
        </div>
      ) : (
        <Button
          size="sm"
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
        >
          Add category
        </Button>
      )}

      <div className="divide-y divide-forest-100 overflow-hidden rounded-2xl border border-forest-100 bg-white">
        {categories.length === 0 && <p className="p-6 text-sm text-stone">No categories yet.</p>}
        {categories.map((category) =>
          editingId === category.id ? (
            <div key={category.id} className="p-4">
              <CategoryForm mode="edit" category={category} onDone={() => setEditingId(null)} />
            </div>
          ) : (
            <div key={category.id} className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <p className="font-medium text-forest-900">{category.name}</p>
                <p className="text-xs text-stone">
                  /{category.slug} · {category.productCount}{' '}
                  {category.productCount === 1 ? 'product' : 'products'}
                </p>
              </div>
              {!category.isActive && (
                <span className="rounded-full bg-stone-light/20 px-2 py-0.5 text-xs text-stone">
                  Inactive
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingId(category.id);
                  setAdding(false);
                }}
              >
                Edit
              </Button>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

interface CategoryFormProps {
  mode: 'create' | 'edit';
  category?: AdminCategoryListItem;
  onDone: () => void;
}

function CategoryForm({ mode, category, onDone }: CategoryFormProps) {
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? '');
  const [nameGu, setNameGu] = useState(category?.nameGu ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugLocked, setSlugLocked] = useState(mode === 'edit');
  const [description, setDescription] = useState(category?.description ?? '');
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      nameGu: nameGu.trim(),
      slug: slug.trim(),
      description: description.trim(),
      sortOrder: sortOrder.trim() ? Number(sortOrder) : undefined,
      isActive,
    };

    try {
      const response = await fetch(
        mode === 'create' ? '/api/admin/categories' : `/api/admin/categories/${category?.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (response.ok) {
        router.refresh();
        onDone();
        return;
      }
      const result = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      setError(result?.error?.message ?? 'Could not save the category. Please try again.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugLocked && mode === 'create') setSlug(slugify(e.target.value));
          }}
          required
        />
        <TextField
          label="Name (Gujarati)"
          value={nameGu}
          onChange={(e) => setNameGu(e.target.value)}
        />
        <TextField
          label="URL slug"
          value={slug}
          onChange={(e) => {
            setSlugLocked(true);
            setSlug(e.target.value);
          }}
          required
        />
        <TextField
          label="Sort order"
          type="number"
          min="0"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </div>
      <TextareaField
        label="Description (optional)"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <CheckboxField
        label="Active"
        checked={isActive}
        onChange={(e) => setIsActive(e.target.checked)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Add category' : 'Save'}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
