/* MarkdownEditor — a plain textarea with a line-number gutter that scrolls with it,
   a `<name>.md` title bar, an "unsaved" badge and a rough token count. Headings are
   coloured by a mirror layer painted behind the (transparent-text) textarea. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Icon } from "@devdigest/ui";
import { estimateTokens, highlightLines, lineCount } from "./helpers";
import { s } from "./styles";

export function MarkdownEditor({
  value,
  onChange,
  fileName,
  dirty,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Skill name — shown as `<name>.md`. */
  fileName: string;
  dirty: boolean;
  placeholder?: string;
}) {
  const t = useTranslations("skills");
  const gutterRef = React.useRef<HTMLDivElement>(null);
  const highlightRef = React.useRef<HTMLPreElement>(null);
  const lines = Array.from({ length: lineCount(value) }, (_, i) => i + 1);

  return (
    <div style={s.wrap}>
      <div style={s.head}>
        <Icon.FileText size={13} style={{ color: "var(--text-muted)" }} />
        <span className="mono" style={s.fileName}>
          {t("bodyEditor.fileName", { name: fileName || "skill" })}
        </span>
        {dirty && <Badge color="var(--warn)" bg="var(--warn-bg)">{t("bodyEditor.unsaved")}</Badge>}
        <span className="tnum" style={s.tokens}>
          {t("bodyEditor.tokens", { count: estimateTokens(value) })}
        </span>
      </div>
      <div style={s.body}>
        <div ref={gutterRef} className="mono" style={s.gutter} aria-hidden="true" data-testid="line-numbers">
          {lines.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
        <div style={s.editor}>
          <pre ref={highlightRef} className="mono" style={s.highlight} aria-hidden="true" data-testid="body-highlight">
            {highlightLines(value).map((l, i) => (
              <span key={i} data-heading={l.heading || undefined} style={l.heading ? { ...s.line, ...s.heading } : s.line}>
                {l.text || "\u200b"}
              </span>
            ))}
          </pre>
          <textarea
            className="mono dd-body-input"
            value={value}
            placeholder={placeholder}
            aria-label={t("bodyEditor.ariaLabel")}
            spellCheck={false}
            wrap="off"
            onChange={(e) => onChange(e.target.value)}
            onScroll={(e) => {
              const { scrollTop, scrollLeft } = e.currentTarget;
              if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
              if (highlightRef.current) {
                highlightRef.current.scrollTop = scrollTop;
                highlightRef.current.scrollLeft = scrollLeft;
              }
            }}
            style={s.textarea}
          />
        </div>
      </div>
    </div>
  );
}
