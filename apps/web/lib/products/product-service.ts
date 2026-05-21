/**
 * Product service — the storefront's read path for the catalogue.
 *
 * Server Components and route handlers call these functions; per CLAUDE.md
 * they never query Prisma directly. Each function returns plain view shapes,
 * not Prisma rows, so callers stay decoupled from the schema.
 */
import { prisma } from '@dronagiri/db';

import type { ProductCardData } from '@/components/ui/product-card';

/**
 * Products for the homepage featured grid. Curated (`isFeatured`) products
 * lead; the rest fill the grid in catalogue order, capped at `limit`.
 */
export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    take: limit,
    select: {
      slug: true,
      name: true,
      pricePaise: true,
      comparePaise: true,
      sizeLabel: true,
      category: { select: { name: true } },
    },
  });

  return products.map((product) => ({
    slug: product.slug,
    name: product.name,
    pricePaise: product.pricePaise,
    comparePaise: product.comparePaise,
    sizeLabel: product.sizeLabel,
    categoryName: product.category.name,
  }));
}
