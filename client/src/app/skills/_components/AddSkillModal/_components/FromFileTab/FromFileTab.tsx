/* FromFileTab — upload a .md / .zip. The server parses + vets it (nothing is stored)
   and the user reviews the result before it is saved DISABLED. Archive contents
   other than the skill text are listed, never read or run. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@devdigest/ui";
import { useImportDraft } from "../../_lib/useImportDraft";
import { ImportReview } from "../ImportReview";
import { MAX_IMPORT_BYTES } from "./constants";
import { hasAcceptedExtension, readFileAsBase64 } from "./helpers";
import { s } from "./styles";

export function FromFileTab({ onDone }: { onDone: () => void }) {
  const t = useTranslations("skills");
  const draft = useImportDraft({ onDone });
  const [readError, setReadError] = React.useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReadError(null);
    if (!hasAcceptedExtension(file.name)) return setReadError(t("import.wrongType"));
    if (file.size > MAX_IMPORT_BYTES) return setReadError(t("import.tooLarge"));
    let content_base64: string;
    try {
      content_base64 = await readFileAsBase64(file);
    } catch {
      return setReadError(t("import.readError"));
    }
    draft.load({ filename: file.name, content_base64 });
  };

  if (draft.preview && draft.payload) {
    return (
      <ImportReview
        draft={draft}
        source={{ icon: "FileText", label: draft.payload.filename, resetLabel: t("import.chooseAnother") }}
      />
    );
  }

  return (
    <div style={s.wrap}>
      <p style={s.intro}>{t("import.intro")}</p>
      <label style={s.drop}>
        <Icon.Upload size={22} style={{ color: "var(--text-muted)" }} />
        <span style={s.dropTitle}>{draft.previewPending ? t("import.reading") : t("import.pick")}</span>
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
      {readError && <div style={s.error}>{readError}</div>}
      {draft.previewError !== null && (
        <div style={s.error}>
          {t("import.previewError")}: {draft.previewError}
        </div>
      )}
    </div>
  );
}
