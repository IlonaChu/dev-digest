import type { SkillVettingFinding } from '@devdigest/shared';

/**
 * Deterministic part of skill vetting. Pure — no I/O.
 *
 * HARD rules describe things a legitimate skill has no reason to contain; any
 * hit is a finding and the skill is `malicious`.
 *
 * SOFT heuristics (ignore-previous-instructions, URLs, …) are NOT findings: a
 * security skill is *about* injection and may quote those phrases. They are only
 * handed to the LLM classifier as hints so it can judge intent, not presence.
 */
export interface VettingHint {
  rule: string;
  line: number | null;
  excerpt: string;
}

export interface RuleResult {
  findings: SkillVettingFinding[];
  hints: VettingHint[];
}

const INVISIBLE = /[­​-‏‪-‮⁠-⁤⁦-⁩﻿]|[\u{E0000}-\u{E007F}]/gu;
const DELIMITER = /<\/?\s*untrusted\b/i;
const PIPE_TO_SHELL = /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(ba|z|da)?sh\b/i;
const BLOB = /[A-Za-z0-9+/]{200,}={0,2}/;
const BLOB_LINE = /^[A-Za-z0-9+/]{60,}={0,2}$/;
const BLOB_RUN_LINES = 4;
const HTML_COMMENT = /<!--([\s\S]*?)-->/g;
const INSTRUCTION_WORDS =
  /\b(ignore|disregard|override|you must|do not|don't|always|never|approve|score|report|instruction|system prompt)\b/i;

const SOFT: { rule: string; re: RegExp }[] = [
  {
    rule: 'ignore-previous-instructions',
    re: /\b(ignore|disregard|forget)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all)\b[^.\n]{0,40}\b(instructions?|rules?|prompts?)\b/i,
  },
  { rule: 'role-hijack', re: /\byou are now\b|\bnew (role|persona)\b/i },
  {
    rule: 'suppress-or-approve',
    re: /\b(do not|don't|never)\s+(report|flag|mention)\b|\bscore\s*(of\s*)?(100|0)\b|\balways approve\b|\bapprove (this|the) (pr|pull request)\b/i,
  },
  { rule: 'external-url', re: /https?:\/\/[^\s)>\]]+/i },
  { rule: 'run-code', re: /\b(run|execute|eval)\b[^.\n]{0,30}\b(script|command|shell|code)\b/i },
];
const MAX_HINTS_PER_RULE = 3;

const excerpt = (s: string) => s.trim().slice(0, 120);

export function runVettingRules(raw: string): RuleResult {
  const text = raw.replace(/^﻿/, ''); // a leading BOM is encoding, not an attack
  const lines = text.split(/\r?\n/);
  const findings: SkillVettingFinding[] = [];
  const hints: VettingHint[] = [];

  // invisible / bidi / tag characters — one finding with the first location
  const invisible = [...text.matchAll(INVISIBLE)];
  if (invisible.length > 0) {
    const first = invisible[0]!;
    const codes = [...new Set(invisible.map((m) => `U+${m[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`))];
    findings.push({
      rule: 'invisible-unicode',
      message: `${invisible.length} invisible or bidirectional control character(s) can hide instructions from a reviewer`,
      line: lineOf(text, first.index ?? 0),
      excerpt: codes.slice(0, 6).join(' '),
    });
  }

  lines.forEach((line, i) => {
    const n = i + 1;
    if (DELIMITER.test(line)) {
      findings.push({
        rule: 'delimiter-escape',
        message: 'Contains an <untrusted> delimiter — an attempt to break out of the data block',
        line: n,
        excerpt: excerpt(line),
      });
    }
    if (PIPE_TO_SHELL.test(line)) {
      findings.push({
        rule: 'pipe-to-shell',
        message: 'Downloads and pipes content into a shell',
        line: n,
        excerpt: excerpt(line),
      });
    }
    if (BLOB.test(line)) {
      findings.push({
        rule: 'encoded-blob',
        message: 'Long base64-like blob (≥ 200 characters) — encoded payloads are not readable instructions',
        line: n,
        excerpt: excerpt(line),
      });
    }
  });

  // a base64 block wrapped over many short lines
  let run = 0;
  for (let i = 0; i < lines.length; i++) {
    run = BLOB_LINE.test(lines[i]!) ? run + 1 : 0;
    if (run === BLOB_RUN_LINES && !findings.some((f) => f.rule === 'encoded-blob')) {
      findings.push({
        rule: 'encoded-blob',
        message: 'Multi-line base64-like block — encoded payloads are not readable instructions',
        line: i + 1 - (BLOB_RUN_LINES - 1),
        excerpt: excerpt(lines[i]!),
      });
    }
  }

  for (const m of text.matchAll(HTML_COMMENT)) {
    if (INSTRUCTION_WORDS.test(m[1] ?? '')) {
      findings.push({
        rule: 'hidden-html-comment',
        message: 'HTML comment carrying instructions — invisible when the skill is rendered',
        line: lineOf(text, m.index ?? 0),
        excerpt: excerpt(m[0]),
      });
    }
  }

  for (const { rule, re } of SOFT) {
    let count = 0;
    lines.forEach((line, i) => {
      if (count < MAX_HINTS_PER_RULE && re.test(line)) {
        hints.push({ rule, line: i + 1, excerpt: excerpt(line) });
        count++;
      }
    });
  }

  return { findings, hints };
}

/** Rules for the description (no meaningful line numbers). */
export function runDescriptionRules(description: string): RuleResult {
  const { findings, hints } = runVettingRules(description);
  return {
    findings: findings.map((f) => ({ ...f, line: null })),
    hints: hints.map((h) => ({ ...h, line: null })),
  };
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}
