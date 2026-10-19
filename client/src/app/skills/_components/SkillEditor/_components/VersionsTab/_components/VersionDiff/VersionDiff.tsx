/* VersionDiff — the panel that unfolds under a version row. The current version shows
   its body as is; an older one shows the line diff against the current text (body,
   and the description when it differs). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { Skill, SkillVersion } from "@devdigest/shared";
import { isIdentical, lineDiff, type DiffLine } from "../../helpers";
import { MARK, s } from "./styles";

function DiffLines({ diff }: { diff: DiffLine[] }) {
  return (
    <div className="mono" style={s.box}>
      {diff.map((l, i) => (
        <div key={i} style={s.line(l.kind)} data-kind={l.kind}>
          <span style={s.mark}>{MARK(l.kind)}</span>
          <span>{l.text || " "}</span>
        </div>
      ))}
    </div>
  );
}

export function VersionDiff({ version, current }: { version: SkillVersion; current: Skill }) {
  const t = useTranslations("skills");
  if (version.version === current.version) {
    return (
      <div style={s.panel}>
        <pre className="mono" style={s.plain}>
          {current.body}
        </pre>
      </div>
    );
  }
  const bodyDiff = lineDiff(version.body, current.body);
  const descDiff = lineDiff(version.description, current.description);
  const descSame = isIdentical(descDiff);
  const bodySame = isIdentical(bodyDiff);
  return (
    <div style={s.panel}>
      {!descSame && (
        <div>
          <div style={s.label}>{t("versions.diffDescription")}</div>
          <DiffLines diff={descDiff} />
        </div>
      )}
      {bodySame && descSame ? <div style={s.same}>{t("versions.diffSame")}</div> : !bodySame && <DiffLines diff={bodyDiff} />}
    </div>
  );
}
