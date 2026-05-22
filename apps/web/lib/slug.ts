/**
 * Slug generation — turn a product or category name into a URL-safe slug.
 *
 * Everything is lowercased and any run of characters that is not a lowercase
 * letter or digit becomes a single hyphen; leading and trailing hyphens are
 * trimmed. Generated from the English name, so the result always satisfies
 * `SLUG_REGEX` in the validators.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
