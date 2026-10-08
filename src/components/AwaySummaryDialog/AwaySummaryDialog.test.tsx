import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AwaySummaryDialog } from "./AwaySummaryDialog";
import type { AwaySummary } from "../../game/offline.ts";

const base: AwaySummary = {
  awaySeconds: 2 * 3600 + 14 * 60,
  countedSeconds: 2 * 3600 + 14 * 60,
  capped: false,
  gained: { food: 3200, wood: 410, infra: 0 },
  policiesEnded: [],
  stageFrom: 1,
  stageTo: 1,
};

describe("AwaySummaryDialog", () => {
  it("renders nothing when there is no summary", () => {
    render(<AwaySummaryDialog summary={null} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says how long the player was away and what the village made", () => {
    render(<AwaySummaryDialog summary={base} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByText("You were away for 2 hours 14 minutes.")).toBeInTheDocument();
    const gains = screen.getByRole("list", { name: "Gained while away" });
    expect(gains).toHaveTextContent("Food+3.2K");
    expect(gains).toHaveTextContent("Wood+410");
    expect(gains).not.toHaveTextContent("Infrastructure");
  });

  it("is honest when nothing was made", () => {
    render(
      <AwaySummaryDialog
        summary={{ ...base, gained: { food: 0, wood: 0, infra: 0 } }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/produced nothing/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("says when the cap cut the time short", () => {
    render(
      <AwaySummaryDialog
        summary={{ ...base, awaySeconds: 30 * 3600, countedSeconds: 8 * 3600, capped: true }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("You were away for 1 day 6 hours.")).toBeInTheDocument();
    expect(screen.getByText("Only the first 8 hours counted.")).toBeInTheDocument();
  });

  it("says which policies ended, and mentions a stage change", () => {
    render(
      <AwaySummaryDialog
        summary={{
          ...base,
          policiesEnded: ["extendedShifts", "rationsOptimisation"],
          stageTo: 2,
        }}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByText(/Extended Shifts and Rations Optimisation both ended when you left/),
    ).toBeInTheDocument();
    expect(screen.getByText(/reached the next stage/)).toBeInTheDocument();
  });

  it("closes from the button, which has focus", async () => {
    const onClose = vi.fn();
    render(<AwaySummaryDialog summary={base} onClose={onClose} />);
    const button = screen.getByRole("button", { name: "Back to work" });
    await waitFor(() => expect(button).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape", async () => {
    const onClose = vi.fn();
    render(<AwaySummaryDialog summary={base} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
