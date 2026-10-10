import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { EndingScreen } from "./EndingScreen";
import type { EndingReport, EndingScreenProps } from "./EndingScreen";

const noReport: EndingReport = {
  events: [],
  unseenEvents: 0,
  unseenAchievements: 0,
  hint: null,
};

function setup(props: Partial<EndingScreenProps> = {}) {
  const onNewGame = vi.fn();
  render(
    <EndingScreen
      title="Conquest"
      paragraphs={["The rival gives way."]}
      reveal={["You made it."]}
      verdict="You rested the village."
      stats={[
        { label: "Time played", value: "2h 1m" },
        { label: "Walkouts", value: "3" },
      ]}
      report={noReport}
      onNewGame={onNewGame}
      {...props}
    />,
  );
  return onNewGame;
}

describe("EndingScreen", () => {
  it("tells the ending, the reveal and the verdict", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Conquest" })).toBeInTheDocument();
    expect(screen.getByText("The rival gives way.")).toBeInTheDocument();
    expect(screen.getByText("You made it.")).toBeInTheDocument();
    expect(screen.getByText("You rested the village.")).toBeInTheDocument();
  });

  it("lists the run's stats", () => {
    setup();
    const run = screen.getByRole("region", { name: "Your run" });
    expect(within(run).getByText("Time played")).toBeInTheDocument();
    expect(within(run).getByText("2h 1m")).toBeInTheDocument();
    expect(within(run).getByText("3")).toBeInTheDocument();
  });

  it("asks before starting a new game, and can be cancelled", async () => {
    const onNewGame = setup();
    await userEvent.click(screen.getByRole("button", { name: "Start a new game" }));
    expect(screen.getByRole("dialog", { name: "Start a new game?" })).toBeInTheDocument();
    expect(onNewGame).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Keep this ending" }));
    expect(onNewGame).not.toHaveBeenCalled();
  });

  it("starts a new game once the player confirms", async () => {
    const onNewGame = setup();
    await userEvent.click(screen.getByRole("button", { name: "Start a new game" }));
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });
});

describe("EndingScreen: the run report", () => {
  const report: EndingReport = {
    events: [
      { title: "A lean week", choice: "Share what is left", auto: false },
      { title: "A hard frost", choice: "Send everyone back to work", auto: true },
    ],
    unseenEvents: 6,
    unseenAchievements: 1,
    hint: "There is another way this ends.",
  };

  it("lists each event with the choice made, and marks the ones decided for the player", () => {
    setup({ report });
    const section = screen.getByRole("region", { name: "What you decided" });
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("A lean week: Share what is left");
    expect(items[0]).not.toHaveTextContent("nobody answered");
    expect(items[1]).toHaveTextContent("A hard frost: Send everyone back to work");
    expect(items[1]).toHaveTextContent("nobody answered, so it was decided for you");
  });

  it("counts what was not seen, with the right plurals, and shows the hint", () => {
    setup({ report });
    expect(
      screen.getByText("Not seen this run: 6 village events and 1 achievement."),
    ).toBeInTheDocument();
    expect(screen.getByText("There is another way this ends.")).toBeInTheDocument();
  });

  it("says so when no events came up, and omits the missed line when nothing was missed", () => {
    setup({ report: noReport });
    expect(screen.getByText("No village events came up in this run.")).toBeInTheDocument();
    expect(screen.queryByText(/Not seen this run/)).not.toBeInTheDocument();
  });

  it("has a heading for the report", () => {
    setup({ report });
    expect(screen.getByRole("heading", { name: "What you decided" })).toBeInTheDocument();
  });

  it("still asks before starting a new game", async () => {
    const onNewGame = setup({ report });
    await userEvent.click(screen.getByRole("button", { name: "Start a new game" }));
    expect(onNewGame).not.toHaveBeenCalled();
    expect(screen.getByText("Start a new game?")).toBeInTheDocument();
  });
});
