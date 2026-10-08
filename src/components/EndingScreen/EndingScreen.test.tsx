import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { EndingScreen } from "./EndingScreen";
import type { EndingScreenProps } from "./EndingScreen";

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
