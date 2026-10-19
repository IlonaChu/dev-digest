import { SkillType } from '@devdigest/shared';
import type { SkillIgnoredFile } from '@devdigest/shared';
import { ValidationError } from '../../platform/errors.js';
import type { ArchiveEntry, ArchiveReader } from './ports.js';
import {
  ARCHIVE_NOISE,
  EXECUTABLE_DIRS,
  EXECUTABLE_EXTENSIONS,
  MAX_ARCHIVE_BYTES,
  MAX_ARCHIVE_ENTRIES,
  MAX_DESCRIPTION_LENGTH,
  MAX_SKILL_MD_BYTES,
  MAX_SKILL_NAME_LENGTH,
} from './constants.js';

/**
 * Turns an uploaded file (.md or .zip) into the CORE of a skill: name,
 * description, type and markdown body. Nothing is stored here.
 *
 * Archives are never extracted: entries are LISTED (central directory only) and
 * exactly one — the skill file — is read as text. Everything else is reported
 * in `ignored_files`, flagged `executable` when it looks runnable, and is never
 * opened or run.
 */
export interface ParsedSkillImport {
  name: string;
  description: string;
  type: SkillType;
  body: string;
  ignored_files: SkillIgnoredFile[];
}

export function parseSkillImport(
  filename: string,
  bytes: Uint8Array,
  archive: ArchiveReader,
): ParsedSkillImport {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.md')) return parseMarkdown(filename, bytes);
  if (lower.endsWith('.zip')) return parseZip(filename, bytes, archive);
  throw new ValidationError(`Unsupported file type: "${filename}". Only .md and .zip are supported.`);
}

// ---- markdown --------------------------------------------------------------

function parseMarkdown(filename: string, bytes: Uint8Array): ParsedSkillImport {
  if (bytes.byteLength > MAX_SKILL_MD_BYTES) {
    throw new ValidationError(`Skill file is too large (max ${MAX_SKILL_MD_BYTES} bytes)`);
  }
  return fromMarkdownText(decodeText(bytes), stem(filename), []);
}

function fromMarkdownText(
  raw: string,
  fallbackName: string,
  ignored: SkillIgnoredFile[],
): ParsedSkillImport {
  const { meta, body } = splitFrontmatter(raw);
  if (!body.trim()) throw new ValidationError('The skill file has no content');
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const type = SkillType.safeParse(meta.type);
  return {
    name: toSkillName(meta.name || heading || fallbackName),
    description: (meta.description ?? '').slice(0, MAX_DESCRIPTION_LENGTH),
    type: type.success ? type.data : 'custom',
    body: body.trim(),
    ignored_files: ignored,
  };
}

/** Optional leading `---` block of one-line `key: value` pairs. */
export function splitFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const text = raw.replace(/^﻿/, '');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { meta: {}, body: text };
  const meta: Record<string, string> = {};
  for (const line of (m[1] ?? '').split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+)\s*:\s*(.*)$/);
    if (kv?.[1]) meta[kv[1].toLowerCase()] = unquote((kv[2] ?? '').trim());
  }
  return { meta, body: text.slice(m[0].length) };
}

function unquote(v: string): string {
  return /^(['"]).*\1$/.test(v) ? v.slice(1, -1) : v;
}

// ---- zip -------------------------------------------------------------------

function parseZip(filename: string, bytes: Uint8Array, archive: ArchiveReader): ParsedSkillImport {
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) {
    throw new ValidationError(`Archive is too large (max ${MAX_ARCHIVE_BYTES} bytes)`);
  }
  let entries: ArchiveEntry[];
  try {
    entries = archive.listEntries(bytes);
  } catch {
    throw new ValidationError('The archive could not be read (is it a valid .zip?)');
  }
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new ValidationError(`Archive has too many entries (max ${MAX_ARCHIVE_ENTRIES})`);
  }

  const files = entries
    .filter((e) => !e.isDirectory)
    .map((e) => ({ ...e, path: e.path.replace(/^\.\//, '') }))
    .filter((e) => !ARCHIVE_NOISE.some((re) => re.test(e.path)));

  const chosen = pickSkillFile(files.map((f) => f.path));
  if (!chosen) throw new ValidationError('No SKILL.md (or single .md file) found in the archive');
  const chosenEntry = files.find((f) => f.path === chosen)!;
  if (chosenEntry.size > MAX_SKILL_MD_BYTES) {
    throw new ValidationError(`${chosen} is too large (max ${MAX_SKILL_MD_BYTES} bytes)`);
  }

  let raw: string;
  try {
    raw = archive.readText(bytes, chosenEntry.path, MAX_SKILL_MD_BYTES);
  } catch {
    throw new ValidationError(`${chosen} could not be read from the archive`);
  }
  assertText(raw);

  const ignored = files
    .filter((f) => f.path !== chosen)
    .map((f) => ({ path: f.path, executable: isExecutable(f.path) }));
  return fromMarkdownText(raw, stem(filename), ignored);
}

/** Root SKILL.md → the one top-level folder's SKILL.md → the only root .md. */
function pickSkillFile(paths: string[]): string | undefined {
  const isSkillMd = (p: string) => p.split('/').pop()!.toLowerCase() === 'skill.md';
  const root = paths.find((p) => !p.includes('/') && isSkillMd(p));
  if (root) return root;

  const tops = new Set(paths.map((p) => p.split('/')[0]));
  if (tops.size === 1) {
    const [dir] = [...tops];
    const nested = paths.find((p) => p.startsWith(`${dir}/`) && p.split('/').length === 2 && isSkillMd(p));
    if (nested) return nested;
  }

  const rootMd = paths.filter((p) => !p.includes('/') && p.toLowerCase().endsWith('.md'));
  return rootMd.length === 1 ? rootMd[0] : undefined;
}

export function isExecutable(path: string): boolean {
  const segments = path.split('/');
  const ext = segments[segments.length - 1]!.split('.').pop()?.toLowerCase() ?? '';
  return (
    EXECUTABLE_EXTENSIONS.has(ext) ||
    segments.slice(0, -1).some((s) => EXECUTABLE_DIRS.has(s.toLowerCase()))
  );
}

// ---- shared ----------------------------------------------------------------

function decodeText(bytes: Uint8Array): string {
  const text = new TextDecoder('utf-8').decode(bytes);
  assertText(text);
  return text;
}

function assertText(text: string): void {
  if (text.includes('\u0000')) throw new ValidationError('The skill file is not a text file');
}

function stem(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

/** kebab-case, [a-z0-9-], ≤64 chars — also the only form of name we inject. */
export function toSkillName(input: string): string {
  const kebab = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SKILL_NAME_LENGTH)
    .replace(/-+$/g, '');
  return kebab || 'imported-skill';
}
