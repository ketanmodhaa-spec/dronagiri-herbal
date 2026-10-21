import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAdminOrNull } from '@/lib/auth/require-admin';
import { cn } from '@/lib/cn';
import { listMessages, type MessageFilter } from '@/lib/notifications/notification-log-service';

export const metadata: Metadata = { title: 'Messages' };
export const dynamic = 'force-dynamic';

const TABS: { key: MessageFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'failed', label: 'Failed' },
  { key: 'not-sent', label: 'Not sent' },
];

const STATUS: Record<string, { label: string; className: string }> = {
  SENT: { label: 'Sent', className: 'bg-forest-50 text-forest-800' },
  DELIVERED: { label: 'Delivered', className: 'bg-forest-100 text-forest-900' },
  FAILED: { label: 'Failed', className: 'bg-red-50 text-red-700' },
  QUEUED: { label: 'Not sent — WhatsApp off', className: 'bg-gold-light/40 text-forest-900' },
};

/** What each message is, in Sarita's words. */
const MESSAGE_NAMES: Record<string, string> = {
  order_confirmed: 'Order confirmed → customer',
  order_shipped: 'Shipped → customer',
  order_delivered: 'Delivered → customer',
  order_cancelled: 'Cancelled → customer',
  refund_initiated: 'Refund started → customer',
  refund_completed: 'Refund done → customer',
  new_order_alert: 'New order → you',
  payment_needs_attention: 'Paid order on hold → you',
  partner_enquiry_alert: 'Distributor enquiry → you',
  review_pending: 'New review to approve → you',
  otp_login: 'Login code → customer',
};

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

function isFilter(value: string | undefined): value is MessageFilter {
  return TABS.some((tab) => tab.key === value);
}

export default async function AdminMessagesPage(props: { searchParams: Promise<{ show?: string }> }) {
  if (!(await getAdminOrNull())) {
    redirect('/admin/login');
  }
  const { show } = await props.searchParams;
  const filter: MessageFilter = isFilter(show) ? show : 'all';
  const { messages, failedCount } = await listMessages(filter);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/admin" className="text-sm text-forest-700 hover:text-forest-800">
        ← Dashboard
      </Link>
      <h1 className="mt-1 font-display text-2xl font-semibold text-forest-900">Messages</h1>
      <p className="mt-1 text-sm text-stone">
        Every WhatsApp and email the shop sent — the latest 100. A failed message never affects the order
        itself.
      </p>

      <nav aria-label="Message filter" className="mt-5 flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === 'all' ? '/admin/messages' : `/admin/messages?show=${tab.key}`}
            aria-current={tab.key === filter ? 'page' : undefined}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium',
              tab.key === filter ? 'bg-forest-800 text-white' : 'border border-forest-200 bg-white text-forest-800',
            )}
          >
            {tab.label}
            {tab.key === 'failed' && failedCount > 0 ? ` (${failedCount})` : ''}
          </Link>
        ))}
      </nav>

      {messages.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-forest-100 bg-white p-6 text-sm text-stone">
          Nothing here yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-forest-100 rounded-2xl border border-forest-100 bg-white">
          {messages.map((message) => {
            const status = STATUS[message.status] ?? { label: message.status, className: 'bg-forest-50' };
            return (
              <li key={message.id} className="space-y-1 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-forest-900">
                    {message.channel === 'EMAIL' ? '✉️' : '💬'}{' '}
                    {(message.templateName && MESSAGE_NAMES[message.templateName]) ??
                      message.templateName ??
                      'Message'}
                  </p>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs', status.className)}>
                    {status.label}
                  </span>
                </div>
                <p className="text-stone">
                  {timeFormatter.format(message.createdAt)} · to {message.recipient}
                  {message.orderNumber && message.orderId && (
                    <>
                      {' · '}
                      <Link href={`/admin/orders/${message.orderId}`} className="text-forest-800 underline">
                        {message.orderNumber}
                      </Link>
                    </>
                  )}
                </p>
                {message.status === 'FAILED' && message.errorMessage && (
                  <p className="break-words rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {message.errorMessage}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
