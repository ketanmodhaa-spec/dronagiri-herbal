/**
 * Email send client — the only path through which email leaves the
 * application, via Resend's REST API.
 *
 * Same guarantees as the WhatsApp client:
 *   1. Every attempt writes one `NotificationLog` row (SENT or FAILED).
 *   2. It never throws. A Resend outage or a bad address returns
 *      `{ sent: false }`; the business action that triggered the email has
 *      already succeeded and stays succeeded.
 */
import { prisma } from '@dronagiri/db';

import { serverConfig } from '@/lib/config.server';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendEmailOptions {
  to: string;
  subject: string;
  /** Plain-text body — always sent, so every client can read the email. */
  text: string;
  /** Optional HTML body. */
  html?: string;
  /** Address replies go to, e.g. the enquirer's own email. */
  replyTo?: string;
  /** Short name recorded on the NotificationLog row, e.g. `partner_enquiry_alert`. */
  templateName: string;
  orderId?: string;
  customerId?: string;
}

export interface SendEmailResult {
  sent: boolean;
  providerMessageId?: string;
}

interface ResendSuccess {
  id: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, text, html, replyTo, templateName, orderId, customerId } = options;

  let providerMessageId: string | undefined;
  let errorMessage: string | null = null;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serverConfig.email.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: serverConfig.email.from,
        to: [to],
        subject,
        text,
        html,
        reply_to: replyTo,
      }),
    });
    if (response.ok) {
      const json = (await response.json()) as ResendSuccess;
      providerMessageId = json.id;
    } else {
      errorMessage = `HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`;
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'fetch threw';
  }

  const sent = providerMessageId !== undefined;
  await prisma.notificationLog.create({
    data: {
      channel: 'EMAIL',
      status: sent ? 'SENT' : 'FAILED',
      recipient: to,
      templateName,
      payload: { subject },
      providerMessageId,
      errorMessage: sent ? null : (errorMessage ?? 'Response 2xx but no message id returned.'),
      sentAt: sent ? new Date() : null,
      orderId,
      customerId,
    },
  });

  return sent ? { sent: true, providerMessageId } : { sent: false };
}
