import { render, screen, within } from "@testing-library/react";
import { AchievementList } from "./AchievementList";

const items = [
  {
    id: "a",
    title: "Headcount",
    hint: "Hire your first villager.",
    flavour: "HR is thrilled.",
    earned: true,
  },
  {
    id: "b",
    title: "Synergy",
    hint: "Have 10 foragers.",
    flavour: "Output doubled.",
    earned: false,
  },
];

describe("AchievementList", () => {
  it("says how many are earned", () => {
    render(<AchievementList items={items} />);
    expect(screen.getByText("1 of 2 earned")).toBeInTheDocument();
  });

  it("shows an earned achievement's title and line", () => {
    render(<AchievementList items={items} />);
    expect(screen.getByText("Headcount")).toBeInTheDocument();
    expect(screen.getByText("HR is thrilled.")).toBeInTheDocument();
    expect(screen.getByText("(earned)")).toBeInTheDocument();
  });

  it("shows a locked one as a hint, without giving away its name", () => {
    render(<AchievementList items={items} />);
    const list = screen.getByRole("list", { name: "Achievements" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent("Locked");
    expect(rows[1]).toHaveTextContent("Have 10 foragers.");
    expect(screen.queryByText("Synergy")).not.toBeInTheDocument();
    expect(screen.queryByText("Output doubled.")).not.toBeInTheDocument();
  });

  it("copes with an empty list", () => {
    render(<AchievementList items={[]} />);
    expect(screen.getByText("0 of 0 earned")).toBeInTheDocument();
  });
});
