/* CreateSkillModal — "Create skill from conventions". Opens with the server's draft of the accepted
   rules; every field is editable; saving stores an `extracted` skill and opens it in the skill editor
   (attaching it to an agent is the toast's follow-up). Closing with edits asks first. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, FormField, Icon, Modal, SelectInput, TextInput, Toggle } from "@devdigest/ui";
import { SkillType } from "@devdigest/shared";
import type { ConventionSkillDraft } from "@devdigest/shared";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { ApiError } from "@/lib/api";
import { useCreateConventionSkill } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import { ATTACH_HREF, MODAL_WIDTH, NAME_TAKEN_CODE } from "./constants";
import { canSubmit, formFromDraft, isDirty, type SkillForm } from "./helpers";
import { s } from "./styles";

export function CreateSkillModal({
  repoId,
  repoName,
  draft,
  conventionIds,
  onClose,
}: {
  repoId: string;
  repoName: string;
  draft: ConventionSkillDraft;
  conventionIds: string[];
  onClose: () => void;
}) {
  const t = useTranslations("conventions");
  const tSkills = useTranslations("skills");
  const router = useRouter();
  const toast = useToast();
  const create = useCreateConventionSkill(repoId);

  const initial = React.useMemo(() => formFromDraft(draft), [draft]);
  const [form, setForm] = React.useState<SkillForm>(initial);
  const set = <K extends keyof SkillForm>(key: K, value: SkillForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const dirty = isDirty(form, initial);

  const close = React.useCallback(() => {
    if (dirty && !window.confirm(t("modal.discard"))) return;
    onClose();
  }, [dirty, onClose, t]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const nameErrorId = React.useId();
  // Only while the name on screen is the one the server refused; renaming clears the error.
  const nameTaken =
    create.error instanceof ApiError &&
    create.error.code === NAME_TAKEN_CODE &&
    create.variables?.name === form.name.trim();

  const submit = async () => {
    const { skill_id } = await create.mutateAsync({
      name: form.name.trim(),
      description: form.description,
      type: form.type,
      enabled: form.enabled,
      body: form.body,
      convention_ids: conventionIds,
    });
    toast.success(t("toast.created", { name: form.name.trim() }), {
      label: t("toast.attach"),
      onClick: () => router.push(ATTACH_HREF),
    });
    onClose();
    router.push(`/skills/${skill_id}?tab=config`);
  };

  return (
    <Modal
      width={MODAL_WIDTH}
      title={t("modal.title")}
      subtitle={<span className="mono">{form.name}</span>}
      onClose={close}
      footer={
        <div style={s.footer}>
          <span style={s.savedAs}>
            <Icon.GitCommit size={14} />
            {t("modal.savedAs")}
          </span>
          <Button kind="ghost" onClick={close}>
            {t("modal.cancel")}
          </Button>
          <Button
            kind="primary"
            icon="Sparkles"
            disabled={!canSubmit(form) || create.isPending}
            loading={create.isPending}
            onClick={() => void submit().catch(() => undefined)}
          >
            {create.isPending ? t("modal.creating") : t("modal.create")}
          </Button>
        </div>
      }
    >
      <div style={s.body}>
        <div style={s.banner} role="note">
          <Icon.Wrench size={16} style={{ color: "var(--accent-text)", flexShrink: 0 }} />
          <span>
            {t.rich("modal.banner", {
              count: conventionIds.length,
              repo: repoName,
              b: (chunks) => <span style={s.bannerStrong}>{chunks}</span>,
              name: (chunks) => <span className="mono" style={s.bannerRepo}>{chunks}</span>,
            })}
          </span>
        </div>

        <FormField label={t("modal.name")} required>
          <TextInput
            value={form.name}
            onChange={(v) => set("name", v)}
            mono
            aria-label={t("modal.name")}
            aria-invalid={nameTaken || undefined}
            aria-describedby={nameTaken ? nameErrorId : undefined}
          />
          {nameTaken && (
            <div id={nameErrorId} style={s.error} role="alert">
              {t("modal.nameTaken")}
            </div>
          )}
        </FormField>

        <FormField label={t("modal.description")}>
          <TextInput value={form.description} onChange={(v) => set("description", v)} aria-label={t("modal.description")} />
        </FormField>

        <div style={s.row}>
          <FormField label={t("modal.type")}>
            <SelectInput
              value={form.type}
              onChange={(v) => set("type", v as SkillForm["type"])}
              options={SkillType.options.map((value) => ({ value, label: tSkills(`typeLabel.${value}`) }))}
              aria-label={t("modal.type")}
            />
          </FormField>
          <FormField label={t("modal.enabled")} hint={t("modal.enabledHint")}>
            <div style={s.toggleWrap}>
              <Toggle on={form.enabled} onChange={(v) => set("enabled", v)} aria-label={t("modal.enabled")} />
            </div>
          </FormField>
        </div>

        <FormField label={t("modal.body")} required>
          <MarkdownEditor value={form.body} onChange={(v) => set("body", v)} fileName={form.name} dirty={dirty} />
        </FormField>
      </div>
    </Modal>
  );
}
