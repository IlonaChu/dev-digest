/**
 * What the code indexer parses — shared by the repo-intel module and the
 * adapters that implement its parsing (ast-grep, depgraph), so adapters never
 * import feature code.
 */

/** Files we parse (diff-scoped in T1; whole walk in T2). */
export const SUPPORTED_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'] as const;

/** Signatures are trimmed to this many chars in the parse phase (cache stability). */
export const MAX_SIGNATURE_CHARS = 120;
