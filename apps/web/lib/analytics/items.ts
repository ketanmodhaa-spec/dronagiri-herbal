/**
 * The storefront's product shapes → the one item shape GA events take.
 * Every mapper uses the SKU as the id, so a product reads the same in GA
 * whether it was seen on a card, in the quiz or in the cart.
 */
import type { CartLineView } from '@dronagiri/types';

import type { ProductCardData } from '@/components/ui/product-card';
import type { AnalyticsItem } from '@/lib/analytics/gtag';
import type { QuizProduct } from '@/lib/quiz/types';

export function cardToAnalyticsItem(product: ProductCardData | QuizProduct): AnalyticsItem {
  return {
    sku: product.sku,
    name: product.name,
    category: product.categoryName,
    pricePaise: product.pricePaise,
  };
}

/** A cart line, counted as `quantity` units (defaults to the whole line). */
export function cartLineToAnalyticsItem(line: CartLineView, quantity = line.quantity): AnalyticsItem {
  return {
    sku: line.sku,
    name: line.name,
    category: line.categoryName,
    pricePaise: line.unitPricePaise,
    quantity,
  };
}
