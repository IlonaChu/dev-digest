/* Skill Versions tab — every save of the body/description snapshots it. Diff compares
   an old version with the current text; Restore saves the old text as a NEW version. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, ErrorState, Skeleton } from "@devdigest/ui";
import type { Skill, SkillVersion } from "@devdigest/shared";
import { useRestoreSkillVersion, useSkillVersions } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { DiffModal } from "./_components/DiffModal";
import { shortDate } from "./helpers";
import { s } from "./styles";

export function VersionsTab({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const toast = useToast();
  const { data: versions, isLoading, isError, refetch } = useSkillVersions(skill.id);
  const restore = useRestoreSkillVersion();
  const [diffing, setDiffing] = React.useState<SkillVersion | null>(null);

  const list = [...(versions ?? [])].sort((a, b) => b.version - a.version);

  const onRestore = (v: SkillVersion) => {
    if (!window.confirm(t("versions.restoreConfirm", { version: v.version }))) return;
    restore.mutate(
      { id: skill.id, version: v.version },
      { onSuccess: () => toast.success(t("versions.restoredToast", { version: v.version })) },
    );
  };

  return (
    <div style={s.wrap}>
      {diffing && <DiffModal version={diffing} current={skill} onClose={() => setDiffing(null)} />}
      <div style={s.head}>
        <h2 style={s.h2}>{t("versions.title")}</h2>
        <Badge>{t("versions.count", { count: list.length })}</Badge>
      </div>
      <p style={s.hint}>{t("versions.hint")}</p>
      {isLoading && <Skeleton height={120} />}
      {isError && <ErrorState body={t("editor.loadErrorBody")} onRetry={() => refetch()} />}
      {!isLoading && !isError && list.length === 0 && <div style={s.empty}>{t("versions.empty")}</div>}
      <div style={s.list}>
        {list.map((v) => {
          const current = v.version === skill.version;
          return (
            <div key={v.version} style={s.row(current)}>
              <Badge mono>{`v${v.version}`}</Badge>
              <div style={s.info}>
                <div style={v.message ? s.note : s.noteEmpty}>{v.message || t("versions.noNote")}</div>
                <div style={s.date}>{shortDate(v.created_at)}</div>
              </div>
              {current ? (
                <Badge color="var(--ok)" bg="var(--ok-bg)" dot>
                  {t("versions.current")}
                </Badge>
              ) : (
                <div style={s.actions}>
                  <Button kind="ghost" size="sm" icon="Eye" onClick={() => setDiffing(v)}>
                    {t("versions.diff")}
                  </Button>
                  <Button kind="ghost" size="sm" icon="History" onClick={() => onRestore(v)} disabled={restore.isPending}>
                    {t("versions.restore")}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
