import { render, screen, within } from "@testing-library/react";
import { EventLog } from "./EventLog";

describe("EventLog", () => {
  it("is a labelled log region", () => {
    render(<EventLog title="Village log" lines={[{ id: "a", text: "One." }]} />);
    expect(screen.getByRole("log", { name: "Village log" })).toBeInTheDocument();
  });

  it("lists the newest line first", () => {
    render(
      <EventLog
        title="Village log"
        lines={[
          { id: "a", text: "First." },
          { id: "b", text: "Second." },
        ]}
      />,
    );
    const items = within(screen.getByRole("log")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["Second.", "First."]);
  });

  it("renders an empty log without lines", () => {
    render(<EventLog title="Village log" lines={[]} />);
    expect(within(screen.getByRole("log")).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("keeps a real list inside the live region", () => {
    render(<EventLog title="Village log" lines={[{ id: "a", text: "One." }]} />);
    expect(within(screen.getByRole("log")).getByRole("list")).toBeInTheDocument();
  });
});

describe("EventLog height limit", () => {
  it("scrolls inside its own box, which the keyboard can reach", () => {
    render(<EventLog title="Village log" lines={[{ id: "a", text: "One." }]} maxHeight={200} />);
    const log = screen.getByRole("log", { name: "Village log" });
    expect(log).toHaveAttribute("tabindex", "0");
    expect(log).toHaveStyle({ maxHeight: "200px", overflowY: "auto" });
  });

  it("is not a tab stop when it does not scroll", () => {
    render(<EventLog title="Village log" lines={[{ id: "a", text: "One." }]} />);
    expect(screen.getByRole("log")).not.toHaveAttribute("tabindex");
  });
});
