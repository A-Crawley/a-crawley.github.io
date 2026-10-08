import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AchievementToast } from "./AchievementToast";

describe("AchievementToast", () => {
  it("shows nothing without a title", () => {
    render(<AchievementToast title={null} onClose={() => {}} />);
    expect(screen.queryByText(/Achievement:/)).not.toBeInTheDocument();
  });

  it("announces the achievement", () => {
    render(<AchievementToast title="Headcount" onClose={() => {}} />);
    expect(screen.getByText("Achievement: Headcount")).toBeInTheDocument();
  });

  it("closes itself after a few seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const onClose = vi.fn();
      render(<AchievementToast title="Headcount" onClose={onClose} />);
      await vi.advanceTimersByTimeAsync(4500);
      expect(onClose).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not close when the player clicks elsewhere", async () => {
    const onClose = vi.fn();
    render(
      <div>
        <button>elsewhere</button>
        <AchievementToast title="Headcount" onClose={onClose} />
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
