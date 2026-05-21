/**
 * Dronagiri Herbal — database seed
 * ---------------------------------------------------------------------------
 * Populates a fresh database with the launch catalogue: 4 categories,
 * 24 products (each with a WhatsApp restock alias and an opening-stock ledger
 * entry), and the owner admin account.
 *
 * ⚠️  PLACEHOLDER DATA — not production-ready:
 *   • Every product price is ₹299 (29900 paise). A placeholder — Sarita sets
 *     real prices via the admin panel.
 *   • Product descriptions are placeholders pending Sarita's copy.
 *   • Opening stock is a flat 50 units per product.
 *
 * The admin password is read from ADMIN_SEED_PASSWORD at run time and is never
 * hardcoded here. Run with:
 *   doppler run -- pnpm --filter @dronagiri/db db:seed
 *
 * Re-runnable: wipes the catalogue + admin rows first, then recreates them.
 * Dev / pre-launch only — assumes there is no live order data.
 */

import { AdminRole, PrismaClient, StockMovementReason, StockMovementSource } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** PLACEHOLDER price — ₹299 in paise. Real prices come from Sarita's admin panel. */
const PLACEHOLDER_PRICE_PAISE = 29900;
/** PLACEHOLDER opening stock, applied uniformly to every product. */
const OPENING_STOCK = 50;
const LOW_STOCK_THRESHOLD = 10;
/** bcrypt cost factor for the admin password hash. */
const BCRYPT_ROUNDS = 12;

const categories = [
  { slug: 'hair-care', name: 'Hair Care', nameGu: 'વાળ સંભાળ' },
  { slug: 'skin-care', name: 'Skin Care', nameGu: 'ત્વચા સંભાળ' },
  { slug: 'toners', name: 'Toners', nameGu: 'ટોનર' },
  { slug: 'wellness', name: 'Wellness', nameGu: 'વેલનેસ' },
] as const;

type CategorySlug = (typeof categories)[number]['slug'];

interface SeedProduct {
  category: CategorySlug;
  name: string;
  slug: string;
  sku: string;
  /** Lowercase short code for Sarita's WhatsApp RESTOCK command. */
  alias: string;
}

const products: SeedProduct[] = [
  // ── Hair Care ────────────────────────────────────────────────────────────
  { category: 'hair-care', name: 'Hair Protein Pack', slug: 'hair-protein-pack', sku: 'DH-HPP-001', alias: 'hpp' },
  { category: 'hair-care', name: 'Hair Protein Pack Premium', slug: 'hair-protein-pack-premium', sku: 'DH-HPP-002', alias: 'hppp' },
  { category: 'hair-care', name: 'Black Herbal Hair Care', slug: 'black-herbal-hair-care', sku: 'DH-BHC-001', alias: 'bhc' },
  { category: 'hair-care', name: 'Protein Herbal Hair Oil', slug: 'protein-herbal-hair-oil', sku: 'DH-HHO-001', alias: 'hho' },
  { category: 'hair-care', name: 'Aloevera Shampoo', slug: 'aloevera-shampoo', sku: 'DH-ALS-001', alias: 'als' },
  { category: 'hair-care', name: 'Hibiscus Shampoo', slug: 'hibiscus-shampoo', sku: 'DH-HIS-001', alias: 'his' },
  { category: 'hair-care', name: 'Onion Shampoo', slug: 'onion-shampoo', sku: 'DH-ONS-001', alias: 'ons' },
  { category: 'hair-care', name: 'Herbal Shampoo', slug: 'herbal-shampoo', sku: 'DH-HBS-001', alias: 'hbs' },
  { category: 'hair-care', name: 'Hair Gel', slug: 'hair-gel', sku: 'DH-HGL-001', alias: 'hgl' },
  // ── Skin Care ────────────────────────────────────────────────────────────
  { category: 'skin-care', name: 'Skin Care Pack', slug: 'skin-care-pack', sku: 'DH-SCP-001', alias: 'scp' },
  { category: 'skin-care', name: 'Skin Care Pack Premium', slug: 'skin-care-pack-premium', sku: 'DH-SCP-002', alias: 'scpp' },
  { category: 'skin-care', name: 'Anti Ageing Orange Pack', slug: 'anti-ageing-orange-pack', sku: 'DH-AAO-001', alias: 'aao' },
  { category: 'skin-care', name: 'Turmeric Body Butter', slug: 'turmeric-body-butter', sku: 'DH-TBB-001', alias: 'tbb' },
  { category: 'skin-care', name: 'Multani Mitti', slug: 'multani-mitti', sku: 'DH-MMT-001', alias: 'mmt' },
  { category: 'skin-care', name: 'Haldi Ubtan', slug: 'haldi-ubtan', sku: 'DH-HUB-001', alias: 'hub' },
  // ── Toners ───────────────────────────────────────────────────────────────
  { category: 'toners', name: 'Aloe Vera Hydra Toner', slug: 'aloe-vera-hydra-toner', sku: 'DH-AVT-001', alias: 'avt' },
  { category: 'toners', name: 'Rose Hydra Toner', slug: 'rose-hydra-toner', sku: 'DH-RST-001', alias: 'rst' },
  { category: 'toners', name: 'Lavender Hydra Toner', slug: 'lavender-hydra-toner', sku: 'DH-LVT-001', alias: 'lvt' },
  { category: 'toners', name: 'Tea Tree Hydra Toner', slug: 'tea-tree-hydra-toner', sku: 'DH-TTT-001', alias: 'ttt' },
  { category: 'toners', name: 'Jasmin Hydra Toner', slug: 'jasmin-hydra-toner', sku: 'DH-JHT-001', alias: 'jht' },
  { category: 'toners', name: 'Lime Hydra Toner', slug: 'lime-hydra-toner', sku: 'DH-LHT-001', alias: 'lht' },
  // ── Wellness ─────────────────────────────────────────────────────────────
  { category: 'wellness', name: 'Aloe Vera Gel', slug: 'aloe-vera-gel', sku: 'DH-AVG-001', alias: 'avg' },
  { category: 'wellness', name: 'Organic Coconut Oil', slug: 'organic-coconut-oil', sku: 'DH-OCO-001', alias: 'oco' },
  { category: 'wellness', name: 'Coffee Walnut Scrub', slug: 'coffee-walnut-scrub', sku: 'DH-CWS-001', alias: 'cws' },
];

async function main() {
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword || adminPassword.trim().length === 0) {
    throw new Error(
      'ADMIN_SEED_PASSWORD is not set. Add it to Doppler (dev config) and run the seed via `doppler run`.',
    );
  }

  // Wipe catalogue + admin rows so the seed is re-runnable. Child rows first,
  // to satisfy foreign keys. Dev / pre-launch only — assumes no order data.
  await prisma.stockMovement.deleteMany();
  await prisma.productAlias.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.adminUser.deleteMany();

  // Categories — sortOrder follows declaration order.
  const categoryIdBySlug = new Map<CategorySlug, string>();
  for (const [index, category] of categories.entries()) {
    const created = await prisma.category.create({
      data: { ...category, sortOrder: index },
    });
    categoryIdBySlug.set(category.slug, created.id);
  }

  // Products — each with its WhatsApp alias and an opening-stock ledger entry.
  const sortOrderByCategory = new Map<CategorySlug, number>();
  for (const product of products) {
    const categoryId = categoryIdBySlug.get(product.category);
    if (!categoryId) {
      throw new Error(`Unknown category slug "${product.category}" for product "${product.name}".`);
    }

    const sortOrder = sortOrderByCategory.get(product.category) ?? 0;
    sortOrderByCategory.set(product.category, sortOrder + 1);

    await prisma.product.create({
      data: {
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        // PLACEHOLDER description — pending Sarita's product copy.
        description: `Placeholder description for ${product.name}. Pending Sarita's copy — edit via the admin panel.`,
        pricePaise: PLACEHOLDER_PRICE_PAISE, // PLACEHOLDER — ₹299 for every product
        stockQty: OPENING_STOCK,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
        isActive: true,
        isFeatured: false, // Sarita curates the featured set via the admin panel
        sortOrder,
        categoryId,
        aliases: {
          create: { alias: product.alias },
        },
        // Opening-stock movement — the ledger reconciles from row one.
        movements: {
          create: {
            delta: OPENING_STOCK,
            balanceAfter: OPENING_STOCK,
            reason: StockMovementReason.RESTOCK,
            source: StockMovementSource.SYSTEM,
            createdBy: 'system',
            note: 'Opening stock — seed data placeholder',
          },
        },
      },
    });
  }

  // Owner admin account — Sarita. Password is bcrypt-hashed; plaintext is
  // never stored, never logged, never committed.
  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
  await prisma.adminUser.create({
    data: {
      email: 'store@dronagiriherbal.in',
      name: 'Sarita Modha',
      role: AdminRole.OWNER,
      passwordHash,
    },
  });

  console.log(
    `Seeded ${categories.length} categories, ${products.length} products ` +
      `(+${products.length} aliases, +${products.length} opening-stock movements), 1 admin user.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
