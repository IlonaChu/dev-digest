/* ConventionCard — one candidate: rule (editable inline), verified evidence, confidence, and the
   Accept / Reject / Edit actions. Reject stores `rejected` and the card leaves the list; Accept toggles. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Textarea } from "@devdigest/ui";
import type { ConventionRecord, ConventionStatus } from "@devdigest/shared";
import { locationLabel } from "./helpers";
import { ConfidenceBar } from "./_components/ConfidenceBar";
import { EvidenceBlock } from "./_components/EvidenceBlock";
import { s } from "./styles";

export function ConventionCard({
  item,
  onStatus,
  onReject,
  onEditRule,
}: {
  item: ConventionRecord;
  onStatus: (status: ConventionStatus) => void;
  onReject: () => void;
  onEditRule: (rule: string) => void;
}) {
  const t = useTranslations("conventions");
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(item.rule);

  const startEdit = () => {
    setDraft(item.rule);
    setEditing(true);
  };
  const save = () => {
    const rule = draft.trim();
    if (rule && rule !== item.rule) onEditRule(rule);
    setEditing(false);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") setEditing(false);
    else if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim()) save();
  };

  const accepted = item.status === "accepted";

  return (
    <article style={s.card(item.status)} aria-label={item.rule}>
      <div style={s.main}>
        <div style={s.titleRow}>
          {editing ? (
            <div style={s.editWrap}>
              <Textarea
                value={draft}
                onChange={setDraft}
                onKeyDown={onKeyDown}
                rows={2}
                style={s.editArea}
                aria-label={t("card.editLabel")}
                autoFocus
              />
              <div style={s.editActions}>
                <Button kind="primary" size="sm" disabled={!draft.trim()} onClick={save}>
                  {t("card.save")}
                </Button>
                <Button kind="ghost" size="sm" onClick={() => setEditing(false)}>
                  {t("card.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <h3 style={s.rule}>
              {item.rule}
              {item.edited && <span style={s.editedTag}>{t("card.edited")}</span>}
            </h3>
          )}
        </div>
        <EvidenceBlock location={locationLabel(item)} snippet={item.evidence_snippet} />
        <ConfidenceBar value={item.confidence} />
      </div>
      <div style={s.actions}>
        <Button
          kind={accepted ? "primary" : "secondary"}
          icon="Check"
          full
          aria-pressed={accepted}
          onClick={() => onStatus(accepted ? "pending" : "accepted")}
        >
          {accepted ? t("card.accepted") : t("card.accept")}
        </Button>
        <Button kind="secondary" icon="X" full onClick={onReject}>
          {t("card.reject")}
        </Button>
        <Button kind="secondary" icon="Edit" full disabled={editing} onClick={startEdit}>
          {t("card.edit")}
        </Button>
      </div>
    </article>
  );
}
