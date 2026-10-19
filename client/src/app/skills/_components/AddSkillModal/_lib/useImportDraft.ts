/* useImportDraft — one import (file or URL) from "bytes in hand" to "saved": the
   server preview, the editable name/description/type, the confirm checkbox and
   the save. The two import tabs only differ in HOW the bytes arrive. */
import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { SkillImportPreview, SkillType } from "@devdigest/shared";
import { useImportSkill, useImportSkillPreview, type SkillFilePayload } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { importDraftState } from "./helpers";

export function useImportDraft({ onDone }: { onDone: () => void }) {
  const t = useTranslations("skills");
  const router = useRouter();
  const toast = useToast();
  const previewMut = useImportSkillPreview();
  const importMut = useImportSkill();

  const [payload, setPayload] = React.useState<SkillFilePayload | null>(null);
  const [sourceUrl, setSourceUrl] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<SkillImportPreview | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<SkillType>("custom");
  const [confirmed, setConfirmed] = React.useState(false);

  const reset = () => {
    setPayload(null);
    setSourceUrl(null);
    setPreview(null);
    setConfirmed(false);
  };

  /** Hand over the bytes: the server parses + vets them (stores nothing) and the review opens. */
  const load = (next: SkillFilePayload, source_url?: string) => {
    reset();
    setPayload(next);
    setSourceUrl(source_url ?? null);
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

  const { nameBlocked, canSave, blocked } = importDraftState({ preview, hasPayload: !!payload, name, confirmed });

  const save = async () => {
    if (!payload || !preview) return;
    let skill;
    try {
      skill = await importMut.mutateAsync({
        ...payload,
        name: name.trim(),
        description,
        type,
        ...(sourceUrl ? { source_url: sourceUrl } : {}),
      });
    } catch {
      return; // the global mutation handler already toasted it; the review stays open
    }
    toast.success(t("import.savedToast", { name: skill.name }));
    onDone();
    router.push(`/skills/${skill.id}?tab=config`);
  };

  return {
    payload,
    sourceUrl,
    preview,
    previewPending: previewMut.isPending,
    previewError: previewMut.isError ? (previewMut.error instanceof Error ? previewMut.error.message : "") : null,
    name,
    setName,
    description,
    setDescription,
    type,
    setType,
    confirmed,
    setConfirmed,
    nameBlocked,
    blocked,
    canSave,
    save,
    saving: importMut.isPending,
    reset,
    load,
  };
}

export type ImportDraft = ReturnType<typeof useImportDraft>;
