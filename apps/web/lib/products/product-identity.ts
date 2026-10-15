/**
 * When are two catalogue entries the same product?
 *
 * Same name and same pack size, compared loosely, because the same product
 * gets typed differently: "Aloevera Gel" and "Aloe Vera Gel", "100 Gms." and
 * "100 g". Different sizes of one product ("Coconut Oil" 100 ml and 200 ml)
 * are separate products. A blank size matches any size: it usually means
 * the size was simply not typed, so a second entry is almost certainly the
 * same product again.
 */

/** "Aloe Vera Gel (Premium)" → "aloeveragelpremium". */
export function productNameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** "100 Gms." → "100g", "50 Ml." → "50ml", blank → "". */
export function productSizeKey(sizeLabel: string | null | undefined): string {
  return (sizeLabel ?? '')
    .toLowerCase()
    .replace(/[\s.]/g, '')
    .replace(/(grams?|gms?)$/, 'g')
    .replace(/(millilit(?:re|er)s?|mls)$/, 'ml')
    .replace(/(kilograms?|kgs)$/, 'kg')
    .replace(/(lit(?:re|er)s?|ltrs?)$/, 'l');
}

export function isSameProduct(
  a: { name: string; sizeLabel: string | null | undefined },
  b: { name: string; sizeLabel: string | null | undefined },
): boolean {
  if (productNameKey(a.name) !== productNameKey(b.name)) return false;
  const sizeA = productSizeKey(a.sizeLabel);
  const sizeB = productSizeKey(b.sizeLabel);
  return sizeA === '' || sizeB === '' || sizeA === sizeB;
}
