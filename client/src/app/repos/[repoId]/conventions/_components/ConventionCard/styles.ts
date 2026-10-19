import type { CSSProperties } from "react";
import type { ConventionStatus } from "@devdigest/shared";

export const s = {
  card: (status: ConventionStatus): CSSProperties => ({
    display: "grid",
    gridTemplateColumns: "1fr 150px",
    gap: 20,
    padding: "18px 20px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    borderLeft: `3px solid ${status === "accepted" ? "var(--ok)" : "var(--border-strong)"}`,
    background: "var(--bg-elevated)",
  }),
  main: { minWidth: 0, display: "flex", flexDirection: "column", gap: 12 } satisfies CSSProperties,
  titleRow: { display: "flex", alignItems: "flex-start", gap: 8 } satisfies CSSProperties,
  rule: { flex: 1, margin: 0, fontSize: 15.5, fontWeight: 600, fontStyle: "italic", lineHeight: 1.4 } satisfies CSSProperties,
  editedTag: { fontSize: 11, color: "var(--text-muted)", fontWeight: 500, fontStyle: "normal", marginLeft: 8 } satisfies CSSProperties,
  editWrap: { flex: 1, display: "flex", flexDirection: "column", gap: 8 } satisfies CSSProperties,
  editArea: { fontSize: 15.5, fontWeight: 600, fontStyle: "italic", lineHeight: 1.4, fontFamily: "inherit", minHeight: 64 } satisfies CSSProperties,
  editActions: { display: "flex", gap: 8 } satisfies CSSProperties,
  actions: { display: "flex", flexDirection: "column", gap: 8 } satisfies CSSProperties,
};
