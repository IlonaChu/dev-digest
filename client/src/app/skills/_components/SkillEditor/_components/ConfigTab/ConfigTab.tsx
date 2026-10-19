/* Skill Config tab — name, description (the skill's interface), type, body (Markdown);
   the enabled switch and the Save button sit in the header row. The switch is live
   (one PUT per flip, exactly like the card switch in the list) and reads the saved
   skill, so a flip in the list shows here at once; only the text fields wait for
   Save. The form is seeded once; the parent keys this by skill id (+ version), so
   the fields are read-only while a save is in flight — a new version re-seeds them. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, FormField, SelectInput, TextInput, Toggle } from "@devdigest/ui";
import type { Skill, SkillType } from "@devdigest/shared";
import { VettingPanel } from "@/app/skills/_components/VettingPanel";
import { useRevetSkill, useUpdateSkill } from "@/lib/hooks/skills";
import { blockReasonKey, requiresVetting, skillBlockReason } from "@/lib/skill-policy";
import { useToast } from "@/lib/toast";
import { SKILL_TYPES } from "@/app/skills/constants";
import { changedFields, createsVersion, formFrom } from "./helpers";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { s } from "./styles";

export function ConfigTab({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const toast = useToast();
  const update = useUpdateSkill();
  const toggle = useUpdateSkill();
  const revet = useRevetSkill();
  const [form, setForm] = React.useState(() => formFrom(skill));
  const [note, setNote] = React.useState("");
  const blockedNoteId = React.useId();

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const patch = changedFields(skill, form);
  const dirty = Object.keys(patch).length > 0;
  const needsNote = createsVersion(skill, form);
  const canSave = form.name.trim() !== "" && form.body.trim() !== "" && dirty;
  const pending = update.isPending;

  const reason = skillBlockReason(skill);
  // A blocked skill stays off; switching an already-enabled one OFF is always allowed.
  const enableLocked = reason !== null && !skill.enabled;
  const setEnabled = (enabled: boolean) => toggle.mutate({ id: skill.id, patch: { enabled } });

  const save = () =>
    update.mutate(
      {
        id: skill.id,
        patch: { ...patch, ...(needsNote && note.trim() ? { version_message: note.trim() } : {}) },
      },
      {
        onSuccess: (data) => {
          toast.success(t("config.savedToast", { version: data.version }));
          setNote("");
        },
      },
    );

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.h2}>{t("config.title")}</h2>
        <Badge mono icon="GitCommit">
          {t("preview.version", { version: skill.version })}
        </Badge>
        <label style={s.enabledLabel}>
          {t("config.enabled")}
          <Toggle
            on={skill.enabled}
            onChange={setEnabled}
            size={16}
            disabled={enableLocked || toggle.isPending}
            aria-describedby={enableLocked ? blockedNoteId : undefined}
          />
        </label>
        {update.isSuccess && !dirty && <span style={s.savedNote}>{t("config.saved", { version: update.data?.version })}</span>}
        <Button kind="primary" size="sm" icon="Check" onClick={save} disabled={!canSave || pending}>
          {pending ? t("config.saving") : t("config.save")}
        </Button>
      </div>
      {enableLocked && reason && (
        <div id={blockedNoteId} style={s.blockedNote}>
          {t("config.blockedEnable", { reason: t(`vetting.${blockReasonKey(reason)}`) })}
        </div>
      )}

      {requiresVetting(skill.source) && skill.vetting && (
        <div style={s.vetting}>
          <VettingPanel
            vetting={skill.vetting}
            onRerun={() => revet.mutate(skill.id, { onSuccess: (d) => toast.info(t("vetting.rerunDone", { status: d.vetting?.status ?? "—" })) })}
            rerunning={revet.isPending}
            notice={reason === "stale_check" ? t("vetting.stale") : undefined}
          />
        </div>
      )}
      {requiresVetting(skill.source) && !skill.vetting && (
        <div style={s.vetting}>
          <div style={s.blockedNote}>{t("vetting.notChecked")}</div>
          <Button kind="ghost" size="sm" icon="RefreshCw" onClick={() => revet.mutate(skill.id)} loading={revet.isPending}>
            {t("vetting.rerun")}
          </Button>
        </div>
      )}

      <FormField label={t("config.name")} required>
        <TextInput
          value={form.name}
          onChange={(v) => set("name", v)}
          placeholder={t("config.namePlaceholder")}
          mono
          readOnly={pending}
        />
      </FormField>
      <FormField label={t("config.description")} hint={t("config.descriptionHint")}>
        <TextInput
          value={form.description}
          onChange={(v) => set("description", v)}
          placeholder={t("config.descriptionPlaceholder")}
          readOnly={pending}
        />
      </FormField>
      <FormField label={t("config.type")}>
        <SelectInput
          value={form.type}
          onChange={(v) => set("type", v as SkillType)}
          options={SKILL_TYPES.map((v) => ({ value: v, label: t(`typeLabel.${v}`) }))}
          disabled={pending}
        />
      </FormField>
      <FormField label={t("config.body")} required>
        <MarkdownEditor
          value={form.body}
          onChange={(v) => set("body", v)}
          fileName={form.name}
          dirty={form.body !== skill.body}
          placeholder={t("config.bodyPlaceholder")}
          readOnly={pending}
        />
      </FormField>
      {needsNote && (
        <FormField label={t("config.changeNote")} hint={t("config.changeNoteHint")}>
          <TextInput value={note} onChange={setNote} placeholder={t("config.changeNotePlaceholder")} readOnly={pending} />
        </FormField>
      )}
    </div>
  );
}
