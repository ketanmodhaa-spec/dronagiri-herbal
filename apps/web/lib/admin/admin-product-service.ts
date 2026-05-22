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

import { NotFoundError, ValidationError } from '@/lib/errors';

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
  try {
    return await prisma.product.update({ where: { id }, data: toProductData(input) });
  } catch (error) {
    rethrowWriteError(error);
  }
}
