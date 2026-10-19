/* FromUrlTab — paste a public link to a .md / .zip. The server downloads it
   (size- and time-capped, GitHub file pages as raw) and from there the flow is
   the file import: preview, safety check, review, saved DISABLED. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, FormField, TextInput } from "@devdigest/ui";
import { useFetchSkillFromUrl } from "@/lib/hooks/skills";
import { useImportDraft } from "../../_lib/useImportDraft";
import { ImportReview } from "../ImportReview";
import { s } from "./styles";

export function FromUrlTab({ onDone }: { onDone: () => void }) {
  const t = useTranslations("skills");
  const draft = useImportDraft({ onDone });
  const fetchMut = useFetchSkillFromUrl();
  const [url, setUrl] = React.useState("");
  const busy = fetchMut.isPending || draft.previewPending;
  const canFetch = url.trim() !== "" && !busy;

  const run = () =>
    fetchMut.mutate(url.trim(), {
      onSuccess: (file) => draft.load({ filename: file.filename, content_base64: file.content_base64 }, file.source_url),
    });

  if (draft.preview && draft.sourceUrl) {
    return (
      <ImportReview draft={draft} source={{ icon: "Link", label: draft.sourceUrl, resetLabel: t("add.anotherUrl") }} />
    );
  }

  return (
    <form
      style={s.wrap}
      onSubmit={(e) => {
        e.preventDefault();
        if (canFetch) run();
      }}
    >
      <FormField label={t("add.url")} hint={t("add.urlHint")}>
        <TextInput
          value={url}
          onChange={setUrl}
          placeholder={t("add.urlPlaceholder")}
          type="url"
          mono
          aria-label={t("add.url")}
        />
      </FormField>
      {fetchMut.isError && (
        <div style={s.error}>
          {t("add.fetchError")}: {fetchMut.error instanceof Error ? fetchMut.error.message : ""}
        </div>
      )}
      {draft.previewError !== null && (
        <div style={s.error}>
          {t("import.previewError")}: {draft.previewError}
        </div>
      )}
      <Button kind="primary" size="lg" full icon="Link" type="submit" disabled={!canFetch} loading={busy}>
        {busy ? t("add.fetching") : t("add.fetch")}
      </Button>
    </form>
  );
}
