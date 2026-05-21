/**
 * Display formatting for money.
 *
 * Money is stored everywhere as integer paise (see CLAUDE.md — ₹299 = 29900).
 * This is the single boundary where paise becomes a human-facing rupee string;
 * never format money by hand in a component.
 */

/** `formatPrice(29900)` → `"₹299"`. Uses Indian digit grouping (1,29,900). */
export function formatPrice(paise: number): string {
  const rupees = paise / 100;
  const grouped = Number.isInteger(rupees)
    ? rupees.toLocaleString('en-IN')
    : rupees.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `₹${grouped}`;
}
