/* ImportReview — the "read before you save" half of an import: where the file
   came from, the trust warning, editable name/type/description, the parsed body,
   the archive files left out, the safety check, the confirm checkbox and Save.
   Shared by the From file and Import from URL tabs. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, FormField, Icon, Markdown, SelectInput, TextInput, type IconName } from "@devdigest/ui";
import type { SkillType } from "@devdigest/shared";
import { VettingPanel } from "@/app/skills/_components/VettingPanel";
import { SKILL_TYPES } from "@/app/skills/constants";
import type { ImportDraft } from "../../_lib/useImportDraft";
import { s } from "./styles";

export function ImportReview({
  draft,
  source,
}: {
  draft: ImportDraft;
  /** What is being reviewed (file name or URL) and the label of the "start over" button. */
  source: { icon: IconName; label: string; resetLabel: string };
}) {
  const t = useTranslations("skills");
  const nameErrorId = React.useId();
  const { preview } = draft;
  if (!preview) return null;
  const SourceIcon = Icon[source.icon];

  return (
    <div style={s.wrap}>
      <div style={s.sourceRow}>
        <SourceIcon size={14} />
        <span className="mono" style={s.sourceLabel} title={source.label}>
          {source.label}
        </span>
        <Button kind="ghost" size="sm" onClick={draft.reset}>
          {source.resetLabel}
        </Button>
      </div>

      <div style={s.trust} role="note">
        <Icon.AlertTriangle size={16} style={{ color: "var(--warn)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <span style={s.trustTitle}>{t("import.trustTitle")}</span>
          {t("import.trustWarning")}
        </div>
      </div>

      <div style={s.grid}>
        <FormField label={t("import.fields.name")} required>
          <TextInput
            value={draft.name}
            onChange={draft.setName}
            mono
            aria-label={t("import.fields.name")}
            aria-invalid={draft.nameBlocked || undefined}
            aria-describedby={draft.nameBlocked ? nameErrorId : undefined}
          />
        </FormField>
        <FormField label={t("import.fields.type")}>
          <SelectInput
            value={draft.type}
            onChange={(v) => draft.setType(v as SkillType)}
            options={SKILL_TYPES.map((v) => ({ value: v, label: t(`typeLabel.${v}`) }))}
            aria-label={t("import.fields.type")}
          />
        </FormField>
      </div>
      {draft.nameBlocked && (
        <div id={nameErrorId} style={s.warning} role="alert">
          {t("import.nameTaken")}
        </div>
      )}
      <FormField label={t("import.fields.description")}>
        <TextInput value={draft.description} onChange={draft.setDescription} aria-label={t("import.fields.description")} />
      </FormField>
      <FormField label={t("import.fields.body")}>
        <div style={s.bodyBox}>
          <Markdown>{preview.body}</Markdown>
        </div>
      </FormField>

      {preview.ignored_files.length > 0 && (
        <div style={s.ignored}>
          <div style={s.ignoredTitle}>{t("import.ignoredTitle")}</div>
          <div style={s.ignoredNote}>{t("import.ignoredNote")}</div>
          <ul style={s.ignoredList}>
            {preview.ignored_files.map((f) => (
              <li key={f.path} style={s.ignoredItem}>
                <span className="mono">{f.path}</span>
                <Badge
                  color={f.executable ? "var(--crit)" : "var(--text-muted)"}
                  bg={f.executable ? "var(--crit-bg)" : "var(--bg-hover)"}
                  icon={f.executable ? "AlertOctagon" : undefined}
                >
                  {f.executable ? t("import.ignoredExecutable") : t("import.ignoredOther")}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <VettingPanel vetting={preview.vetting} />
      {draft.blocked && <div style={s.warning}>{t("import.blockedNote")}</div>}

      <label style={s.confirm}>
        <input type="checkbox" checked={draft.confirmed} onChange={(e) => draft.setConfirmed(e.target.checked)} />
        <span>{t("import.confirm")}</span>
      </label>

      <Button kind="primary" size="lg" full icon="Upload" onClick={draft.save} disabled={!draft.canSave || draft.saving}>
        {draft.saving ? t("import.saving") : t("import.save")}
      </Button>
    </div>
  );
}
