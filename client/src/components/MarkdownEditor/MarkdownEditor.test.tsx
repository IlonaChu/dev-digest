import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en/skills.json";
import { MarkdownEditor } from "./MarkdownEditor";
import { estimateTokens, highlightLines, lineCount } from "./helpers";

afterEach(cleanup);

function renderEditor(props: Partial<React.ComponentProps<typeof MarkdownEditor>> = {}) {
  const onChange = props.onChange ?? (() => {});
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      <MarkdownEditor value={"# Title\n\nbody"} onChange={onChange} fileName="pr-rubric" dirty={false} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("MarkdownEditor", () => {
  it("shows one line number per line of the text", () => {
    renderEditor({ value: "a\nb\nc\nd" });
    const gutter = screen.getByTestId("line-numbers");
    expect(within(gutter).getAllByText(/^\d+$/).map((n) => n.textContent)).toEqual(["1", "2", "3", "4"]);
  });

  it("shows the file name, the token estimate and no unsaved badge when clean", () => {
    renderEditor({ value: "12345678" });
    expect(screen.getByText("pr-rubric.md")).toBeInTheDocument();
    expect(screen.getByText("~2 tokens")).toBeInTheDocument();
    expect(screen.queryByText("unsaved")).not.toBeInTheDocument();
  });

  it("shows the unsaved badge when dirty", () => {
    renderEditor({ dirty: true });
    expect(screen.getByText("unsaved")).toBeInTheDocument();
  });

  it("reports edits and grows the gutter", () => {
    const changes: string[] = [];
    function Harness() {
      const [value, setValue] = React.useState("one");
      return (
        <MarkdownEditor
          value={value}
          onChange={(v) => {
            changes.push(v);
            setValue(v);
          }}
          fileName="pr-rubric"
          dirty={false}
        />
      );
    }
    render(
      <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
        <Harness />
      </NextIntlClientProvider>,
    );
    const numbers = () => within(screen.getByTestId("line-numbers")).getAllByText(/^\d+$/).map((n) => n.textContent);
    expect(numbers()).toEqual(["1"]);
    fireEvent.change(screen.getByLabelText("Skill body (Markdown)"), { target: { value: "one\ntwo" } });
    expect(changes).toEqual(["one\ntwo"]);
    expect(numbers()).toEqual(["1", "2"]);
  });

  it("falls back to skill.md when the name is empty", () => {
    renderEditor({ fileName: "" });
    expect(screen.getByText("skill.md")).toBeInTheDocument();
  });

  it("can be made read-only", () => {
    renderEditor({ readOnly: true });
    expect(screen.getByLabelText("Skill body (Markdown)")).toHaveAttribute("readonly");
  });
});

describe("heading highlight", () => {
  const headings = () =>
    within(screen.getByTestId("body-highlight"))
      .getAllByText(/./)
      .filter((n) => n.hasAttribute("data-heading"))
      .map((n) => n.textContent);

  it("marks Markdown headings in the mirror layer, not other lines", () => {
    renderEditor({ value: "# Title\ntext\n## Sub\n- item" });
    expect(headings()).toEqual(["# Title", "## Sub"]);
  });

  it("keeps the textarea the only labelled control", () => {
    renderEditor({ value: "# Title" });
    expect(screen.getAllByLabelText("Skill body (Markdown)")).toHaveLength(1);
    expect(screen.getByTestId("body-highlight")).toHaveAttribute("aria-hidden", "true");
  });

  it("follows the textarea scroll", () => {
    renderEditor({ value: "a\nb\nc" });
    const ta = screen.getByLabelText("Skill body (Markdown)");
    fireEvent.scroll(ta, { target: { scrollTop: 40, scrollLeft: 8 } });
    const layer = screen.getByTestId("body-highlight");
    expect(layer.scrollTop).toBe(40);
    expect(layer.scrollLeft).toBe(8);
  });
});

describe("highlightLines", () => {
  it("needs a space after the hashes and at most six of them", () => {
    expect(highlightLines("#nospace\n####### seven\n###### six").map((l) => l.heading)).toEqual([false, false, true]);
  });

  it("ignores # lines inside a code fence", () => {
    expect(highlightLines("```\n# comment\n```\n# real").map((l) => l.heading)).toEqual([false, false, false, true]);
  });
});

describe("helpers", () => {
  it("counts lines, including the empty one after a trailing newline", () => {
    expect(lineCount("")).toBe(1);
    expect(lineCount("a\nb\n")).toBe(3);
  });

  it("rounds the token estimate up", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcde")).toBe(2);
  });
});
