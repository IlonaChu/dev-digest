/* ImportSkillModal — the only way to bring in someone else's skill.
   Pick a .md / .zip → the server parses + vets it (nothing is stored) → the user reads
   the text, the ignored files and the safety result → confirms → it is saved DISABLED.
   Archive contents other than the skill text are listed, never read or run. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Button, FormField, Icon, Markdown, Modal, SelectInput, TextInput } from "@devdigest/ui";
import type { SkillImportPreview, SkillType } from "@devdigest/shared";
import { VettingPanel } from "@/components/VettingPanel";
import { useImportSkill, useImportSkillPreview, type SkillFilePayload } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { SKILL_TYPES } from "../../constants";
import { MAX_IMPORT_BYTES, MODAL_WIDTH } from "./constants";
import { hasAcceptedExtension, readFileAsBase64 } from "./helpers";
import { s } from "./styles";

export function ImportSkillModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("skills");
  const router = useRouter();
  const toast = useToast();
  const previewMut = useImportSkillPreview();
  const importMut = useImportSkill();

  const [payload, setPayload] = React.useState<SkillFilePayload | null>(null);
  const [preview, setPreview] = React.useState<SkillImportPreview | null>(null);
  const [readError, setReadError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<SkillType>("custom");
  const [confirmed, setConfirmed] = React.useState(false);

  const reset = () => {
    setPayload(null);
    setPreview(null);
    setReadError(null);
    setConfirmed(false);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    reset();
    if (!hasAcceptedExtension(file.name)) return setReadError(t("import.wrongType"));
    if (file.size > MAX_IMPORT_BYTES) return setReadError(t("import.tooLarge"));
    let content_base64: string;
    try {
      content_base64 = await readFileAsBase64(file);
    } catch {
      return setReadError(t("import.readError"));
    }
    const next = { filename: file.name, content_base64 };
    setPayload(next);
    previewMut.mutate(next, {
      onSuccess: (p) => {
        setPreview(p);
        setName(p.name);
        setDescription(p.description);
        setType(p.type);
      },
      onError: () => setPayload(null),
    });
  };

  // The preview only knows whether the ORIGINAL name is taken; a renamed skill may save.
  const nameBlocked = !!preview?.name_taken && name === preview.name;
  const canSave = !!payload && !!preview && confirmed && !nameBlocked && name.trim().length > 0;
  const blocked = !!preview && preview.vetting.status !== "clean";

  const save = async () => {
    if (!payload || !preview) return;
    const skill = await importMut.mutateAsync({ ...payload, name: name.trim(), description, type });
    toast.success(t("import.savedToast", { name: skill.name }));
    onClose();
    router.push(`/skills/${skill.id}?tab=config`);
  };

  return (
    <Modal
      width={MODAL_WIDTH}
      title={t("import.title")}
      subtitle={t("import.subtitle")}
      onClose={onClose}
      footer={
        <div style={s.footer}>
          <Button kind="ghost" onClick={onClose}>
            {t("import.cancel")}
          </Button>
          <Button kind="primary" icon="Upload" onClick={save} disabled={!canSave || importMut.isPending}>
            {importMut.isPending ? t("import.saving") : t("import.save")}
          </Button>
        </div>
      }
    >
      <div style={s.body}>
        {!preview && (
          <label style={s.drop}>
            <Icon.Upload size={22} style={{ color: "var(--text-muted)" }} />
            <span style={s.dropTitle}>{previewMut.isPending ? t("import.reading") : t("import.pick")}</span>
            <span style={s.dropHint}>{t("import.pickHint")}</span>
            <input
              type="file"
              accept=".md,.zip"
              aria-label={t("import.pick")}
              style={s.hiddenInput}
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {readError && <div style={s.error}>{readError}</div>}
        {previewMut.isError && !preview && (
          <div style={s.error}>
            {t("import.previewError")}: {previewMut.error instanceof Error ? previewMut.error.message : ""}
          </div>
        )}

        {preview && payload && (
          <>
            <div style={s.fileRow}>
              <Icon.FileText size={14} />
              <span className="mono" style={s.fileName}>
                {payload.filename}
              </span>
              <Button kind="ghost" size="sm" onClick={reset}>
                {t("import.chooseAnother")}
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
                <TextInput value={name} onChange={setName} mono />
              </FormField>
              <FormField label={t("import.fields.type")}>
                <SelectInput
                  value={type}
                  onChange={(v) => setType(v as SkillType)}
                  options={SKILL_TYPES.map((v) => ({ value: v, label: t(`type.${v}`) }))}
                />
              </FormField>
            </div>
            {nameBlocked && <div style={s.warning}>{t("import.nameTaken")}</div>}
            <FormField label={t("import.fields.description")}>
              <TextInput value={description} onChange={setDescription} />
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
            {blocked && <div style={s.warning}>{t("import.blockedNote")}</div>}

            <label style={s.confirm}>
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span>{t("import.confirm")}</span>
            </label>
          </>
        )}
      </div>
    </Modal>
  );
}
