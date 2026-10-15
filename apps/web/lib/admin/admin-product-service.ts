/**
 * Product administration — the catalogue's admin read and write paths.
 *
 * Route handlers and admin Server Components call these functions; none reach
 * for Prisma directly (CLAUDE.md). Node runtime only.
 */
import {
  Prisma,
  StockMovementReason,
  StockMovementSource,
  prisma,
  type Product,
} from '@dronagiri/db';
import type { AdminProductCreate, AdminProductUpdate } from '@dronagiri/validators';

import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { isSameProduct } from '@/lib/products/product-identity';

/** A row in the admin product list. */
export interface AdminProductListItem {
  id: string;
  name: string;
  sku: string;
  slug: string;
  categoryName: string;
  pricePaise: number;
  stockQty: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
}

/** Empty optional text becomes a real NULL in the database. */
function orNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

/** The Prisma write payload shared by create and update. */
function toProductData(input: AdminProductUpdate) {
  return {
    name: input.name,
    nameGu: orNull(input.nameGu),
    slug: input.slug,
    sku: input.sku,
    categoryId: input.categoryId,
    tagline: orNull(input.tagline),
    taglineGu: orNull(input.taglineGu),
    description: input.description,
    descriptionGu: orNull(input.descriptionGu),
    benefits: orNull(input.benefits),
    benefitsGu: orNull(input.benefitsGu),
    ingredients: orNull(input.ingredients),
    ingredientsGu: orNull(input.ingredientsGu),
    howToUse: orNull(input.howToUse),
    howToUseGu: orNull(input.howToUseGu),
    texture: input.texture ?? null,
    aromas: input.aromas,
    finish: input.finish ?? null,
    routine: input.routine ?? null,
    routineNote: orNull(input.routineNote),
    routineNoteGu: orNull(input.routineNoteGu),
    pricePaise: input.pricePaise,
    comparePaise: input.comparePaise ?? null,
    sizeLabel: orNull(input.sizeLabel),
    weightGrams: input.weightGrams ?? null,
    lowStockThreshold: input.lowStockThreshold,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    isFeatured: input.isFeatured,
  };
}

/** Translate a Prisma write failure into a friendly error — or rethrow it. */
function rethrowWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('slug')) {
        throw new ValidationError('A product with this URL slug already exists.', 'SLUG_TAKEN');
      }
      if (target.includes('sku')) {
        throw new ValidationError('A product with this SKU already exists.', 'SKU_TAKEN');
      }
      throw new ValidationError('That value is already in use.', 'DUPLICATE');
    }
    if (error.code === 'P2003') {
      throw new ValidationError('The selected category does not exist.', 'CATEGORY_INVALID');
    }
    if (error.code === 'P2025') {
      throw new NotFoundError('Product not found.');
    }
  }
  throw error;
}

/** An existing product that a new or edited entry would duplicate. */
export interface DuplicateProduct {
  id: string;
  name: string;
  sku: string;
  sizeLabel: string | null;
  isActive: boolean;
}

/**
 * The product already in the catalogue under this name and size, if any —
 * inactive products included, since re-activating one is the right fix.
 * `excludeId` is the product being edited, which never duplicates itself.
 * The catalogue is a few dozen rows, so it is compared in full in memory.
 */
export async function findDuplicateProduct(
  entry: { name: string; sizeLabel?: string | null },
  excludeId?: string,
): Promise<DuplicateProduct | null> {
  const products = await prisma.product.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: { id: true, name: true, sku: true, sizeLabel: true, isActive: true },
  });
  return products.find((product) => isSameProduct(product, { name: entry.name, sizeLabel: entry.sizeLabel })) ?? null;
}

/** Refuse a second entry of a product that is already in the catalogue. */
async function assertNotDuplicate(input: AdminProductUpdate, excludeId?: string): Promise<void> {
  const existing = await findDuplicateProduct(input, excludeId);
  if (!existing) return;
  const size = existing.sizeLabel ? `, ${existing.sizeLabel}` : '';
  const advice = existing.isActive
    ? 'Open that product and edit it instead.'
    : 'It is inactive — open it and tick Active instead.';
  throw new ConflictError(
    `Product already entered: “${existing.name}”${size} (SKU ${existing.sku}). ${advice}`,
    'PRODUCT_ALREADY_ENTERED',
  );
}

/** Every product, active and inactive, for the admin list. */
export async function listProductsForAdmin(): Promise<AdminProductListItem[]> {
  const rows = await prisma.product.findMany({
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      sku: true,
      slug: true,
      pricePaise: true,
      stockQty: true,
      lowStockThreshold: true,
      isActive: true,
      isFeatured: true,
      category: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    slug: row.slug,
    categoryName: row.category.name,
    pricePaise: row.pricePaise,
    stockQty: row.stockQty,
    lowStockThreshold: row.lowStockThreshold,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
  }));
}

/** A single product for the edit form. Throws `NotFoundError` when absent. */
export async function getProductForAdmin(id: string): Promise<Product> {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new NotFoundError('Product not found.');
  }
  return product;
}

/**
 * Create a product. The product row and its opening-stock ledger entry are
 * written together in a single atomic insert — a new product can never exist
 * without the movement that explains its stock.
 */
export async function createProduct(
  input: AdminProductCreate,
  adminId: string,
): Promise<Product> {
  await assertNotDuplicate(input);
  const opening = input.openingStock;
  try {
    return await prisma.product.create({
      data: {
        ...toProductData(input),
        stockQty: opening,
        movements:
          opening > 0
            ? {
                create: {
                  delta: opening,
                  balanceAfter: opening,
                  reason: StockMovementReason.ADJUSTMENT,
                  source: StockMovementSource.ADMIN_PANEL,
                  createdBy: adminId,
                  note: 'Opening stock',
                },
              }
            : undefined,
      },
    });
  } catch (error) {
    rethrowWriteError(error);
  }
}

/** Update a product. Stock is untouched here — it moves only via the stock service. */
export async function updateProduct(id: string, input: AdminProductUpdate): Promise<Product> {
  await assertNotDuplicate(input, id);
  try {
    return await prisma.product.update({ where: { id }, data: toProductData(input) });
  } catch (error) {
    rethrowWriteError(error);
  }
}
