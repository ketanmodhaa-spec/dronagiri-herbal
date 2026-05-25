/**
 * WhatsApp send client — the only path through which outbound WhatsApp
 * messages leave our application.
 *
 * Three guarantees this client makes:
 *
 *   1. **Feature flag honoured.** When `ENABLE_WHATSAPP !== 'true'`, no
 *      network call is made; the would-be send is still logged to
 *      `NotificationLog` so post-flip we can see what would have gone out.
 *   2. **Every send is auditable.** Every successful or failed call writes
 *      one `NotificationLog` row with provider ID or error message. This is
 *      a CLAUDE.md rule: notifications must be observable in the DB.
 *   3. **Notifications never block business.** A 5xx from Meta or a network
 *      hiccup returns a failed result; it never throws back into a calling
 *      order-state transition. The caller decides how to handle it (the
 *      house rule is: log and move on).
 */

import { prisma } from '@dronagiri/db';

import { serverConfig } from '@/lib/config.server';
import type { WhatsAppTemplate } from '@/lib/notifications/whatsapp/templates';

/** Inputs the caller provides. Phone may be E.164 with or without leading `+`. */
export interface SendWhatsAppTemplateOptions<P extends Record<string, string>> {
  /** Recipient phone in E.164 — Meta expects digits only; we normalise here. */
  to: string;
  template: WhatsAppTemplate<P>;
  params: P;
  /** Optional ties into `NotificationLog` for cross-referencing with orders. */
  orderId?: string;
  customerId?: string;
}

/** Result the caller receives. `providerMessageId` is set only when sent. */
export interface SendWhatsAppResult {
  sent: boolean;
  /** Meta's `wamid` — useful for tracing delivery via the status webhook. */
  providerMessageId?: string;
  /** Short, machine-readable cause when not sent. Human details land in the log. */
  reason?: 'disabled' | 'http_error' | 'invalid_phone' | 'unknown_error';
}

/** Meta wraps every parameter type the same way; this is the body wrapper. */
interface MetaMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components: Array<{
      type: 'body';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  };
}

/** Meta success response shape we read; ignored fields elided. */
interface MetaSendSuccess {
  messages: Array<{ id: string }>;
}

/** Phone number → digits-only, validated. Returns null when not a plausible number. */
function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  // E.164 ranges from 8 to 15 digits; below 10 is a typo, above 15 invalid.
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/**
 * Send one template message.
 *
 * Returns an object describing the outcome. Never throws — even Meta 5xx
 * or DNS failures are surfaced as `{ sent: false, reason: 'http_error' }`.
 */
export async function sendWhatsAppTemplate<P extends Record<string, string>>(
  options: SendWhatsAppTemplateOptions<P>,
): Promise<SendWhatsAppResult> {
  const { to, template, params, orderId, customerId } = options;

  const recipient = normalisePhone(to);
  if (recipient === null) {
    await prisma.notificationLog.create({
      data: {
        channel: 'WHATSAPP',
        status: 'FAILED',
        recipient: to,
        templateName: template.name,
        payload: params as Record<string, string>,
        errorMessage: 'Invalid phone number — failed E.164 normalisation.',
        orderId,
        customerId,
      },
    });
    return { sent: false, reason: 'invalid_phone' };
  }

  // Feature-flag short-circuit — log intent, no network call.
  if (!serverConfig.whatsapp.enabled) {
    await prisma.notificationLog.create({
      data: {
        channel: 'WHATSAPP',
        status: 'QUEUED',
        recipient,
        templateName: template.name,
        payload: params as Record<string, string>,
        errorMessage: 'WhatsApp disabled — call recorded but not sent.',
        orderId,
        customerId,
      },
    });
    return { sent: false, reason: 'disabled' };
  }

  const body: MetaMessagePayload = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: template.name,
      language: { code: template.language },
      components: [{ type: 'body', parameters: template.build(params) }],
    },
  };

  const url = `${serverConfig.whatsapp.graphApiBase}/${serverConfig.whatsapp.phoneNumberId}/messages`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${serverConfig.whatsapp.accessToken}`,
    'Content-Type': 'application/json',
  };

  // One retry on 5xx — Meta's edge occasionally returns 502/503 transiently.
  let lastErrorMessage = 'unknown';
  let providerMessageId: string | undefined;
  let succeeded = false;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const json = (await response.json()) as MetaSendSuccess;
        providerMessageId = json.messages?.[0]?.id;
        succeeded = providerMessageId !== undefined;
        if (!succeeded) lastErrorMessage = 'Response 2xx but no message id returned.';
        break;
      }

      const errorText = await response.text();
      lastErrorMessage = `HTTP ${response.status}: ${errorText.slice(0, 500)}`;

      // 4xx is a permanent failure — invalid template, banned recipient, etc.
      if (response.status >= 400 && response.status < 500) break;
      // 5xx — pause and retry once.
      if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : 'fetch threw';
      if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  await prisma.notificationLog.create({
    data: {
      channel: 'WHATSAPP',
      status: succeeded ? 'SENT' : 'FAILED',
      recipient,
      templateName: template.name,
      payload: params as Record<string, string>,
      providerMessageId,
      errorMessage: succeeded ? null : lastErrorMessage,
      sentAt: succeeded ? new Date() : null,
      orderId,
      customerId,
    },
  });

  return succeeded
    ? { sent: true, providerMessageId }
    : { sent: false, reason: 'http_error' };
}
