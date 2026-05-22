'use client';

import { useRef, useState } from 'react';

/** The result handed back once an upload completes. */
export interface UploadResult {
  objectKey: string;
  publicUrl: string;
  width: number | null;
  height: number | null;
}

interface ImageUploadFieldProps {
  scope: 'product' | 'category';
  targetId: string;
  onUploaded: (result: UploadResult) => void;
  disabled?: boolean;
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;
/** Longest edge a stored image needs — larger photos are downscaled to this. */
const MAX_EDGE = 2000;

/**
 * Read an image's pixel size and downscale it when it is larger than MAX_EDGE.
 * Fail-safe: any problem falls back to uploading the original file untouched.
 */
async function prepareImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    if (scale >= 1) {
      bitmap.close();
      return { blob: file, width, height };
    }
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return { blob: file, width, height };
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, file.type, 0.85);
    });
    return blob ? { blob, width: targetW, height: targetH } : { blob: file, width, height };
  } catch {
    return { blob: file, width: 0, height: 0 };
  }
}

/**
 * Pick an image and upload it straight to R2 via a presigned URL. Calls
 * `onUploaded` once the bytes have landed.
 */
export function ImageUploadField({
  scope,
  targetId,
  onUploaded,
  disabled,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError('Please choose a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is larger than 10 MB.');
      return;
    }

    setBusy(true);
    try {
      const { blob, width, height } = await prepareImage(file);

      const presignResponse = await fetch('/api/admin/uploads/presign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope, targetId, contentType: file.type, fileSize: blob.size }),
      });
      const presign = (await presignResponse.json().catch(() => null)) as
        | {
            data?: { uploadUrl: string; objectKey: string; publicUrl: string };
            error?: { message?: string };
          }
        | null;
      if (!presignResponse.ok || !presign?.data) {
        setError(presign?.error?.message ?? 'Could not start the upload.');
        setBusy(false);
        return;
      }

      const putResponse = await fetch(presign.data.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type },
        body: blob,
      });
      if (!putResponse.ok) {
        setError('The image upload failed. Please try again.');
        setBusy(false);
        return;
      }

      onUploaded({
        objectKey: presign.data.objectKey,
        publicUrl: presign.data.publicUrl,
        width: width > 0 ? width : null,
        height: height > 0 ? height : null,
      });
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setBusy(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        disabled={disabled || busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
        className="block w-full text-sm text-stone file:mr-3 file:rounded-full file:border-0 file:bg-forest-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-forest-700 disabled:opacity-60"
      />
      {busy && <p className="mt-1 text-xs text-stone">Uploading…</p>}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
