import { createHash } from 'node:crypto';
import type {
  SkillImportFile,
  Skill,
  SkillImportPreview,
  SkillType,
  SkillVersion,
  SkillVetting,
} from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { AppError, ValidationError } from '../../platform/errors.js';
import { enableBlockReason, requiresVetting } from '../_shared/skill-policy.js';
import { FETCH_TIMEOUT_MS, INITIAL_SKILL_VERSION, MAX_ARCHIVE_BYTES, VETTING_CACHE_TTL_MS } from './constants.js';
import { isContentChange, toSkillDto, toSkillVersionDto } from './helpers.js';
import { parseSkillImport, toSkillName } from './import-parser.js';
import { filenameFromUrl, normalizeSkillUrl } from './import-url.js';
import type { FetchedFile } from './ports.js';
import type { SkillRow, SkillsRepository } from './repository.js';
import { vetContent, type VettingContent } from './vetting/vet.js';

export interface CreateSkillInput {
  name: string;
  description?: string;
  type?: SkillType;
  body: string;
  enabled?: boolean;
}

export interface UpdateSkillInput {
  name?: string;
  description?: string;
  type?: SkillType;
  body?: string;
  enabled?: boolean;
  version_message?: string;
}

export interface ImportOverrides {
  name?: string;
  description?: string;
  type?: SkillType;
  /** Set when the file came from `fetchImport` — the skill is stored as `imported_url`. */
  source_url?: string;
}

/**
 * Skills service. A skill is text only. Skills written in the product are the
 * author's own; imported ones (someone else's instructions inside our prompt)
 * are vetted and can be enabled only when `clean` for their current version.
 */
export class SkillsService {
  /** Preview vetting results, so confirming an import doesn't pay for the LLM twice. */
  private vetCache = new Map<string, { at: number; result: VettingContent }>();

  constructor(
    private container: Container,
    private now: () => number = Date.now,
  ) {}

  private get repo(): SkillsRepository {
    return this.container.skillsRepo;
  }

  async list(workspaceId: string): Promise<Skill[]> {
    const rows = await this.repo.list(workspaceId);
    return rows.map((r) => toSkillDto(r.row, r.agentCount));
  }

  async get(workspaceId: string, id: string): Promise<Skill | undefined> {
    const row = await this.repo.getById(workspaceId, id);
    return row ? toSkillDto(row, await this.repo.agentCount(id)) : undefined;
  }

  async create(workspaceId: string, input: CreateSkillInput): Promise<Skill> {
    const row = await this.repo.insert({
      workspaceId,
      name: input.name,
      description: input.description ?? '',
      type: input.type ?? 'custom',
      source: 'manual',
      body: input.body,
      enabled: input.enabled ?? true,
      vetting: null,
    });
    return toSkillDto(row, 0);
  }

  async update(workspaceId: string, id: string, patch: UpdateSkillInput): Promise<Skill | undefined> {
    const existing = await this.repo.getById(workspaceId, id);
    if (!existing) return undefined;

    const contentChanged = isContentChange(existing, patch);
    const vetted = requiresVetting(existing.source);

    // Enabling without a content change is gated by the CURRENT vetting result.
    if (patch.enabled === true && !existing.enabled && !(vetted && contentChanged)) {
      this.assertCanEnable(existing);
    }

    const row = await this.repo.update(workspaceId, id, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
      // For vetted skills with new content, `enabled` is decided after re-vetting.
      ...(patch.enabled !== undefined && !(vetted && contentChanged) ? { enabled: patch.enabled } : {}),
      ...(patch.version_message !== undefined ? { message: patch.version_message } : {}),
    });
    if (!row) return undefined;

    if (vetted && contentChanged) {
      return this.revet(workspaceId, row, patch.enabled ?? row.enabled);
    }
    return toSkillDto(row, await this.repo.agentCount(id));
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    return this.repo.deleteById(workspaceId, id);
  }

  async listVersions(workspaceId: string, id: string): Promise<SkillVersion[] | undefined> {
    const skill = await this.repo.getById(workspaceId, id);
    if (!skill) return undefined;
    return (await this.repo.listVersions(id)).map(toSkillVersionDto);
  }

  async restore(workspaceId: string, id: string, version: number): Promise<Skill | undefined> {
    const row = await this.repo.restore(workspaceId, id, version);
    if (!row) return undefined;
    if (requiresVetting(row.source)) return this.revet(workspaceId, row, row.enabled);
    return toSkillDto(row, await this.repo.agentCount(id));
  }

  /** Re-run the vetting check of an imported skill. */
  async vet(workspaceId: string, id: string): Promise<Skill | undefined> {
    const row = await this.repo.getById(workspaceId, id);
    if (!row) return undefined;
    if (!requiresVetting(row.source)) {
      throw new ValidationError('Only imported skills are vetted; skills written here are your own text');
    }
    return this.revet(workspaceId, row, row.enabled, { fresh: true });
  }

  /** Parse + vet an uploaded file. Stores NOTHING. */
  async previewImport(workspaceId: string, filename: string, base64: string): Promise<SkillImportPreview> {
    const parsed = this.parse(filename, base64);
    const result = await this.vetCached(workspaceId, parsed);
    return {
      ...parsed,
      vetting: this.stamp(result, INITIAL_SKILL_VERSION),
      name_taken: !!(await this.repo.findByName(workspaceId, parsed.name)),
    };
  }

  /**
   * Download a skill file from a public URL so the import flow can treat it like
   * an upload: the result is the `{filename, content_base64}` payload of
   * `previewImport` / `importSkill`. Stores NOTHING. A download that is not a
   * skill file at all (binary, no content) fails here, not on the preview.
   */
  async fetchImport(url: string): Promise<SkillImportFile> {
    const sourceUrl = normalizeSkillUrl(url);
    let fetched: FetchedFile;
    try {
      fetched = await this.container.urlFetcher.fetchBytes(sourceUrl, {
        maxBytes: MAX_ARCHIVE_BYTES,
        timeoutMs: FETCH_TIMEOUT_MS,
      });
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err);
      throw new AppError('skill_fetch_failed', `Could not fetch the skill file (${why})`, 422, {
        url: sourceUrl,
      });
    }
    if (fetched.bytes.byteLength === 0) throw new ValidationError('The fetched file is empty');
    const filename = filenameFromUrl(fetched.finalUrl || sourceUrl, fetched.contentType);
    parseSkillImport(filename, fetched.bytes, this.container.archive);
    return {
      filename,
      content_base64: Buffer.from(fetched.bytes).toString('base64'),
      source_url: sourceUrl,
    };
  }

  /**
   * Confirm an import. The server re-parses the file itself (the client only
   * supplies optional edits) and stores the skill DISABLED with its vetting.
   * A file that came through `fetchImport` is marked `imported_url`.
   */
  async importSkill(
    workspaceId: string,
    filename: string,
    base64: string,
    overrides: ImportOverrides = {},
  ): Promise<Skill> {
    const parsed = this.parse(filename, base64);
    const final = {
      name: overrides.name !== undefined ? toSkillName(overrides.name) : parsed.name,
      description: overrides.description ?? parsed.description,
      type: overrides.type ?? parsed.type,
      body: parsed.body,
    };
    if (await this.repo.findByName(workspaceId, final.name)) {
      throw new AppError('skill_name_taken', 'A skill with this name already exists', 409);
    }
    const result = await this.vetCached(workspaceId, final);
    const row = await this.repo.insert({
      workspaceId,
      name: final.name,
      description: final.description,
      type: final.type,
      source: overrides.source_url ? 'imported_url' : 'imported',
      body: final.body,
      enabled: false,
      vetting: this.stamp(result, INITIAL_SKILL_VERSION),
    });
    return toSkillDto(row, 0);
  }

  // ---- internals -----------------------------------------------------------

  private parse(filename: string, base64: string) {
    const bytes = Uint8Array.from(Buffer.from(base64, 'base64'));
    if (bytes.byteLength === 0) throw new ValidationError('The file is empty');
    if (bytes.byteLength > MAX_ARCHIVE_BYTES) {
      throw new ValidationError(`File is too large (max ${MAX_ARCHIVE_BYTES} bytes)`);
    }
    return parseSkillImport(filename, bytes, this.container.archive);
  }

  private assertCanEnable(skill: SkillRow): void {
    const reason = enableBlockReason(skill);
    if (reason) {
      throw new AppError(
        'skill_blocked',
        'This imported skill has not passed vetting and cannot be enabled',
        409,
        { reason },
      );
    }
  }

  /**
   * Vet the row's CURRENT content, stamp the result with its version and store
   * it. Not clean → force-disabled; clean → keeps the requested enabled state.
   */
  private async revet(
    workspaceId: string,
    row: SkillRow,
    wantEnabled: boolean,
    opts: { fresh?: boolean } = {},
  ): Promise<Skill> {
    const result = opts.fresh
      ? await vetContent(this.container, workspaceId, row)
      : await this.vetCached(workspaceId, row);
    const vetting = this.stamp(result, row.version);
    const enabled = vetting.status === 'clean' ? wantEnabled : false;
    const saved = (await this.repo.setVetting(workspaceId, row.id, vetting, { enabled })) ?? row;
    return toSkillDto(saved, await this.repo.agentCount(row.id));
  }

  private async vetCached(
    workspaceId: string,
    content: { description: string; body: string },
  ): Promise<VettingContent> {
    const key = `${workspaceId}:${createHash('sha256').update(content.description).update('\u0000').update(content.body).digest('hex')}`;
    const hit = this.vetCache.get(key);
    const now = this.now();
    if (hit && now - hit.at < VETTING_CACHE_TTL_MS) return hit.result;
    const result = await vetContent(this.container, workspaceId, content);
    // An `unverified` result is a transient LLM failure — never pin it in the cache.
    if (result.status !== 'unverified') {
      for (const [k, v] of this.vetCache) if (now - v.at >= VETTING_CACHE_TTL_MS) this.vetCache.delete(k);
      this.vetCache.set(key, { at: now, result });
    }
    return result;
  }

  private stamp(result: VettingContent, version: number): SkillVetting {
    return { ...result, version, checked_at: new Date(this.now()).toISOString() };
  }
}
