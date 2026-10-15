'use client';

import { useEffect } from 'react';

import { type AnalyticsItem, type AnalyticsList, trackViewItemList } from '@/lib/analytics/gtag';

/** Reports a GA4 `view_item_list` once per page view of a product list. Renders nothing. */
export function TrackViewItemList({ list, items }: { list: AnalyticsList; items: AnalyticsItem[] }) {
  // Keyed on the SKUs shown, not the array, which is a new object every render.
  const shown = items.map((item) => item.sku).join(',');

  useEffect(() => {
    trackViewItemList(list, items);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `shown` stands in for `items`
  }, [list.id, shown]);

  return null;
}
