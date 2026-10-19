/* ConfidenceBar — "Confidence ▬▬▬ 91%". Green from 80%, amber below. */
"use client";

import { useTranslations } from "next-intl";
import { ProgressBar } from "@devdigest/ui";
import { confidenceColor, confidencePercent } from "../../../../helpers";
import { s } from "./styles";

export function ConfidenceBar({ value }: { value: number }) {
  const t = useTranslations("conventions");
  const pct = confidencePercent(value);
  return (
    <div style={s.row}>
      <span style={s.label}>{t("card.confidence")}</span>
      <div style={s.bar}>
        <ProgressBar value={pct} color={confidenceColor(value)} height={5} />
      </div>
      <span className="tnum" style={s.pct}>
        {pct}%
      </span>
    </div>
  );
}
