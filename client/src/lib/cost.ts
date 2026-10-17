/** Shown wherever a cost/token figure is unknown. NEVER "$0.00" — that would claim the run was free. */
export const COST_UNKNOWN = "—";

/**
 * USD cost for display. Precision follows magnitude so sub-cent runs stay readable:
 *   null / undefined → "—"   (no data)
 *   0                → "$0.00" (genuinely free, e.g. a free-tier model)
 *   ≥ $0.01          → "$0.014"  (3 decimals)
 *   < $0.01          → "$0.0013" (4 decimals)
 *   < $0.0001        → "<$0.0001" (never "$0.0000", which reads as zero)
 */
export function formatCost(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd)) return COST_UNKNOWN;
  if (usd === 0) return "$0.00";
  if (usd < 0.0001) return "<$0.0001";
  return `$${usd.toFixed(usd >= 0.01 ? 3 : 4)}`;
}

/** Whole-number token count with a space as thousands separator ("9 119"). */
export function formatTokenCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return COST_UNKNOWN;
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
