/* Conventions — /repos/:repoId/conventions. Scan the repo for house rules, accept / reject / edit
   the candidates (each backed by evidence the server verified), then merge the accepted ones into
   one skill. Server contract: server/specs/L02-conventions.md. */
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Button, EmptyState, ErrorState, Skeleton } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { RepoNotFound } from "@/components/repo-not-found";
import { ApiError } from "@/lib/api";
import {
  useConventions,
  useConventionSkillDraft,
  useExtractConventions,
  useRejectConvention,
  useSetAllConventions,
  useUpdateConvention,
} from "@/lib/hooks";
import { useActiveRepo, useRepoNotFound } from "@/lib/repo-context";
import type { ConventionSkillDraft } from "@devdigest/shared";
import { NOT_READY_CODE, SKELETON_CARDS } from "./constants";
import { acceptedConventions } from "./helpers";
import { s } from "./styles";
import { ConventionCard } from "./_components/ConventionCard";
import { CreateSkillModal } from "./_components/CreateSkillModal";
import { SelectionBar } from "./_components/SelectionBar";

export default function ConventionsPage() {
  const t = useTranslations("conventions");
  const format = useFormatter();
  const { repoId } = useParams<{ repoId: string }>();
  const { activeRepo } = useActiveRepo();
  const repoNotFound = useRepoNotFound(repoId);

  const { data, isLoading, isError, error, refetch } = useConventions(repoId);
  const extract = useExtractConventions(repoId);
  const update = useUpdateConvention(repoId);
  const reject = useRejectConvention(repoId);
  const setAll = useSetAllConventions(repoId);
  const draftMut = useConventionSkillDraft(repoId);
  const [draft, setDraft] = React.useState<ConventionSkillDraft | null>(null);

  const repoName = activeRepo?.full_name ?? repoId;
  const shortName = activeRepo?.name ?? repoName;
  const crumb = [{ label: t("page.crumbLab") }, { label: t("page.crumbConventions") }];

  if (repoNotFound) {
    return (
      <AppShell crumb={crumb}>
        <RepoNotFound />
      </AppShell>
    );
  }

  const items = data?.items ?? [];
  const scan = data?.scan ?? null;
  const accepted = acceptedConventions(items);
  const scanning = extract.isPending;
  const notReady = extract.error instanceof ApiError && extract.error.code === NOT_READY_CODE;
  const onExtract = () => extract.mutate();

  const openModal = () =>
    draftMut.mutate(
      accepted.map((c) => c.id),
      { onSuccess: setDraft },
    );

  return (
    <AppShell crumb={crumb}>
      <div style={s.content}>
        <div style={s.pageHeader}>
          <div style={s.titleWrap}>
            <h1 style={s.pageTitle}>
              {t("page.headingPrefix")}
              <span className="mono" style={s.repoName}>
                {shortName}
              </span>
            </h1>
            <p style={s.pageSubtitle}>
              {scan
                ? t("page.subtitleScanned", {
                    count: scan.sample_count,
                    time: format.relativeTime(new Date(scan.created_at), new Date()),
                  })
                : t("page.subtitleNone")}
            </p>
            {scan && scan.dropped > 0 && <p style={s.note}>{t("page.droppedNote", { count: scan.dropped })}</p>}
          </div>
          {!isLoading && (
            <Button
              kind={scan ? "secondary" : "primary"}
              icon={scan ? "RefreshCw" : "Play"}
              loading={scanning}
              disabled={scanning}
              onClick={onExtract}
            >
              {scanning ? t("page.scanning") : scan ? t("page.rescan") : t("page.runScan")}
            </Button>
          )}
        </div>

        {extract.isError && (
          <div style={s.notice} role="alert">
            <div style={s.noticeTitle}>{notReady ? t("page.notReadyTitle") : t("page.extractError")}</div>
            {extract.error.message}
          </div>
        )}

        {isLoading ? (
          <div style={s.list}>
            {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
              <Skeleton key={i} height={150} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title={t("page.loadError")}
            body={error instanceof ApiError ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : !scan ? (
          <EmptyState
            icon="ListChecks"
            title={t("page.empty.title")}
            body={t("page.empty.body")}
            cta={t("page.empty.cta")}
            onCta={onExtract}
            ctaLoading={scanning}
          />
        ) : items.length === 0 ? (
          <EmptyState icon="ListChecks" title={t("page.noneFound.title")} body={t("page.noneFound.body")} />
        ) : (
          <>
            <SelectionBar
              accepted={accepted.length}
              total={items.length}
              busy={setAll.isPending}
              creating={draftMut.isPending}
              onToggleAll={() => setAll.mutate(accepted.length > 0 ? "pending" : "accepted")}
              onCreate={openModal}
            />
            <div style={s.list}>
              {items.map((c) => (
                <ConventionCard
                  key={c.id}
                  item={c}
                  onStatus={(status) => update.mutate({ id: c.id, patch: { status } })}
                  onReject={() => reject.mutate(c.id)}
                  onEditRule={(rule) => update.mutate({ id: c.id, patch: { rule } })}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {draft && (
        <CreateSkillModal
          repoId={repoId}
          repoName={shortName}
          draft={draft}
          conventionIds={accepted.map((c) => c.id)}
          onClose={() => setDraft(null)}
        />
      )}
    </AppShell>
  );
}
