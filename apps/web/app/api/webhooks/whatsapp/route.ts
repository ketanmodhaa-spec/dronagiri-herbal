/**
 * Meta WhatsApp Business API webhook receiver.
 *
 * This endpoint serves two purposes:
 *
 *   1. **GET handshake** — Meta calls our URL with `hub.mode=subscribe` and
 *      a `hub.verify_token` before allowing template submission. We echo
 *      `hub.challenge` only when the token matches what we set in Meta.
 *
 *   2. **POST events** — Meta posts every status update for outbound messages
 *      (sent / delivered / read / failed) and every inbound message Sarita
 *      receives. Each POST is HMAC-SHA256-signed with our App Secret.
 *
 * The receiver is *always* live, regardless of `ENABLE_WHATSAPP`. Meta needs
 * to verify the webhook URL before we can submit templates for approval — so
 * this code unblocks the rest of the WhatsApp work even with sending disabled.
 *
 * Stage 1 scope: status updates patch `NotificationLog`; inbound messages
 * are logged for later inspection (RESTOCK parser lands in Stage 2). The
 * route never throws — Meta retries with backoff on non-200, which means a
 * crash here can flood our endpoint.
 */

import { type NextRequest } from 'next/server';

import { prisma } from '@dronagiri/db';

import { serverConfig } from '@/lib/config.server';
import { verifyWhatsAppSignature } from '@/lib/notifications/whatsapp/signature';

/** Node runtime — `node:crypto` (used by the signature helper) isn't on edge. */
export const runtime = 'nodejs';
/** Force-dynamic — we must read the raw body and headers per request. */
export const dynamic = 'force-dynamic';

/* ─── GET — Meta's verify handshake ───────────────────────────────────── */

export function GET(req: NextRequest): Response {
  const params = req.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (
    mode === 'subscribe' &&
    token !== null &&
    challenge !== null &&
    token === serverConfig.whatsapp.webhookVerifyToken
  ) {
    // Plain-text response is required — Meta does not parse JSON here.
    return new Response(challenge, {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
  }

  return new Response('Forbidden', { status: 403 });
}

/* ─── POST — incoming events ──────────────────────────────────────────── */

interface MetaStatusEvent {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  recipient_id: string;
  timestamp: string;
  errors?: Array<{ code: number; title?: string; message?: string }>;
}

interface MetaIncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'reaction' | string;
  text?: { body: string };
}

interface MetaChangeValue {
  messaging_product?: 'whatsapp';
  statuses?: MetaStatusEvent[];
  messages?: MetaIncomingMessage[];
}

interface MetaChange {
  value: MetaChangeValue;
  field?: string;
}

interface MetaEntry {
  id: string;
  changes: MetaChange[];
}

interface MetaWebhookPayload {
  object?: string;
  entry?: MetaEntry[];
}

/**
 * Map Meta's status string onto our `NotificationStatus` enum. `sent` is
 * a transient acknowledgement before delivery — we keep the row in SENT
 * unless we hear DELIVERED or FAILED.
 */
function statusToEnum(status: MetaStatusEvent['status']):
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | null {
  switch (status) {
    case 'sent':
      return 'SENT';
    case 'delivered':
    case 'read':
      return 'DELIVERED';
    case 'failed':
      return 'FAILED';
    default:
      return null;
  }
}

/** Apply a single status update to the matching NotificationLog row. */
async function applyStatusUpdate(event: MetaStatusEvent): Promise<void> {
  const next = statusToEnum(event.status);
  if (next === null) return;

  // We may receive a status for a message we never sent (testing, replay) —
  // updateMany returns 0 affected and silently succeeds, which is what we want.
  await prisma.notificationLog.updateMany({
    where: { providerMessageId: event.id },
    data: {
      status: next,
      errorMessage:
        event.errors && event.errors.length > 0
          ? event.errors.map((e) => `[${e.code}] ${e.message ?? e.title ?? ''}`).join(' | ')
          : undefined,
    },
  });
}

/**
 * Log an inbound message we received from a user. Stage 1: log only.
 * Stage 2 will hand text messages to the RESTOCK / STOCK / ORDERS / HELP
 * command parser.
 */
async function logIncomingMessage(message: MetaIncomingMessage): Promise<void> {
  // Console + Sentry; not the DB. Inbound message volume is unpredictable;
  // we don't want NotificationLog to bloat with non-actionable rows.
  // eslint-disable-next-line no-console
  console.info(
    '[whatsapp-webhook] incoming',
    JSON.stringify({
      id: message.id,
      from: message.from,
      type: message.type,
      body: message.text?.body?.slice(0, 200),
    }),
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  // Raw body is the signature subject — re-serialised JSON would not match.
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  if (!verifyWhatsAppSignature(rawBody, signature, serverConfig.whatsapp.webhookAppSecret)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MetaWebhookPayload;
  } catch {
    // A signed-but-malformed body is suspect; reject so Meta retries with
    // backoff rather than retrying us with the same broken payload.
    return new Response('Invalid JSON', { status: 400 });
  }

  // Per Meta: ALWAYS 200 on success. Errors thrown after this point would
  // make Meta retry the same event with backoff, doubling our work.
  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const status of change.value.statuses ?? []) {
          await applyStatusUpdate(status);
        }
        for (const message of change.value.messages ?? []) {
          await logIncomingMessage(message);
        }
      }
    }
  } catch (error) {
    // Swallow the error after logging — Meta retry storms hurt more than
    // a missed event. Sentry's auto-capture grabs this; we just need the
    // return to be a 200 so retries do not pile on.
    // eslint-disable-next-line no-console
    console.error('[whatsapp-webhook] processing error', error);
  }

  return Response.json({ ok: true });
}
