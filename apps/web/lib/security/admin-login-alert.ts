/**
 * Admin-login alert — every password sign-in to the admin panel tells Sarita
 * on WhatsApp and Jaydeep by email, so a stolen password is noticed within
 * minutes rather than never.
 *
 * Only password logins alert; the silent refresh every 8 hours does not, or
 * the alert would become noise she learns to ignore. The alert is built from
 * the request while it is still in hand, then sent after the response — a
 * sign-in never waits on WhatsApp. SECURITY_ALARMS_ENABLED switches it off
 * along with the other security alarms.
 */
import { userAgent, type NextRequest } from 'next/server';

import type { AdminClaims } from '@/lib/auth/admin-session';
import { serverConfig } from '@/lib/config.server';
import { clientIp, clientPlace } from '@/lib/http';
import { sendEmail } from '@/lib/notifications/email/client';
import { sendWhatsAppTemplate } from '@/lib/notifications/whatsapp/client';
import { adminLoginAlertTemplate } from '@/lib/notifications/whatsapp/templates';
import { SecurityEvent, formatIst, recordSecurityEvent } from '@/lib/security/security-events';
import { absoluteUrl } from '@/lib/seo/site';

export interface AdminLoginAlert {
  adminName: string;
  role: AdminClaims['role'];
  signedInAt: string;
  device: string;
  place: string;
  ip: string | null;
}

/** "Chrome on Android" — or as much of it as the browser reveals. */
function describeDevice(req: NextRequest): string {
  const { browser, os } = userAgent(req);
  if (browser.name && os.name) return `${browser.name} on ${os.name}`;
  return browser.name ?? os.name ?? 'Unknown device';
}

/** Capture what the alert needs while the request is still available. */
export function adminLoginAlertFrom(admin: AdminClaims, req: NextRequest): AdminLoginAlert {
  return {
    adminName: admin.name,
    role: admin.role,
    signedInAt: formatIst(new Date()),
    device: describeDevice(req),
    place: clientPlace(req) ?? 'Unknown location',
    ip: clientIp(req),
  };
}

export async function sendAdminLoginAlert(alert: AdminLoginAlert): Promise<void> {
  if (!serverConfig.security.alarmsEnabled) return;

  const changePasswordUrl = absoluteUrl('/admin/change-password');

  const whatsapp = await sendWhatsAppTemplate({
    to: serverConfig.owner.whatsappNumber,
    template: adminLoginAlertTemplate,
    params: {
      adminName: alert.adminName,
      signedInAt: alert.signedInAt,
      device: alert.device,
      place: alert.place,
      changePasswordUrl,
    },
  });
  // Off by configuration is not a failure; anything else means Sarita was not told.
  if (!whatsapp.sent && whatsapp.reason !== 'disabled') {
    recordSecurityEvent(SecurityEvent.WHATSAPP_SEND_FAILED, {
      route: '/api/admin/auth/login',
      ip: alert.ip,
      place: alert.place,
      source: `admin_login_alert: ${whatsapp.reason ?? 'unknown'}`,
    });
  }

  await sendEmail({
    to: serverConfig.security.alertEmail,
    templateName: 'admin_login_alert',
    // The time keeps each login its own email; Gmail folds identical subjects together.
    subject: `[Dronagiri security] Admin login: ${alert.adminName}, ${alert.signedInAt}`,
    text: [
      `${alert.adminName} (${alert.role}) signed in to the admin panel at ${alert.signedInAt}.`,
      '',
      `Device: ${alert.device}`,
      `Place: ${alert.place}`,
      `Address: ${alert.ip ?? 'unknown'}`,
      '',
      whatsapp.sent ? 'Sarita was alerted on WhatsApp.' : `Sarita was NOT alerted on WhatsApp — see ${absoluteUrl('/admin/messages')}`,
      '',
      `Not expected? Change the password — it signs out every device: ${changePasswordUrl}`,
      'Then follow SECURITY-PLAYBOOK.md, scenario 1.',
    ].join('\n'),
  });
}
