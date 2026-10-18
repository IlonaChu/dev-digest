/* Skill Config tab — name, description (the skill's interface), type, body (Markdown)
   and the enabled switch. Also used to create a new skill (no `skill`). The form is
   seeded once; the parent keys this by skill id (+ version) to reset it after a save. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Button, FormField, SelectInput, TextInput, Toggle } from "@devdigest/ui";
import type { Skill, SkillType } from "@devdigest/shared";
import { VettingPanel } from "@/components/VettingPanel";
import { useCreateSkill, useRevetSkill, useUpdateSkill } from "@/lib/hooks/skills";
import { blockReasonKey, requiresVetting, skillBlockReason } from "@/lib/skill-policy";
import { useToast } from "@/lib/toast";
import { DEFAULT_SKILL_TYPE, SKILL_TYPES } from "@/app/skills/constants";
import { changedFields, createsVersion, formFrom } from "./helpers";
import { MarkdownEditor } from "./_components/MarkdownEditor";
import { s } from "./styles";

const noop = () => {};

export function ConfigTab({ skill }: { skill?: Skill }) {
  const t = useTranslations("skills");
  const router = useRouter();
  const toast = useToast();
  const create = useCreateSkill();
  const update = useUpdateSkill();
  const revet = useRevetSkill();
  const [form, setForm] = React.useState(() => formFrom(skill, { type: DEFAULT_SKILL_TYPE }));
  const [note, setNote] = React.useState("");

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const patch = skill ? changedFields(skill, form) : {};
  const dirty = skill ? Object.keys(patch).length > 0 : form.name.trim() !== "" || form.body !== "";
  const needsNote = skill ? createsVersion(skill, form) : false;
  const canSave = form.name.trim() !== "" && form.body.trim() !== "" && (skill ? dirty : true);
  const pending = create.isPending || update.isPending;

  const reason = skill ? skillBlockReason(skill) : null;
  // A blocked skill stays off; switching an already-enabled one OFF is always allowed.
  const enableLocked = reason !== null && !form.enabled;

  const save = () => {
    if (!skill) {
      create.mutate(
        {
          name: form.name.trim(),
          description: form.description,
          type: form.type,
          body: form.body,
          enabled: form.enabled,
        },
        {
          onSuccess: (created) => {
            toast.success(t("config.createdToast"));
            router.replace(`/skills/${created.id}?tab=config`);
          },
        },
      );
      return;
    }
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
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.h2}>{t("config.title")}</h2>
        {skill && (
          <Badge mono icon="GitCommit">
            {t("preview.version", { version: skill.version })}
          </Badge>
        )}
        <label style={s.enabledLabel}>
          {t("config.enabled")}
          <span style={enableLocked ? s.blockedWrap : undefined} aria-disabled={enableLocked || undefined}>
            <Toggle on={form.enabled} onChange={enableLocked ? noop : (v) => set("enabled", v)} size={16} />
          </span>
        </label>
      </div>
      {enableLocked && reason && (
        <div style={s.blockedNote}>
          {t("config.blockedEnable", { reason: t(`vetting.${blockReasonKey(reason)}`) })}
        </div>
      )}

      {skill && requiresVetting(skill.source) && skill.vetting && (
        <div style={s.vetting}>
          <VettingPanel
            vetting={skill.vetting}
            onRerun={() => revet.mutate(skill.id, { onSuccess: (d) => toast.info(t("vetting.rerunDone", { status: d.vetting?.status ?? "—" })) })}
            rerunning={revet.isPending}
            notice={reason === "stale_check" ? t("vetting.stale") : undefined}
          />
        </div>
      )}
      {skill && requiresVetting(skill.source) && !skill.vetting && (
        <div style={s.vetting}>
          <div style={s.blockedNote}>{t("vetting.notChecked")}</div>
          <Button kind="ghost" size="sm" icon="RefreshCw" onClick={() => revet.mutate(skill.id)} loading={revet.isPending}>
            {t("vetting.rerun")}
          </Button>
        </div>
      )}

      <FormField label={t("config.name")} required>
        <TextInput value={form.name} onChange={(v) => set("name", v)} placeholder={t("config.namePlaceholder")} mono />
      </FormField>
      <FormField label={t("config.description")} hint={t("config.descriptionHint")}>
        <TextInput
          value={form.description}
          onChange={(v) => set("description", v)}
          placeholder={t("config.descriptionPlaceholder")}
        />
      </FormField>
      <FormField label={t("config.type")}>
        <SelectInput
          value={form.type}
          onChange={(v) => set("type", v as SkillType)}
          options={SKILL_TYPES.map((v) => ({ value: v, label: t(`type.${v}`) }))}
        />
      </FormField>
      <FormField label={t("config.body")} required>
        <MarkdownEditor
          value={form.body}
          onChange={(v) => set("body", v)}
          fileName={form.name}
          dirty={skill ? form.body !== skill.body : form.body !== ""}
          placeholder={t("config.bodyPlaceholder")}
        />
      </FormField>
      {needsNote && (
        <FormField label={t("config.changeNote")} hint={t("config.changeNoteHint")}>
          <TextInput value={note} onChange={setNote} placeholder={t("config.changeNotePlaceholder")} />
        </FormField>
      )}
      <div style={s.actions}>
        <Button kind="primary" icon="Check" onClick={save} disabled={!canSave || pending}>
          {pending ? t("config.saving") : skill ? t("config.save") : t("config.create")}
        </Button>
        {update.isSuccess && !dirty && <span style={s.savedNote}>{t("config.saved", { version: update.data?.version })}</span>}
      </div>
    </div>
  );
}
