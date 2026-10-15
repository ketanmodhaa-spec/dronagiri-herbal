'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { type AnalyticsItem, type AnalyticsList, trackSelectItem } from '@/lib/analytics/gtag';

interface SelectItemLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  list: AnalyticsList;
  item: AnalyticsItem;
  /** Position in the list, from 0. */
  index: number;
}

/** A product link that reports a GA4 `select_item` for the list it sits in. */
export function SelectItemLink({ href, className, children, list, item, index }: SelectItemLinkProps) {
  return (
    <Link href={href} className={className} onClick={() => trackSelectItem(list, item, index)}>
      {children}
    </Link>
  );
}
