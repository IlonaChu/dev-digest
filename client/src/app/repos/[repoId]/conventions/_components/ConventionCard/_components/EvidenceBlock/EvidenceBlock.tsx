/* EvidenceBlock — `path:lines` with a copy button, and the real lines from the file. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { IconBtn } from "@devdigest/ui";
import { s } from "./styles";

const COPIED_MS = 1500;

export function EvidenceBlock({ location, snippet }: { location: string; snippet: string }) {
  const t = useTranslations("conventions");
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    void navigator.clipboard?.writeText(location).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_MS);
    });
  };

  return (
    <div style={s.box}>
      <div style={s.head}>
        <span className="mono" style={s.location}>
          {location}
        </span>
        <IconBtn icon={copied ? "Check" : "Copy"} label={copied ? t("card.copied") : t("card.copyLocation")} size={26} onClick={copy} />
      </div>
      <pre className="mono" style={s.code}>
        {snippet}
      </pre>
    </div>
  );
}
