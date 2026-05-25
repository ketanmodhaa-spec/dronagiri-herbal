import { serialiseJsonLd } from '@/lib/seo/json-ld';

/**
 * Inject a schema.org payload as a JSON-LD `<script>` block. Build the
 * payload with one of the `lib/seo/json-ld` builders, then render this
 * component anywhere in a server component's tree (head or body — Google
 * accepts both).
 *
 * `dangerouslySetInnerHTML` is the only way to emit a raw JSON literal;
 * React would otherwise escape the braces as text. The serialiser is the
 * XSS boundary — it escapes `<` so a stray `</script>` inside a product
 * description can never terminate the surrounding script tag.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialiseJsonLd(data) }}
    />
  );
}
