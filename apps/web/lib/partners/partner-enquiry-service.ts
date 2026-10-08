/**
 * Partner enquiry service — every database operation behind the "become a
 * distributor / dealer" form and Sarita's lead list.
 */
import { prisma, type PartnerEnquiry } from '@dronagiri/db';
import {
  stateName,
  type IndianStateCode,
  type PartnerEnquiryInput,
  type PartnerEnquiryUpdate,
} from '@dronagiri/validators';

import { serverConfig } from '@/lib/config.server';
import { NotFoundError } from '@/lib/errors';
import { sendEmail } from '@/lib/notifications/email/client';

import {
  PARTNER_BACKGROUND_LABEL,
  PARTNER_INVESTMENT_LABEL,
  PARTNER_TYPE_COPY,
} from './partner-labels';

/** A repeat submission from the same phone within this window is not stored again. */
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Record an enquiry and alert Sarita by email.
 *
 * A resubmission of the same phone and partner type within 24 hours is
 * treated as the same lead — it succeeds for the enquirer but adds no row
 * and sends no second alert. The alert email never affects the outcome: the
 * enquiry is saved before it is sent, and the email client never throws.
 */
export async function submitPartnerEnquiry(input: PartnerEnquiryInput): Promise<void> {
  const recent = await prisma.partnerEnquiry.findFirst({
    where: {
      phone: input.phone,
      partnerType: input.partnerType,
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (recent) return;

  const enquiry = await prisma.partnerEnquiry.create({
    data: {
      partnerType: input.partnerType,
      name: input.name,
      phone: input.phone,
      email: input.email,
      businessName: input.businessName,
      city: input.city,
      stateCode: input.stateCode,
      pincode: input.pincode,
      gstin: input.gstin,
      background: input.background,
      investment: input.investment,
      message: input.message,
    },
  });

  await sendEmail({
    to: serverConfig.email.ownerInbox,
    replyTo: enquiry.email ?? undefined,
    templateName: 'partner_enquiry_alert',
    ...alertEmail(enquiry),
  });
}

/** Subject and plain-text body of Sarita's new-lead alert. */
function alertEmail(enquiry: PartnerEnquiry): { subject: string; text: string } {
  const type = PARTNER_TYPE_COPY[enquiry.partnerType].label;
  // stateCode was validated against INDIAN_STATES when the enquiry was written.
  const place = `${enquiry.city}, ${stateName(enquiry.stateCode as IndianStateCode)}`;
  const lines = [
    `New ${type.toLowerCase()} enquiry from ${place}.`,
    '',
    `Name: ${enquiry.name}`,
    `Phone: +91 ${enquiry.phone}`,
    `WhatsApp: https://wa.me/91${enquiry.phone}`,
    enquiry.email ? `Email: ${enquiry.email}` : null,
    enquiry.businessName ? `Business: ${enquiry.businessName}` : null,
    `Location: ${place}${enquiry.pincode ? ` – ${enquiry.pincode}` : ''}`,
    enquiry.gstin ? `GSTIN: ${enquiry.gstin}` : null,
    enquiry.background ? `Current business: ${PARTNER_BACKGROUND_LABEL[enquiry.background]}` : null,
    enquiry.investment ? `Investment: ${PARTNER_INVESTMENT_LABEL[enquiry.investment]}` : null,
    enquiry.message ? `\nMessage:\n${enquiry.message}` : null,
    '',
    'All enquiries: https://dronagiriherbal.in/admin/enquiries',
  ];
  return {
    subject: `New ${type} enquiry — ${enquiry.name}, ${place}`,
    text: lines.filter((line) => line !== null).join('\n'),
  };
}

/** Every enquiry, newest first — the admin lead list. */
export async function listPartnerEnquiries(): Promise<PartnerEnquiry[]> {
  return prisma.partnerEnquiry.findMany({ orderBy: { createdAt: 'desc' } });
}

/** How many enquiries nobody has contacted yet — the dashboard badge. */
export async function countNewPartnerEnquiries(): Promise<number> {
  return prisma.partnerEnquiry.count({ where: { status: 'NEW' } });
}

export async function updatePartnerEnquiry(
  id: string,
  update: PartnerEnquiryUpdate,
): Promise<PartnerEnquiry> {
  const existing = await prisma.partnerEnquiry.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new NotFoundError('That enquiry no longer exists.');
  }
  return prisma.partnerEnquiry.update({
    where: { id },
    data: {
      status: update.status,
      // undefined leaves the note alone; an empty note clears it.
      internalNote: update.internalNote === undefined ? undefined : update.internalNote || null,
    },
  });
}
