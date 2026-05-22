'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { ProductImage } from '@dronagiri/db';

import { ImageUploadField, type UploadResult } from '@/components/admin/image-upload-field';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

interface ProductImageManagerProps {
  productId: string;
  images: ProductImage[];
}

/** The image panel on the product edit page — list, add, edit alt text, delete. */
export function ProductImageManager({ productId, images }: ProductImageManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmUpload(result: UploadResult) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          objectKey: result.objectKey,
          width: result.width ?? undefined,
          height: result.height ?? undefined,
        }),
      });
      if (response.ok) {
        router.refresh();
      } else {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(payload?.error?.message ?? 'Could not save the image.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    }
    setBusy(false);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-forest-100 bg-white p-6">
      <h2 className="font-display text-lg font-semibold text-forest-900">Images</h2>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {images.length === 0 ? (
        <p className="text-sm text-stone">No images yet — upload the first one below.</p>
      ) : (
        <ul className="space-y-3">
          {images.map((image, index) => (
            <ProductImageRow
              key={image.id}
              productId={productId}
              image={image}
              isHero={index === 0}
            />
          ))}
        </ul>
      )}

      <div className="border-t border-forest-100 pt-4">
        <p className="mb-2 text-sm font-medium text-forest-900">Add an image</p>
        <ImageUploadField
          scope="product"
          targetId={productId}
          onUploaded={confirmUpload}
          disabled={busy}
        />
        <p className="mt-1.5 text-xs text-stone">
          JPEG, PNG or WebP, up to 10 MB. Large photos are resized automatically. The first
          image (lowest sort order) is the hero shown on the shop.
        </p>
      </div>
    </section>
  );
}

interface ProductImageRowProps {
  productId: string;
  image: ProductImage;
  isHero: boolean;
}

function ProductImageRow({ productId, image, isHero }: ProductImageRowProps) {
  const router = useRouter();
  const [alt, setAlt] = useState(image.alt ?? '');
  const [altGu, setAltGu] = useState(image.altGu ?? '');
  const [sortOrder, setSortOrder] = useState(String(image.sortOrder));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setMessage(null);
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/images/${image.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ alt, altGu, sortOrder: Number(sortOrder) }),
      });
      if (response.ok) {
        setMessage('Saved.');
        router.refresh();
      } else {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(payload?.error?.message ?? 'Could not save.');
      }
    } catch {
      setError('Could not reach the server.');
    }
    setBusy(false);
  }

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/images/${image.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.refresh();
      } else {
        setError('Could not delete the image.');
        setBusy(false);
      }
    } catch {
      setError('Could not reach the server.');
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-forest-100 p-3 sm:flex-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt ?? ''}
        className="h-24 w-24 shrink-0 rounded-lg bg-forest-50 object-cover"
      />
      <div className="flex-1 space-y-2">
        {isHero && (
          <span className="inline-block rounded-full bg-forest-100 px-2 py-0.5 text-xs text-gold">
            Hero image
          </span>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <TextField label="Alt text" value={alt} onChange={(e) => setAlt(e.target.value)} />
          <TextField
            label="Alt text (Gujarati)"
            value={altGu}
            onChange={(e) => setAltGu(e.target.value)}
          />
          <TextField
            label="Sort order"
            type="number"
            min="0"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        {message && <p className="text-xs text-forest-700">{message}</p>}
        {error && <p className="text-xs text-red-700">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
}
