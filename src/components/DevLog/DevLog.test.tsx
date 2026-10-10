import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DevLog } from "./DevLog";
import type { DevLogEntry } from "../../devlog/parse.ts";

const entries: DevLogEntry[] = [
  {
    id: "2026-10-10-new",
    title: "Newest",
    date: "2026-10-10",
    summary: "The latest thing.",
    body: [
      { type: "paragraph", spans: [{ text: "Hello " }, { text: "bold", bold: true }] },
      { type: "list", items: [[{ text: "one" }], [{ text: "two", code: true }]] },
    ],
  },
  {
    id: "2026-10-07-old",
    title: "Oldest",
    date: "2026-10-07",
    summary: "The first thing.",
    body: [{ type: "paragraph", spans: [{ text: "Long ago." }] }],
  },
];

describe("DevLog", () => {
  it("lists entries newest first with a summary and a dated heading", () => {
    render(<DevLog entries={entries} />);
    const summaries = screen.getAllByText(/thing\./);
    expect(summaries).toHaveLength(2);
    expect(screen.getByText("Newest").compareDocumentPosition(screen.getByText("Oldest"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(document.querySelector('time[datetime="2026-10-10"]')).toBeInTheDocument();
  });

  it("opens the newest entry and keeps the others closed until asked", async () => {
    const user = userEvent.setup();
    render(<DevLog entries={entries} />);
    expect(screen.getByText("Hello")).toBeVisible();
    expect(screen.getByText("Long ago.")).not.toBeVisible();
    await user.click(screen.getByText("Oldest"));
    expect(screen.getByText("Long ago.")).toBeVisible();
  });

  it("renders bold, code and lists as elements, not as markup text", () => {
    render(<DevLog entries={entries} />);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("two").tagName).toBe("CODE");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("says so when there is nothing to show", () => {
    render(<DevLog entries={[]} />);
    expect(screen.getByText("Nothing has been written yet.")).toBeInTheDocument();
  });
});
