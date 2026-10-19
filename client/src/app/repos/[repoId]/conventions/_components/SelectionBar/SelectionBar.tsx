/* SelectionBar — "Deselect all · N of M accepted · Create skill" (Create skill only once something is accepted). */
"use client";

import { useTranslations } from "next-intl";
import { Button } from "@devdigest/ui";
import { s } from "./styles";

export function SelectionBar({
  accepted,
  total,
  busy,
  creating,
  onToggleAll,
  onCreate,
}: {
  accepted: number;
  total: number;
  /** A bulk select / deselect is in flight. */
  busy: boolean;
  /** The skill draft is being prepared. */
  creating: boolean;
  onToggleAll: () => void;
  onCreate: () => void;
}) {
  const t = useTranslations("conventions");
  const anyAccepted = accepted > 0;
  return (
    <div style={s.bar}>
      <Button kind="secondary" icon={anyAccepted ? "X" : "Check"} disabled={busy} onClick={onToggleAll}>
        {anyAccepted ? t("selection.deselectAll") : t("selection.selectAll")}
      </Button>
      <span className="tnum" style={s.count}>
        {t("selection.count", { accepted, total })}
      </span>
      <span style={s.spacer} />
      {anyAccepted && (
        <Button kind="primary" icon="Sparkles" disabled={creating} loading={creating} onClick={onCreate}>
          {t("selection.createSkill")}
        </Button>
      )}
    </div>
  );
}
