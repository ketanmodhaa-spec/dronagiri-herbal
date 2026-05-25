import Image from 'next/image';
import Link from 'next/link';

import { LeafIcon } from '@/components/ui/icons';
import { formatPrice } from '@/lib/format';

/** Primary image as the card needs it — URL + dimensions + accessible alt. */
export interface ProductCardImage {
  url: string;
  alt: string | null;
  width: number;
  height: number;
}

/**
 * The fields a card needs to render — deliberately a plain shape, not the
 * Prisma `Product`, so the card stays decoupled from the data layer.
 */
export interface ProductCardData {
  slug: string;
  name: string;
  pricePaise: number;
  comparePaise: number | null;
  sizeLabel: string | null;
  categoryName: string | null;
  /** First image in admin-defined order, or `null` if none uploaded yet. */
  image: ProductCardImage | null;
}

/**
 * Catalogue tile used on the homepage featured grid, the `/shop` index, the
 * quiz result, and related-products strips. When the product has an uploaded
 * photo we render it; otherwise the same branded LeafIcon-on-green
 * placeholder a card always had stays — products without images are still
 * visible, just without imagery.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const onSale =
    product.comparePaise !== null && product.comparePaise > product.pricePaise;
  const image = product.image;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-forest-100 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-forest-200"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-forest-100 to-forest-200">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.name}
            width={image.width}
            height={image.height}
            sizes="(min-width: 768px) 25vw, 50vw"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <LeafIcon className="h-16 w-16 text-forest-600 transition-transform duration-300 group-hover:scale-110" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.categoryName && (
          <p className="text-[11px] font-medium uppercase tracking-wider text-gold">
            {product.categoryName}
          </p>
        )}
        <h3 className="font-display text-base font-semibold leading-snug text-forest-900">
          {product.name}
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-body text-lg font-medium text-forest-800">
            {formatPrice(product.pricePaise)}
          </span>
          {onSale && product.comparePaise !== null && (
            <span className="text-sm text-stone-light line-through">
              {formatPrice(product.comparePaise)}
            </span>
          )}
          {product.sizeLabel && (
            <span className="ml-auto text-xs text-stone-light">{product.sizeLabel}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
