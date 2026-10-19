/* Skill Versions tab — every save of the body/description snapshots it. "Diff" unfolds
   the row: the current version shows its body, an older one its line diff against the
   current text. Restore saves the old text as a NEW version. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, ErrorState, Skeleton } from "@devdigest/ui";
import type { Skill, SkillVersion } from "@devdigest/shared";
import { useRestoreSkillVersion, useSkillVersions } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { VersionDiff } from "./_components/VersionDiff";
import { shortDate } from "./helpers";
import { s } from "./styles";

export function VersionsTab({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const toast = useToast();
  const { data: versions, isLoading, isError, refetch } = useSkillVersions(skill.id);
  const restore = useRestoreSkillVersion();
  const [open, setOpen] = React.useState<ReadonlySet<number>>(() => new Set());

  const list = [...(versions ?? [])].sort((a, b) => b.version - a.version);

  const toggle = (version: number) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });

  const onRestore = (v: SkillVersion) => {
    if (!window.confirm(t("versions.restoreConfirm", { version: v.version }))) return;
    restore.mutate(
      { id: skill.id, version: v.version },
      { onSuccess: () => toast.success(t("versions.restoredToast", { version: v.version })) },
    );
  };

  return (
    <div style={s.wrap}>
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
          const expanded = open.has(v.version);
          return (
            <div key={v.version} style={s.row(current)}>
              <div style={s.rowHead} title={shortDate(v.created_at)}>
                <span className="mono" style={s.version}>{`v${v.version}`}</span>
                {current && (
                  <Badge color="var(--ok)" bg="transparent" dot style={s.current}>
                    {t("versions.current")}
                  </Badge>
                )}
                {v.message && <span style={s.note}>{v.message}</span>}
                <div style={s.actions}>
                  <Button kind={expanded ? "secondary" : "ghost"} size="sm" onClick={() => toggle(v.version)} aria-expanded={expanded}>
                    {expanded ? t("versions.hide") : t("versions.diff")}
                  </Button>
                  {!current && (
                    <Button kind="secondary" size="sm" onClick={() => onRestore(v)} disabled={restore.isPending}>
                      {t("versions.restore")}
                    </Button>
                  )}
                </div>
              </div>
              {expanded && <VersionDiff version={v} current={skill} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
