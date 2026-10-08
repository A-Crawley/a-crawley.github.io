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
