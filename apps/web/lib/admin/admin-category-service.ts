/**
 * Category administration — the catalogue's category read and write paths.
 *
 * Categories are soft-deleted via `isActive`; a category that still holds
 * products cannot be removed (the schema's `onDelete: Restrict`).
 */
import { Prisma, prisma, type Category } from '@dronagiri/db';
import type { AdminCategoryCreate, AdminCategoryUpdate } from '@dronagiri/validators';

import { NotFoundError, ValidationError } from '@/lib/errors';

/** A row in the admin category list. */
export interface AdminCategoryListItem {
  id: string;
  name: string;
  nameGu: string | null;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

/** A category option for the product form's category picker. */
export interface CategoryOption {
  id: string;
  name: string;
  isActive: boolean;
}

function orNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function rethrowWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ValidationError('A category with this URL slug already exists.', 'SLUG_TAKEN');
    }
    if (error.code === 'P2025') {
      throw new NotFoundError('Category not found.');
    }
  }
  throw error;
}

function toCategoryData(input: AdminCategoryUpdate) {
  return {
    name: input.name,
    nameGu: orNull(input.nameGu),
    slug: input.slug,
    description: orNull(input.description),
    imageUrl: orNull(input.imageUrl),
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  };
}

/** Every category, with how many products each holds. */
export async function listCategoriesForAdmin(): Promise<AdminCategoryListItem[]> {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      nameGu: true,
      slug: true,
      description: true,
      imageUrl: true,
      sortOrder: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    nameGu: row.nameGu,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    productCount: row._count.products,
  }));
}

/** Categories for the product form's picker — active ones first. */
export async function listCategoryOptions(): Promise<CategoryOption[]> {
  return prisma.category.findMany({
    orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, isActive: true },
  });
}

export async function createCategory(input: AdminCategoryCreate): Promise<Category> {
  try {
    return await prisma.category.create({ data: toCategoryData(input) });
  } catch (error) {
    rethrowWriteError(error);
  }
}

export async function updateCategory(id: string, input: AdminCategoryUpdate): Promise<Category> {
  try {
    return await prisma.category.update({ where: { id }, data: toCategoryData(input) });
  } catch (error) {
    rethrowWriteError(error);
  }
}
