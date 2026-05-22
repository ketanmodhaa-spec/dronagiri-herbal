/**
 * Cloudflare R2 — object storage for product and category images.
 *
 * R2 is S3-compatible, so the AWS S3 SDK drives it. This module is the only
 * place that talks to R2: it issues presigned upload URLs, inspects objects
 * after upload, and deletes them. Node runtime only.
 */
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { config } from '@/lib/config';
import { serverConfig } from '@/lib/config.server';

/** Presigned upload URLs are valid for five minutes. */
const PRESIGN_TTL_SECONDS = 300;

let client: S3Client | undefined;
function r2(): S3Client {
  client ??= new S3Client({
    region: 'auto',
    endpoint: serverConfig.r2.endpoint,
    credentials: {
      accessKeyId: serverConfig.r2.accessKeyId,
      secretAccessKey: serverConfig.r2.secretAccessKey,
    },
  });
  return client;
}

/** A presigned `PUT` URL the browser uploads to directly, pinned to one content type. */
export async function presignUpload(objectKey: string, contentType: string): Promise<string> {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: serverConfig.r2.bucket,
      Key: objectKey,
      ContentType: contentType,
    }),
    { expiresIn: PRESIGN_TTL_SECONDS },
  );
}

/** What an object's HEAD reports. */
export interface ObjectHead {
  contentLength: number;
  contentType: string;
}

/** Inspect an uploaded object. Returns null when it is absent. */
export async function headObject(objectKey: string): Promise<ObjectHead | null> {
  try {
    const result = await r2().send(
      new HeadObjectCommand({ Bucket: serverConfig.r2.bucket, Key: objectKey }),
    );
    return {
      contentLength: result.ContentLength ?? 0,
      contentType: result.ContentType ?? '',
    };
  } catch {
    return null;
  }
}

/** Delete an object. Idempotent — deleting a missing key is not an error. */
export async function deleteObject(objectKey: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: serverConfig.r2.bucket, Key: objectKey }));
}

/** The public URL an object is served from. */
export function publicUrl(objectKey: string): string {
  return `${config.cdnUrl}/${objectKey}`;
}

/** Recover the object key from a public URL — used when an image is deleted. */
export function objectKeyFromUrl(url: string): string | null {
  if (config.cdnUrl.length === 0) return null;
  const base = `${config.cdnUrl}/`;
  return url.startsWith(base) ? url.slice(base.length) : null;
}
