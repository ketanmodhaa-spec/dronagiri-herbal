/**
 * Dronagiri Herbal — test orders for the Razorpay payment layer (dev only).
 * ---------------------------------------------------------------------------
 * Checkout does not exist yet, so this creates the PENDING online order it
 * would create — one unit of an in-stock product, for a fixed test customer —
 * and prints the local /dev/pay link that opens the real Razorpay widget.
 *
 *   doppler run -- pnpm --filter @dronagiri/db db:test-order            create one
 *   doppler run -- pnpm --filter @dronagiri/db db:test-order --clean    delete all test orders
 *
 * Refuses to run outside the Doppler `dev` config or with live Razorpay keys.
 * Test orders are numbered DH-TEST-…; stock taken by a paid test order stays
 * on the ledger after --clean, like any real sale.
 */
import { createHash, randomBytes } from 'node:crypto';

import { PaymentMethod, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_PREFIX = 'DH-TEST-';
const TEST_CUSTOMER_PHONE = '+919999999999';

function assertDevWithTestKeys(): void {
  if (process.env.DOPPLER_CONFIG !== 'dev') {
    throw new Error(`Refusing to run: Doppler config is "${process.env.DOPPLER_CONFIG ?? 'none'}", not "dev".`);
  }
  if (!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')) {
    throw new Error('Refusing to run: RAZORPAY_KEY_ID is not a test key.');
  }
}

async function clean(): Promise<void> {
  const testOrders = { orderNumber: { startsWith: TEST_PREFIX } };
  await prisma.review.deleteMany({ where: { order: testOrders } });
  await prisma.refund.deleteMany({ where: { order: testOrders } });
  const { count } = await prisma.order.deleteMany({ where: testOrders });
  console.log(`Deleted ${count} test order(s).`);
}

async function create(): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { isActive: true, stockQty: { gt: 0 } },
    orderBy: { sortOrder: 'asc' },
  });
  if (!product) {
    throw new Error('No active product with stock — seed the dev database first.');
  }

  const customer = await prisma.customer.upsert({
    where: { phone: TEST_CUSTOMER_PHONE },
    create: { phone: TEST_CUSTOMER_PHONE, name: 'Test Customer' },
    update: {},
  });

  const trackingToken = randomBytes(24).toString('base64url');
  const order = await prisma.order.create({
    data: {
      orderNumber: `${TEST_PREFIX}${Date.now().toString(36).toUpperCase()}`,
      trackingTokenHash: createHash('sha256').update(trackingToken).digest('hex'),
      customerId: customer.id,
      shipRecipientName: 'Test Customer',
      shipPhone: '9999999999',
      shipLine1: '1 Test Street',
      shipCity: 'Ahmedabad',
      shipState: 'Gujarat',
      shipPincode: '380001',
      subtotalPaise: product.pricePaise,
      totalPaise: product.pricePaise,
      paymentMethod: PaymentMethod.ONLINE,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          unitPricePaise: product.pricePaise,
          quantity: 1,
          lineTotalPaise: product.pricePaise,
        },
      },
      events: { create: { status: 'PENDING', note: 'Test order created by db:test-order.' } },
    },
  });

  console.log(`Created ${order.orderNumber}: 1 × ${product.name} (${product.stockQty} in stock).`);
  console.log(`Pay it at http://localhost:3000/dev/pay/${order.id}`);
}

async function main(): Promise<void> {
  assertDevWithTestKeys();
  await (process.argv.includes('--clean') ? clean() : create());
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('test-order failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
