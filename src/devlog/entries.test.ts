import { DEV_LOG, loadEntries } from "./entries.ts";

const entry = (title: string, date: string) =>
  `---\ntitle: ${title}\ndate: ${date}\nsummary: s\n---\nBody.`;

describe("loadEntries", () => {
  it("puts the newest first, and the later file first within a day", () => {
    const { entries } = loadEntries({
      "./entries/2026-10-07-a.md": entry("A", "2026-10-07"),
      "./entries/2026-10-08-b.md": entry("B", "2026-10-08"),
      "./entries/2026-10-08-c.md": entry("C", "2026-10-08"),
    });
    expect(entries.map((e) => e.title)).toEqual(["C", "B", "A"]);
  });

  it("collects broken entries as problems and keeps the rest", () => {
    const { entries, problems } = loadEntries({
      "./entries/bad.md": "nothing",
      "./entries/2026-10-07-a.md": entry("A", "2026-10-07"),
    });
    expect(entries).toHaveLength(1);
    expect(problems).toEqual(["bad: missing header"]);
  });
});

describe("the real dev log", () => {
  it("has entries, and every file parses", () => {
    expect(DEV_LOG.problems).toEqual([]);
    expect(DEV_LOG.entries.length).toBeGreaterThan(0);
  });

  it("has file names that start with the entry's date, so the order is obvious", () => {
    for (const e of DEV_LOG.entries) expect(e.id.startsWith(e.date)).toBe(true);
  });
});
