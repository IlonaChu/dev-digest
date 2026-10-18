/** Shown wherever a cost/token figure is unknown. NEVER "$0.00" — that would claim the run was free. */
export const COST_UNKNOWN = "—";

/** Smallest cost shown as a number; anything below renders "<$0.000001". */
const MIN_SHOWN_USD = 0.000001;

/**
 * USD cost for display. Precision follows magnitude so sub-cent runs stay readable:
 *   null / undefined → "—"   (no data)
 *   0                → "$0.00" (genuinely free, e.g. a free-tier model)
 *   ≥ $0.01          → "$0.014"  (3 decimals)
 *   < $0.01          → "$0.0013", "$0.00013" (2 significant digits, so per-run costs and their
 *                      PR sum round alike: $0.00013 + $0.00013 = $0.00026, not $0.0001 + $0.0001 = $0.0003)
 *   < $0.000001      → "<$0.000001" (never "$0.000000", which reads as zero)
 */
export function formatCost(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd)) return COST_UNKNOWN;
  if (usd === 0) return "$0.00";
  if (usd >= 0.01) return `$${usd.toFixed(3)}`;
  if (usd < MIN_SHOWN_USD) return "<$0.000001";
  // toFixed, not toPrecision: toPrecision switches to exponent notation ("1.2e-7") for tiny values.
  return `$${usd.toFixed(1 - Math.floor(Math.log10(usd)))}`;
}

/** Whole-number token count with a space as thousands separator ("9 119"). */
export function formatTokenCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return COST_UNKNOWN;
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
