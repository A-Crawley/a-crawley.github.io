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

  it("lets the player hire the first forager, and shows what the villagers eat", async () => {
    const user = setup();
    for (let i = 0; i < 10; i++)
      await user.click(screen.getByRole("button", { name: "Gather food" }));
    const hire = screen.getByRole("button", { name: /Hire Food Acquisition Associate/ });
    expect(hire).toBeEnabled();
    await user.click(hire);

    const food = screen.getByRole("region", { name: "Food" });
    expect(food).toHaveTextContent("0");
    // One forager makes 0.4 a second; the village of three eats 0.3.
    expect(food).toHaveTextContent("+0.1 per second after villagers eat 0.3");
    expect(screen.getByText(/hired\. They describe the role/)).toBeInTheDocument();
  });

  it("produces food by itself once the village is fed", async () => {
    setupWith((s) => {
      s.owned.forager = 5;
      s.population = 5;
      s.owned.hut = 0;
    });
    await vi.advanceTimersByTimeAsync(10_000);
    // 5 foragers make 2 a second; five to seven villagers eat 0.5 to 0.7. Real time may leak in.
    const food = Number(
      screen.getByRole("region", { name: "Food" }).textContent?.match(/^Food(\d+)/)?.[1],
    );
    expect(food).toBeGreaterThanOrEqual(12);
    expect(food).toBeLessThanOrEqual(22);
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
      s.population = 10;
      s.owned.granary = 100;
      s.lastTickAt = Date.now() - 3 * 3600 * 1000;
    });
    const dialog = await screen.findByRole("dialog", { name: "Welcome back" });
    expect(dialog).toHaveTextContent("You were away for 3 hours.");
    expect(dialog).toHaveTextContent("Food+");
    await user.click(screen.getByRole("button", { name: "Back to work" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // 10 foragers at 0.4/s, doubled by the 10-owned milestone, less the 1/s that ten villagers eat,
    // for 3 hours at a quarter speed: (8 − 1) × 10,800 × 0.25.
    expect(dialog).toHaveTextContent("25% speed");
    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent("18.9K");
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

  it("shows the village panel once there is a job", () => {
    setupWith((s) => {
      s.owned.forager = 2;
      s.population = 5;
    });
    const panel = screen.getByRole("region", { name: "Village" });
    expect(panel).toHaveTextContent("Villagers5");
    expect(panel).toHaveTextContent("Without a job3");
    expect(panel).toHaveTextContent("Beds10");
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
    const panel = screen.getByRole("region", { name: "Village" });
    expect(panel).toHaveTextContent("Beds15");
    expect(panel).toHaveTextContent("Without a job0");
  });

  it("keeps housing out of sight while there is plenty of room", () => {
    setupWith((s) => {
      s.owned.forager = 2;
      s.food = 500;
    });
    expect(screen.queryByRole("heading", { name: "Housing" })).not.toBeInTheDocument();
  });

  it("says so in the village panel when the village goes hungry", () => {
    setupWith((s) => {
      s.owned.woodcutter = 3;
      s.population = 3;
      s.shortfallSeconds = 12;
    });
    expect(screen.getByRole("region", { name: "Village" })).toHaveTextContent("Hungry");
    expect(screen.getByText(/eating faster than it is fed/)).toBeInTheDocument();
  });
});

describe("GamePage storage", () => {
  it("offers a granary when food is piling up, and shows the ceiling on the counter", async () => {
    const user = setupWith((s) => {
      s.owned.forager = 1;
      s.food = 250;
      s.wood = 100;
    });
    expect(screen.getByRole("heading", { name: "Storage" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent("Store holds up to 300");
    await user.click(screen.getByRole("button", { name: /Build Granary/ }));
    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent("up to 800");
  });

  it("says so when the store is full", () => {
    setupWith((s) => {
      s.owned.forager = 1;
      s.food = 300;
    });
    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent("Store full (300)");
  });

  it("shows no storage until it matters", () => {
    setupWith((s) => {
      s.food = 20;
    });
    expect(screen.queryByRole("heading", { name: "Storage" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Food" })).not.toHaveTextContent("Store");
  });
});

describe("GamePage morale reasons", () => {
  it("says why morale is falling", () => {
    setupWith((s) => {
      s.owned.forager = 3;
      s.population = 10;
      s.food = 100;
    });
    expect(screen.getByRole("region", { name: "Morale" })).toHaveTextContent("Falling: Crowded");
  });
});

describe("GamePage workforce", () => {
  function setupIdle() {
    return setupWith((s) => {
      s.stage = 2;
      s.owned.forager = 10;
      s.owned.autoForager = 4;
      s.owned.hut = 1;
      s.population = 10;
      s.food = 600;
    });
  }

  it("offers redeploy, retrain and release once machines have taken jobs", () => {
    setupIdle();
    expect(screen.getByRole("region", { name: "Workforce transition" })).toHaveTextContent(
      "4 villagers are between opportunities",
    );
  });

  it("releasing someone removes them from the village and the idle count", async () => {
    const user = setupIdle();
    await user.click(screen.getByRole("button", { name: "Release" }));
    expect(screen.getByRole("region", { name: "Workforce transition" })).toHaveTextContent(
      "3 villagers are between opportunities",
    );
    expect(screen.getByText(/Some villagers have been released/)).toBeInTheDocument();
  });

  it("retraining spends food and counts an operator", async () => {
    const user = setupIdle();
    await user.click(screen.getByRole("button", { name: /Retrain as operator/ }));
    expect(screen.getByRole("region", { name: "Workforce transition" })).toHaveTextContent(
      "1 now run machines",
    );
  });

  it("shows nothing in stage 1", () => {
    setupWith((s) => {
      s.owned.forager = 3;
    });
    expect(screen.queryByRole("region", { name: "Workforce transition" })).not.toBeInTheDocument();
  });
});

describe("GamePage upgrades", () => {
  it("offers an upgrade once it applies and buying it spends the resource", async () => {
    const user = setupWith((s) => {
      s.owned.forager = 3;
      s.population = 10;
      s.food = 200;
    });
    expect(screen.getByRole("heading", { name: "Upgrades" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Buy Better baskets" }));
    expect(screen.queryByRole("button", { name: "Buy Better baskets" })).not.toBeInTheDocument();
    expect(screen.getByText(/Bought: Better baskets/)).toBeInTheDocument();
  });

  it("shows no upgrades at the start", () => {
    setupWith(() => {});
    expect(screen.queryByRole("heading", { name: "Upgrades" })).not.toBeInTheDocument();
  });
});

describe("GamePage developer tools", () => {
  function setupDev(dev: boolean) {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const state = createGameState(Date.now());
    state.owned.forager = 3;
    state.population = 10;
    render(<GamePage dev={dev} options={{ storage: null, initialState: state }} />);
    return user;
  }

  it("is not there for an ordinary player", () => {
    setupDev(false);
    expect(screen.queryByText("Developer tools")).not.toBeInTheDocument();
  });

  it("skips an hour of play in one press", async () => {
    const user = setupDev(true);
    await user.click(screen.getByText("Developer tools"));
    await user.click(screen.getByRole("button", { name: "Skip 1 hour" }));
    expect(screen.getByLabelText("Game readout")).toHaveTextContent(/Game time1 h/);
  });

  it("lets a bot play to the start of stage 2", async () => {
    const user = setupDev(true);
    await user.click(screen.getByText("Developer tools"));
    await user.click(screen.getByRole("button", { name: "Play To stage 2" }));
    expect(screen.getByLabelText("Game readout")).toHaveTextContent("Stage2");
  }, 60_000);
});

describe("GamePage layouts", () => {
  function setupLayout(layout: "phone" | "tablet" | "desktop") {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<GamePage options={{ storage: null }} layout={layout} />);
    return user;
  }

  it("lays out as a dashboard on a desktop: no tabs, everything in reach", () => {
    setupLayout("desktop");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gather food" })).toBeVisible();
    expect(screen.getByRole("log", { name: "Village log" })).toBeVisible();
  });

  it("shows the same parts on a tablet without tabs", () => {
    setupLayout("tablet");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("log", { name: "Village log" })).toBeVisible();
  });

  it("folds a phone into tabs, with Gather food always to hand", async () => {
    const user = setupLayout("phone");
    expect(screen.getByRole("tab", { name: "Build" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Gather food" })).toBeVisible();
    // The log lives on another tab, so it is out of sight until asked for.
    expect(screen.getByRole("log", { name: "Village log", hidden: true })).not.toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Log and more" }));
    expect(screen.getByRole("log", { name: "Village log" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Gather food" })).toBeVisible();
  });

  it("keeps the shop sections on a phone behind headings that open", async () => {
    const user = setupLayout("phone");
    for (let i = 0; i < 10; i++)
      await user.click(screen.getByRole("button", { name: "Gather food" }));
    const jobs = screen.getByRole("button", { name: /^Jobs/ });
    expect(jobs).toHaveTextContent("1 you can afford");
    expect(jobs).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Hire Food Acquisition Associate/ })).toBeEnabled();
  });

  it("keeps resources in the strip above the tabs on a phone", async () => {
    const user = setupLayout("phone");
    await user.click(screen.getByRole("button", { name: "Gather food" }));
    await user.click(screen.getByRole("tab", { name: "Log and more" }));
    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent("1");
  });
});
