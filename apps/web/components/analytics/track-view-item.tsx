'use client';

import { useEffect } from 'react';

import { type AnalyticsItem, trackViewItem } from '@/lib/analytics/gtag';

/** Reports a GA4 `view_item` once per product page view. Renders nothing. */
export function TrackViewItem({ sku, name, category, pricePaise }: AnalyticsItem) {
  useEffect(() => {
    trackViewItem({ sku, name, category, pricePaise });
  }, [sku, name, category, pricePaise]);

  return null;
}
