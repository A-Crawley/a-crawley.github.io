import { parseBody, parseEntry, parseInline } from "./parse.ts";

const valid = `---
title: A title
date: 2026-10-10
summary: One line.
---

First paragraph
on two lines.

- one
- **two** and \`three\`
`;

describe("parseInline", () => {
  it("splits bold and code from plain text", () => {
    expect(parseInline("a **b** c `d`")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " c " },
      { text: "d", code: true },
    ]);
  });

  it("leaves an unmatched marker as text and never produces markup", () => {
    expect(parseInline("2 ** 3 <b>x</b>")).toEqual([{ text: "2 ** 3 <b>x</b>" }]);
  });
});

describe("parseBody", () => {
  it("makes paragraphs and lists, joining wrapped lines", () => {
    const blocks = parseBody("one\ntwo\n\n- a\n- b");
    expect(blocks).toEqual([
      { type: "paragraph", spans: [{ text: "one two" }] },
      { type: "list", items: [[{ text: "a" }], [{ text: "b" }]] },
    ]);
  });
});

describe("parseEntry", () => {
  it("reads the header and body", () => {
    const entry = parseEntry("2026-10-10-x", valid);
    expect(entry).toMatchObject({
      id: "2026-10-10-x",
      title: "A title",
      date: "2026-10-10",
      summary: "One line.",
    });
    expect(typeof entry === "object" && entry.body).toHaveLength(2);
  });

  it("reports what is wrong instead of throwing", () => {
    expect(parseEntry("a", "no header")).toBe("a: missing header");
    expect(parseEntry("a", valid.replace("title: A title\n", ""))).toBe("a: missing title");
    expect(parseEntry("a", valid.replace("2026-10-10", "10 Oct"))).toBe("a: bad date");
    expect(parseEntry("a", valid.replace("2026-10-10", "2026-13-45"))).toBe("a: bad date");
    expect(parseEntry("a", valid.replace("summary: One line.\n", ""))).toBe("a: missing summary");
    expect(parseEntry("a", "---\ntitle: t\ndate: 2026-10-10\nsummary: s\n---\n")).toBe(
      "a: empty entry",
    );
  });
});
