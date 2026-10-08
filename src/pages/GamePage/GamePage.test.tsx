import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import { createGameState } from "../../game/state.ts";
import type { GameState } from "../../game/state.ts";
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

  it("has a way back to the home page", () => {
    setup();
    expect(screen.getByRole("link", { name: "Back to a-crawley.com" })).toHaveAttribute(
      "href",
      "../",
    );
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

/** A game in progress, for tests that need to start past the opening. */
function setupWith(change: (state: GameState) => void) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const state = createGameState(Date.now());
  change(state);
  render(<GamePage options={{ storage: null, initialState: state }} />);
  return user;
}

describe("GamePage shop", () => {
  it("offers the woodcutter once there is enough food, and keeps it after the food is spent", async () => {
    const user = setupWith((s) => {
      s.food = 25;
      s.owned.forager = 1;
    });
    expect(screen.getByRole("button", { name: /Hire Timber Operations Lead/ })).toBeDisabled();
    // Spend the food on foragers; the woodcutter stays on the list.
    await user.click(screen.getByRole("button", { name: /Hire Food Acquisition Associate/ }));
    expect(screen.getByRole("button", { name: /Hire Timber Operations Lead/ })).toBeInTheDocument();
  });

  it("buys ten at once with ×10 and shows the price of ten", async () => {
    const user = setupWith((s) => {
      s.food = 1000;
    });
    await user.click(screen.getByRole("button", { name: "×10" }));
    const hire = screen.getByRole("button", { name: "Hire 10 × Food Acquisition Associate" });
    expect(hire).toBeEnabled();
    await user.click(hire);
    expect(screen.getByRole("heading", { name: /Food Acquisition Associate/ })).toHaveTextContent(
      "× 10",
    );
  });

  it("buys as many as it can with Max", async () => {
    const user = setupWith((s) => {
      s.food = 100;
    });
    await user.click(screen.getByRole("button", { name: "Max" }));
    await user.click(screen.getByRole("button", { name: "Hire 6 × Food Acquisition Associate" }));
    expect(screen.getByRole("heading", { name: /Food Acquisition Associate/ })).toHaveTextContent(
      "× 6",
    );
  });

  it("does not let a bulk purchase through that it can't pay for", async () => {
    const user = setupWith((s) => {
      s.food = 100;
    });
    await user.click(screen.getByRole("button", { name: "×100" }));
    expect(
      screen.getByRole("button", { name: "Hire 100 × Food Acquisition Associate" }),
    ).toBeDisabled();
  });

  it("shows the morale meter after the first hire, and policies after ten", () => {
    setupWith((s) => {
      s.owned.forager = 1;
    });
    expect(screen.getByRole("progressbar", { name: "Morale" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Policies" })).not.toBeInTheDocument();
  });

  it("lets the player switch policies and take a rest day once they are offered", async () => {
    const user = setupWith((s) => {
      s.owned.forager = 10;
    });
    expect(screen.getByRole("heading", { name: "Policies" })).toBeInTheDocument();
    const shifts = screen.getByRole("switch", { name: "Extended Shifts" });
    expect(shifts).not.toBeChecked();
    await user.click(shifts);
    expect(screen.getByRole("switch", { name: "Extended Shifts" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Take a rest day" }));
    expect(screen.getByRole("button", { name: "Take a rest day" })).toBeDisabled();
    expect(screen.getByText(/Rest day: nobody is producing/)).toBeInTheDocument();
  });

  it("shows machines and research in stage 2", () => {
    setupWith((s) => {
      s.stage = 2;
      s.food = 5000;
      s.owned.forager = 20;
    });
    expect(screen.getByRole("heading", { name: "Machines" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Build Automated forager/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Fund Research/ })).toBeEnabled();
  });
});
