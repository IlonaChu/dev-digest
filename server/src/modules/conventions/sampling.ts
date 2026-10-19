import {
  CONFIG_FILE_NAMES,
  CONFIG_FILE_PREFIXES,
  MAX_CONFIG_BYTES,
  MAX_PROMPT_CHARS,
  MAX_SAMPLE_BYTES,
  MAX_SAMPLE_LINES,
} from './constants.js';

/**
 * Code-only sample selection for the extractor — no model involved.
 * Config files come from the clone root; source files are the ranked paths the
 * repo-intel facade returns. Every read goes through the root-confined SourceTree.
 */
/**
 * What the sampler needs from a clone. Declared here (not imported from
 * repo-intel) because modules may not import each other; the container's
 * `SourceTree` satisfies it structurally.
 */
export interface CloneReader {
  list(dir: string): Promise<{ name: string; kind: string }[] | null>;
  read(root: string, relPath: string): Promise<string>;
}

export interface SampleFile {
  path: string;
  kind: 'config' | 'source';
  content: string;
  /** Number of lines in `content` (the model may cite 1..lineCount). */
  lineCount: number;
}

export function isConfigFile(name: string): boolean {
  if (CONFIG_FILE_NAMES.has(name)) return true;
  return CONFIG_FILE_PREFIXES.some((p) => name.startsWith(p));
}

/** Keep at most `maxLines` lines and `maxBytes` characters (on a line boundary). */
export function clipContent(text: string, maxLines: number, maxBytes: number): string {
  const lines = text.split('\n').slice(0, maxLines);
  const out: string[] = [];
  let size = 0;
  for (const line of lines) {
    size += line.length + 1;
    if (size > maxBytes && out.length > 0) break;
    out.push(line);
  }
  return out.join('\n');
}

async function tryRead(tree: CloneReader, root: string, rel: string): Promise<string | null> {
  try {
    return await tree.read(root, rel);
  } catch {
    return null;
  }
}

export async function collectSamples(
  tree: CloneReader,
  clonePath: string,
  sourcePaths: string[],
): Promise<SampleFile[]> {
  const out: SampleFile[] = [];
  let budget = MAX_PROMPT_CHARS;

  const add = (path: string, kind: SampleFile['kind'], raw: string, maxLines: number, maxBytes: number) => {
    const content = clipContent(raw, maxLines, Math.min(maxBytes, budget));
    if (!content.trim()) return;
    budget -= content.length;
    out.push({ path, kind, content, lineCount: content.split('\n').length });
  };

  const entries = (await tree.list(clonePath)) ?? [];
  const configs = entries
    .filter((e) => e.kind === 'file' && isConfigFile(e.name))
    .map((e) => e.name)
    .sort();
  for (const name of configs) {
    if (budget <= 0) break;
    const raw = await tryRead(tree, clonePath, name);
    if (raw !== null) add(name, 'config', raw, MAX_SAMPLE_LINES, MAX_CONFIG_BYTES);
  }

  for (const path of sourcePaths) {
    if (budget <= 0) break;
    if (out.some((f) => f.path === path)) continue;
    const raw = await tryRead(tree, clonePath, path);
    if (raw !== null) add(path, 'source', raw, MAX_SAMPLE_LINES, MAX_SAMPLE_BYTES);
  }
  return out;
}

/** Number each line (`  12| code`) so the model can cite exact lines. */
export function numberLines(content: string): string {
  return content
    .split('\n')
    .map((l, i) => `${String(i + 1).padStart(4)}| ${l}`)
    .join('\n');
}
