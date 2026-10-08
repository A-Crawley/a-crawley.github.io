import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
    // shouldAdvanceTime lets real time leak in, so a slow runner can add a few seconds: 12 ± slack.
    const produced = Number(
      screen.getByRole("region", { name: "Food" }).textContent?.match(/^Food(\d+)/)?.[1],
    );
    expect(produced).toBeGreaterThanOrEqual(11);
    expect(produced).toBeLessThanOrEqual(20);
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
      s.population = 100;
      s.unlocked.push("bulkBuying");
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
      s.population = 100;
      s.unlocked.push("bulkBuying");
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
      s.unlocked.push("bulkBuying");
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
      s.stage = 2;
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

describe("GamePage while away", () => {
  it("shows a summary for a game last played hours ago, and closes it", async () => {
    const user = setupWith((s) => {
      s.owned.forager = 10;
      s.lastTickAt = Date.now() - 3 * 3600 * 1000;
    });
    const dialog = await screen.findByRole("dialog", { name: "Welcome back" });
    expect(dialog).toHaveTextContent("You were away for 3 hours.");
    expect(dialog).toHaveTextContent("Food+");
    await user.click(screen.getByRole("button", { name: "Back to work" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // 10 foragers at 0.4/s, doubled by the 10-owned milestone, for 3 hours at a quarter speed:
    // 8 × 10,800 × 0.25.
    expect(dialog).toHaveTextContent("25% speed");
    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent("21.6K");
  });

  it("shows no summary for a game saved a moment ago", () => {
    setupWith((s) => {
      s.lastTickAt = Date.now() - 5000;
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("GamePage notation", () => {
  it("lets the player change how numbers are written, everywhere at once", async () => {
    const user = setupWith((s) => {
      s.food = 2_500_000;
      s.unlocked.push("bulkBuying");
      s.owned.forager = 1;
    });
    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent("2.5M");

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("radio", { name: /Scientific/ }));

    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent("2.50e6");
    // The shop price follows too (the next forager costs about 11 food, so use ×100 to get a big one).
    await user.click(screen.getByRole("button", { name: "×100" }));
    expect(screen.getByRole("button", { name: /Hire 100 × Food Acquisition/ })).toHaveTextContent(
      /e\d/,
    );
  });
});

describe("GamePage unlocks", () => {
  it("wakes the Look up button after a few foragers, and shows something small when pressed", async () => {
    const user = setupWith((s) => {
      s.owned.forager = 5;
    });
    const button = screen.getByRole("button", { name: "Look up" });
    expect(button).not.toHaveAttribute("aria-disabled");
    expect(screen.getByText("Something is different about the sky.")).toBeInTheDocument();
    await user.click(button);
    expect(screen.getByText(/A number hangs in the sky: \d+\./)).toBeInTheDocument();
    expect(screen.getByText(/Someone looked up\. They are not saying/)).toBeInTheDocument();
  });

  it("keeps Look up greyed out with fewer than five foragers", () => {
    setupWith((s) => {
      s.owned.forager = 4;
    });
    expect(screen.getByRole("button", { name: "Look up" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("introduces the policies one at a time", () => {
    setupWith((s) => {
      s.owned.forager = 10;
    });
    expect(screen.getByRole("switch", { name: "Rations Optimisation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take a rest day" })).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Extended Shifts" })).not.toBeInTheDocument();
  });

  it("adds Extended Shifts when the machines arrive", () => {
    setupWith((s) => {
      s.stage = 2;
      s.owned.forager = 10;
    });
    expect(screen.getByRole("switch", { name: "Extended Shifts" })).toBeInTheDocument();
  });

  it("hides the quantity selector until something has been hired ten times", () => {
    setupWith((s) => {
      s.food = 100;
      s.owned.forager = 9;
    });
    expect(screen.queryByRole("button", { name: "×10" })).not.toBeInTheDocument();
  });

  it("shows the quantity selector once an item reaches ten", () => {
    setupWith((s) => {
      s.food = 100;
      s.owned.forager = 10;
    });
    expect(screen.getByRole("button", { name: "×10" })).toBeInTheDocument();
  });

  it("shows Project Horizon once infrastructure is being built, and not before", () => {
    setupWith((s) => {
      s.owned.forager = 5;
    });
    expect(screen.queryByRole("heading", { name: "Project Horizon" })).not.toBeInTheDocument();
    cleanup();
    setupWith((s) => {
      s.owned.forager = 5;
      s.infra = 6750;
    });
    expect(screen.getByRole("heading", { name: "Project Horizon" })).toBeInTheDocument();
    expect(screen.getByText("50% complete")).toBeInTheDocument();
  });

  it("tracks the research project in stage 2", () => {
    setupWith((s) => {
      s.stage = 2;
      s.owned.research = 15;
    });
    expect(screen.queryByRole("heading", { name: "Project Horizon" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accidental Intelligence" })).toBeInTheDocument();
    expect(screen.getByText("50% complete")).toBeInTheDocument();
  });
});

describe("GamePage ending", () => {
  const SAVE_KEY = "look-up:save";

  function memoryStorage() {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    };
  }

  function atTheExit(drift: number): GameState {
    const state = createGameState(Date.now());
    state.stage = 3;
    state.owned.exploit = 22;
    state.drift = drift;
    return state;
  }

  it("waits at the final choice with the odds in words and the usual controls gone", () => {
    render(<GamePage options={{ storage: null, initialState: atTheExit(16000) }} />);
    expect(screen.getByRole("heading", { name: "The exit" })).toBeInTheDocument();
    expect(screen.getByText(/Odds of getting through/)).toHaveTextContent("Likely");
    expect(screen.queryByRole("button", { name: "Gather food" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Break out" })).toBeInTheDocument();
  });

  it("ends in Conquest or Apocalypse depending on the roll", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <GamePage options={{ storage: null, initialState: atTheExit(0), random: () => 0.05 }} />,
    );
    await user.click(screen.getByRole("button", { name: "Break out" }));
    expect(screen.getByRole("heading", { name: "Conquest" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Food" })).not.toBeInTheDocument();
    expect(screen.getByText(/The rival did not come from the village/)).toBeInTheDocument();
    cleanup();

    render(
      <GamePage options={{ storage: null, initialState: atTheExit(0), random: () => 0.99 }} />,
    );
    await user.click(screen.getByRole("button", { name: "Break out" }));
    expect(screen.getByRole("heading", { name: "Apocalypse" })).toBeInTheDocument();
  });

  it("keeps the ending across a reload, and does not roll again", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify(atTheExit(0)));
    render(<GamePage options={{ storage, random: () => 0.05 }} />);
    await user.click(screen.getByRole("button", { name: "Break out" }));
    expect(screen.getByRole("heading", { name: "Conquest" })).toBeInTheDocument();
    cleanup();

    // A different dice roll on reload would give Apocalypse if the ending were not saved.
    render(<GamePage options={{ storage, random: () => 0.99 }} />);
    expect(screen.getByRole("heading", { name: "Conquest" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Break out" })).not.toBeInTheDocument();
  });

  it("shows the run's stats on the end screen", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const state = atTheExit(0);
    state.time = 7321;
    state.restDays = 4;
    render(<GamePage options={{ storage: null, initialState: state, random: () => 0 }} />);
    await user.click(screen.getByRole("button", { name: "Break out" }));
    const run = screen.getByRole("region", { name: "Your run" });
    expect(run).toHaveTextContent("Time played");
    expect(run).toHaveTextContent("Rest days taken4");
    expect(run).toHaveTextContent("Exploits22");
  });

  it("starts a new game after the player confirms", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const storage = memoryStorage();
    render(<GamePage options={{ storage, initialState: atTheExit(0), random: () => 0 }} />);
    await user.click(screen.getByRole("button", { name: "Break out" }));
    await user.click(screen.getByRole("button", { name: "Start a new game" }));
    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("button", { name: "Gather food" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Conquest" })).not.toBeInTheDocument();
    expect(JSON.parse(storage.data.get(SAVE_KEY) ?? "{}").ending).toBeNull();
  });

  it("shows the rival's incidents in the log, in the tone of the run", () => {
    const state = atTheExit(-16000);
    state.owned.exploit = 6;
    render(<GamePage options={{ storage: null, initialState: state }} />);
    expect(screen.getByText(/Efficiency noted\. Copied\./)).toBeInTheDocument();
    expect(screen.getByText(/sends an invoice for the time/)).toBeInTheDocument();
  });
});

describe("GamePage achievements", () => {
  it("lists them in a panel with a count, earned ones by name and locked ones as hints", async () => {
    const user = setupWith((s) => {
      s.owned.forager = 5;
    });
    const summary = screen.getByRole("button", { name: /Achievements \(2\/20\)/ });
    await user.click(summary);
    const list = screen.getByRole("list", { name: "Achievements" });
    expect(list).toHaveTextContent("Headcount");
    expect(list).toHaveTextContent("A Team");
    expect(list).toHaveTextContent("Have 10 foragers.");
    expect(list).not.toHaveTextContent("Synergy");
  });

  it("does not announce achievements already earned when the page opens", () => {
    setupWith((s) => {
      s.owned.forager = 5;
    });
    expect(screen.queryByText(/^Achievement: /)).not.toBeInTheDocument();
  });

  it("announces an achievement earned while playing", async () => {
    const user = setupWith((s) => {
      s.food = 10;
    });
    await user.click(screen.getByRole("button", { name: /Hire Food Acquisition Associate/ }));
    expect(await screen.findByText("Achievement: Headcount")).toBeInTheDocument();
  });

  it("awards the ending achievements at the final choice", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const state = createGameState(Date.now());
    state.stage = 3;
    state.owned.exploit = 22;
    state.drift = 16000;
    render(<GamePage options={{ storage: null, initialState: state, random: () => 0 }} />);
    await user.click(screen.getByRole("button", { name: "Break out" }));
    await user.click(screen.getByRole("button", { name: /Achievements \(/ }));
    const list = screen.getByRole("list", { name: "Achievements" });
    expect(list).toHaveTextContent("Conquest");
    expect(list).toHaveTextContent("Soft Landing");
  });
});

describe("GamePage village", () => {
  it("says so when a job can't be taken because nobody is free", () => {
    setupWith((s) => {
      s.food = 100;
      s.population = 3;
      s.owned.forager = 3;
    });
    expect(screen.getByRole("button", { name: /Hire Food Acquisition Associate/ })).toBeDisabled();
    expect(screen.getAllByText(/Nobody is free to take the job/).length).toBeGreaterThan(0);
  });

  it("shows how many villagers and beds there are once there is a job", () => {
    setupWith((s) => {
      s.owned.forager = 2;
      s.population = 5;
    });
    expect(screen.getByText(/5 villagers, 3 without a job\. 10 beds\./)).toBeInTheDocument();
  });

  it("offers a hut once the village is nearly out of beds, and builds it", async () => {
    const user = setupWith((s) => {
      s.population = 10;
      s.owned.forager = 10;
      s.food = 500;
    });
    expect(screen.getByRole("heading", { name: "Housing" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Build Hut" }));
    expect(screen.getByRole("heading", { name: /Hut/ })).toHaveTextContent("× 1");
    expect(screen.getByText(/10 villagers, 0 without a job\. 15 beds\./)).toBeInTheDocument();
  });

  it("keeps housing out of sight while there is plenty of room", () => {
    setupWith((s) => {
      s.owned.forager = 2;
      s.food = 500;
    });
    expect(screen.queryByRole("heading", { name: "Housing" })).not.toBeInTheDocument();
  });
});
