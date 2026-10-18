/** Rough token estimate (chars / 4) — the same heuristic the server falls back to. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Number of editor lines (a trailing newline still shows an empty last line). */
export function lineCount(text: string): number {
  return text.split("\n").length;
}

const HEADING = /^#{1,6}\s/;
const FENCE = /^\s*(```|~~~)/;

/** One editor line and whether it is a Markdown heading (`# `…`###### `, outside code fences). */
export interface HighlightLine {
  text: string;
  heading: boolean;
}

export function highlightLines(text: string): HighlightLine[] {
  let inFence = false;
  return text.split("\n").map((line) => {
    if (FENCE.test(line)) {
      inFence = !inFence;
      return { text: line, heading: false };
    }
    return { text: line, heading: !inFence && HEADING.test(line) };
  });
}
