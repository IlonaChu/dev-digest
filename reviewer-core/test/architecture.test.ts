/**
 * Onion Architecture guard for the pure engine (skill:
 * .claude/skills/onion-architecture). The core — everything outside `src/llm/` —
 * imports only zod, @devdigest/shared and other core files. `src/llm/` is the one
 * adapter ring (structured output + OpenRouterProvider) and may add the `openai`
 * SDK. Nothing reads the environment or imports Node built-ins: all I/O is
 * resolved by the caller and the LLM arrives as an injected `LLMProvider`.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const CORE_PACKAGES = ['zod', '@devdigest/shared'];
const LLM_PACKAGES = [...CORE_PACKAGES, 'openai'];

const IMPORT_RE = /\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]/g;

interface SourceFile {
  path: string; // e.g. src/review/run.ts
  imports: string[];
  text: string;
}

function sourceFiles(): SourceFile[] {
  return readdirSync(join(ROOT, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.ts'))
    .map((f) => {
      const path = `src/${f.split(sep).join('/')}`;
      const text = readFileSync(join(ROOT, path), 'utf8');
      const imports = [...text.matchAll(IMPORT_RE)].map((m) => (m[1] ?? m[2])!);
      return { path, imports, text };
    });
}

const isRelative = (spec: string) => spec.startsWith('.');
const packageOf = (spec: string) =>
  spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]!;
const isBuiltin = (spec: string) => spec.startsWith('node:') || builtinModules.includes(packageOf(spec));
const isLlm = (path: string) => path.startsWith('src/llm/');

/** Repo-relative target of a relative import, e.g. `../llm/structured.js` from src/review/run.ts → src/llm/structured.js. */
const resolveRelative = (from: string, spec: string) => posix.join(dirname(from).split(sep).join('/'), spec);

describe('onion architecture — reviewer-core stays a pure core', () => {
  const files = sourceFiles();

  it('core files import only zod, @devdigest/shared and other core files', () => {
    const offenders = files
      .filter((f) => !isLlm(f.path) && f.path !== 'src/index.ts')
      .flatMap((f) =>
        f.imports
          .filter((spec) =>
            isRelative(spec) ? isLlm(resolveRelative(f.path, spec)) : !CORE_PACKAGES.includes(packageOf(spec)),
          )
          .map((spec) => `${f.path} → ${spec}`),
      );
    expect(offenders).toEqual([]);
  });

  it('src/llm/ adds only the openai SDK', () => {
    const offenders = files
      .filter((f) => isLlm(f.path))
      .flatMap((f) =>
        f.imports
          .filter((spec) => !isRelative(spec) && !LLM_PACKAGES.includes(packageOf(spec)))
          .map((spec) => `${f.path} → ${spec}`),
      );
    expect(offenders).toEqual([]);
  });

  it('no file imports Node built-ins or reads process.env', () => {
    const offenders = files
      .filter((f) => f.imports.some(isBuiltin) || /\bprocess\.env\b/.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});
