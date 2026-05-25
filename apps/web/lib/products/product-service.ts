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

/** A single product image as the storefront needs it — URL + dimensions + alt text. */
export interface ProductImageView {
  url: string;
  alt: string | null;
  altGu: string | null;
  width: number;
  height: number;
}

/**
 * Full product detail shape — everything `/products/[slug]` renders.
 *
 * Money stays in paise (see CLAUDE.md). Long-form content is the raw markdown
 * stored by the admin; rendering decisions stay in the component layer.
 */
export interface ProductDetailView {
  id: string;
  slug: string;
  sku: string;
  name: string;
  nameGu: string | null;
  categoryName: string;
  tagline: string | null;
  taglineGu: string | null;
  description: string;
  descriptionGu: string | null;
  benefits: string | null;
  benefitsGu: string | null;
  ingredients: string | null;
  ingredientsGu: string | null;
  howToUse: string | null;
  howToUseGu: string | null;
  pricePaise: number;
  comparePaise: number | null;
  sizeLabel: string | null;
  stockQty: number;
  lowStockThreshold: number;
  images: ProductImageView[];
}

/** Lightweight catalogue row for the sitemap — every active product, no joins. */
export interface ProductSitemapEntry {
  slug: string;
  updatedAt: Date;
}

/** Active-product shape the quiz recommender reads. Trimmed to what it scores on. */
export interface QuizProductRow {
  slug: string;
  name: string;
  tagline: string | null;
  pricePaise: number;
  comparePaise: number | null;
  sizeLabel: string | null;
  categoryName: string;
  isFeatured: boolean;
  sortOrder: number;
}

/**
 * Every active product with the fields the quiz needs. Server-fetched on
 * `/quiz` page load so a new product Sarita adds becomes recommendable on
 * the next request — no cache, no redeploy.
 */
export async function listActiveProductsForQuiz(): Promise<QuizProductRow[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      slug: true,
      name: true,
      tagline: true,
      pricePaise: true,
      comparePaise: true,
      sizeLabel: true,
      isFeatured: true,
      sortOrder: true,
      category: { select: { name: true } },
    },
  });

  return products.map((product) => ({
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    pricePaise: product.pricePaise,
    comparePaise: product.comparePaise,
    sizeLabel: product.sizeLabel,
    categoryName: product.category.name,
    isFeatured: product.isFeatured,
    sortOrder: product.sortOrder,
  }));
}

/**
 * Every active product, returned as the minimum sitemap.xml needs. Sitemap
 * generation runs on a daily revalidate, so a fresh query per refresh is
 * cheap; no caching layer beyond Vercel's CDN.
 */
export async function listActiveProductsForSitemap(): Promise<ProductSitemapEntry[]> {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: { slug: true, updatedAt: true },
  });
}

/**
 * Fetch one product by slug for the public detail page. Inactive products and
 * missing slugs both return `null` — callers turn that into a 404 via
 * `notFound()`. Images come back sorted by their admin-defined order.
 */
export async function getProductBySlug(slug: string): Promise<ProductDetailView | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      sku: true,
      name: true,
      nameGu: true,
      tagline: true,
      taglineGu: true,
      description: true,
      descriptionGu: true,
      benefits: true,
      benefitsGu: true,
      ingredients: true,
      ingredientsGu: true,
      howToUse: true,
      howToUseGu: true,
      pricePaise: true,
      comparePaise: true,
      sizeLabel: true,
      stockQty: true,
      lowStockThreshold: true,
      isActive: true,
      category: { select: { name: true } },
      images: {
        orderBy: { sortOrder: 'asc' },
        select: {
          url: true,
          alt: true,
          altGu: true,
          width: true,
          height: true,
        },
      },
    },
  });

  // Inactive products are invisible to customers — same as if they didn't exist.
  if (!product || !product.isActive) return null;

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    nameGu: product.nameGu,
    categoryName: product.category.name,
    tagline: product.tagline,
    taglineGu: product.taglineGu,
    description: product.description,
    descriptionGu: product.descriptionGu,
    benefits: product.benefits,
    benefitsGu: product.benefitsGu,
    ingredients: product.ingredients,
    ingredientsGu: product.ingredientsGu,
    howToUse: product.howToUse,
    howToUseGu: product.howToUseGu,
    pricePaise: product.pricePaise,
    comparePaise: product.comparePaise,
    sizeLabel: product.sizeLabel,
    stockQty: product.stockQty,
    lowStockThreshold: product.lowStockThreshold,
    // Dimensions are nullable in the schema but the admin upload pipeline
    // always captures them; the 1000-px fallback is purely defensive so the
    // page never crashes on legacy or hand-inserted rows.
    images: product.images.map((image) => ({
      url: image.url,
      alt: image.alt,
      altGu: image.altGu,
      width: image.width ?? 1000,
      height: image.height ?? 1000,
    })),
  };
}
