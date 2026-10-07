import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import { GamePage } from "./GamePage";

const START = new Date("2026-10-08T00:00:00Z");

function setup() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<GamePage options={{ storage: null }} />);
  return user;
}

beforeEach(() => {
  // shouldAdvanceTime lets Testing Library's own setTimeout(0) waits resolve under fake timers.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GamePage", () => {
  it("opens with one Gather food button and a locked Look up button", () => {
    setup();
    expect(screen.getByRole("button", { name: "Gather food" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Look up" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByRole("heading", { name: "Jobs" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent("0");
  });

  it("counts clicks and offers the first job once there is enough food", async () => {
    const user = setup();
    for (let i = 0; i < 5; i++)
      await user.click(screen.getByRole("button", { name: "Gather food" }));
    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent("5");
    expect(screen.getByRole("heading", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hire Food Acquisition Associate/ })).toBeDisabled();
  });

  it("lets the player hire the first forager and then produces food by itself", async () => {
    const user = setup();
    for (let i = 0; i < 10; i++)
      await user.click(screen.getByRole("button", { name: "Gather food" }));
    const hire = screen.getByRole("button", { name: /Hire Food Acquisition Associate/ });
    expect(hire).toBeEnabled();
    await user.click(hire);

    const food = screen.getByRole("region", { name: "Food" });
    expect(food).toHaveTextContent("0");
    expect(food).toHaveTextContent("+0.4 per second");
    expect(screen.getByText(/hired\. They describe the role/)).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(30_000);
    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent(/^Food1[12]/);
  });
});
