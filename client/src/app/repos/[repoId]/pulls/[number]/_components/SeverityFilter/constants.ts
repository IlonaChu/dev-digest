import type { Severity } from "@devdigest/shared";

/** Levels shown in the filter bar, most severe first. */
export const SEVERITY_LEVELS: readonly Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"];

/** URL search param that carries the active severity filter. */
export const SEVERITY_PARAM = "severity";
