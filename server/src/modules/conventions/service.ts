import type {
  ConventionList,
  ConventionRecord,
  ConventionSkillDraft,
  ConventionStatus,
  SkillType,
} from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { AppError, NotFoundError, ValidationError } from '../../platform/errors.js';
import { SAMPLE_FILE_COUNT } from './constants.js';
import { extractCandidates } from './extraction.js';
import { ruleKey, toConventionDto, toScanDto } from './helpers.js';
import type { ConventionsRepository, VerifiedCandidate } from './repository.js';
import { collectSamples } from './sampling.js';
import { buildSkillDraft, estimateTokens } from './skill-draft.js';
import { verifyEvidence } from './verify-evidence.js';

export interface CreateConventionSkillInput {
  name: string;
  description?: string;
  type?: SkillType;
  enabled?: boolean;
  body: string;
  convention_ids: string[];
}

/**
 * Conventions extractor: code picks the samples, ONE cheap-model call proposes
 * candidates, code verifies each one's evidence, the user decides, and the
 * accepted rules are merged into a single skill.
 */
export class ConventionsService {
  constructor(private container: Container) {}

  private get repo(): ConventionsRepository {
    return this.container.conventionsRepo;
  }

  private async requireRepo(workspaceId: string, repoId: string) {
    const repo = await this.container.reposRepo.findRecord(workspaceId, repoId);
    if (!repo) throw new NotFoundError('Repository not found');
    return repo;
  }

  async list(workspaceId: string, repoId: string): Promise<ConventionList> {
    await this.requireRepo(workspaceId, repoId);
    const [rows, scan] = await Promise.all([
      this.repo.listForRepo(workspaceId, repoId),
      this.repo.latestScan(workspaceId, repoId),
    ]);
    return { items: rows.map(toConventionDto), scan: scan ? toScanDto(scan) : null };
  }

  async extract(workspaceId: string, repoId: string): Promise<ConventionList> {
    const repo = await this.requireRepo(workspaceId, repoId);
    if (!repo.clonePath) {
      throw new AppError('repo_not_ready', 'The repository has not been cloned yet.', 409);
    }

    const paths = await this.container.repoIntel.getConventionSamples(repoId, SAMPLE_FILE_COUNT);
    const samples = await collectSamples(this.container.sourceTree, repo.clonePath, paths);
    if (!samples.some((s) => s.kind === 'source')) {
      throw new AppError(
        'repo_not_ready',
        'No indexed source files to analyse yet. Wait for the repository index to finish and try again.',
        409,
      );
    }

    let result;
    try {
      result = await extractCandidates(this.container, workspaceId, samples);
    } catch (err) {
      if (err instanceof AppError && err.statusCode < 500) throw err;
      const reason = err instanceof Error ? err.message : 'unknown error';
      throw new AppError(
        'extraction_failed',
        `Could not analyse the repository with the conventions model: ${reason}`,
        err instanceof AppError && err.code === 'config_error' ? 409 : 502,
      );
    }

    const verified: VerifiedCandidate[] = [];
    for (const c of result.candidates) {
      const verdict = verifyEvidence(c, samples);
      if (!verdict.ok) continue;
      verified.push({
        category: c.category,
        rule: c.rule.trim(),
        ruleKey: ruleKey(c.rule),
        evidencePath: c.evidence.path,
        evidenceStartLine: verdict.startLine,
        evidenceEndLine: verdict.endLine,
        evidenceSnippet: verdict.snippet,
        confidence: verdict.confidence,
      });
    }

    await this.repo.saveScan(
      workspaceId,
      repoId,
      {
        sampleCount: samples.length,
        found: result.candidates.length,
        dropped: result.candidates.length - verified.length,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costUsd: result.costUsd,
      },
      verified,
    );
    return this.list(workspaceId, repoId);
  }

  async patch(
    workspaceId: string,
    id: string,
    patch: { status?: ConventionStatus; rule?: string },
  ): Promise<ConventionRecord> {
    const row = await this.repo.patch(workspaceId, id, patch);
    if (!row) throw new NotFoundError('Convention not found');
    return toConventionDto(row);
  }

  async setAll(
    workspaceId: string,
    repoId: string,
    status: 'pending' | 'accepted',
  ): Promise<ConventionList> {
    await this.requireRepo(workspaceId, repoId);
    await this.repo.setStatusForUndecided(workspaceId, repoId, status);
    return this.list(workspaceId, repoId);
  }

  /** Only accepted rules of this repo may reach the skill; pending and rejected ones are refused. */
  private async pick(workspaceId: string, repoId: string, ids: string[]) {
    const unique = [...new Set(ids)];
    const rows = await this.repo.getMany(workspaceId, repoId, unique);
    if (rows.length !== unique.length) {
      throw new ValidationError('Some conventions do not belong to this repository');
    }
    if (rows.some((r) => r.status !== 'accepted')) {
      throw new ValidationError('Only accepted conventions can go into the skill');
    }
    return rows;
  }

  async draft(workspaceId: string, repoId: string, ids: string[]): Promise<ConventionSkillDraft> {
    const repo = await this.requireRepo(workspaceId, repoId);
    const rows = await this.pick(workspaceId, repoId, ids);
    const d = buildSkillDraft(repo.name, rows.map(toConventionDto));
    return { ...d, type: 'convention', token_estimate: estimateTokens(d.body) };
  }

  async createSkill(
    workspaceId: string,
    repoId: string,
    input: CreateConventionSkillInput,
  ): Promise<{ skill_id: string }> {
    await this.requireRepo(workspaceId, repoId);
    const rows = await this.pick(workspaceId, repoId, input.convention_ids);
    const skill = await this.container.skillsRepo.insert({
      workspaceId,
      name: input.name,
      description: input.description ?? '',
      type: input.type ?? 'convention',
      source: 'extracted',
      body: input.body,
      enabled: input.enabled ?? true,
      vetting: null,
      evidenceFiles: [...new Set(rows.map((r) => r.evidencePath))],
    });
    return { skill_id: skill.id };
  }
}
