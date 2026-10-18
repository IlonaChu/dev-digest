/* DiffModal — line diff of an old version against the current text (body, and the
   description when it differs). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@devdigest/ui";
import type { Skill, SkillVersion } from "@devdigest/shared";
import { isIdentical, lineDiff, type DiffLine } from "../../helpers";
import { MARK, s } from "./styles";

function DiffBox({ diff }: { diff: DiffLine[] }) {
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

export function DiffModal({
  version,
  current,
  onClose,
}: {
  version: SkillVersion;
  current: Skill;
  onClose: () => void;
}) {
  const t = useTranslations("skills");
  const bodyDiff = lineDiff(version.body, current.body);
  const descDiff = lineDiff(version.description, current.description);
  const descSame = isIdentical(descDiff);
  const bodySame = isIdentical(bodyDiff);
  return (
    <Modal
      width={820}
      title={t("versions.diffTitle", { version: version.version })}
      onClose={onClose}
      footer={
        <Button kind="ghost" onClick={onClose}>
          {t("preview.close")}
        </Button>
      }
    >
      <div style={s.body}>
        {!descSame && (
          <div>
            <div style={s.label}>{t("versions.diffDescription")}</div>
            <DiffBox diff={descDiff} />
          </div>
        )}
        {bodySame && descSame ? <div style={s.same}>{t("versions.diffSame")}</div> : !bodySame && <DiffBox diff={bodyDiff} />}
      </div>
    </Modal>
  );
}
