/**
 * The message log as Sarita reads it — every WhatsApp and email the site
 * tried to send, newest first, with the order it was about and why any
 * failed. Read-only; the send clients are the only writers.
 */
import { NotificationStatus, prisma, type Prisma } from '@dronagiri/db';

export type MessageFilter = 'all' | 'failed' | 'not-sent';

const MESSAGE_PAGE_SIZE = 100;

function filterWhere(filter: MessageFilter): Prisma.NotificationLogWhereInput {
  switch (filter) {
    case 'failed':
      return { status: NotificationStatus.FAILED };
    case 'not-sent':
      // Recorded while WhatsApp sending was switched off.
      return { status: NotificationStatus.QUEUED };
    case 'all':
      return {};
  }
}

export async function listMessages(filter: MessageFilter) {
  const [rows, failedCount] = await Promise.all([
    prisma.notificationLog.findMany({
      where: filterWhere(filter),
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_PAGE_SIZE,
      select: {
        id: true,
        channel: true,
        status: true,
        recipient: true,
        templateName: true,
        errorMessage: true,
        orderId: true,
        createdAt: true,
      },
    }),
    prisma.notificationLog.count({ where: { status: NotificationStatus.FAILED } }),
  ]);

  // The log keeps only the order id; show its number instead.
  const orderIds = [...new Set(rows.map((row) => row.orderId).filter((id): id is string => id !== null))];
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, orderNumber: true },
  });
  const orderNumbers = new Map(orders.map((order) => [order.id, order.orderNumber]));

  return {
    failedCount,
    messages: rows.map((row) => ({
      ...row,
      orderNumber: row.orderId ? (orderNumbers.get(row.orderId) ?? null) : null,
    })),
  };
}
