import { CONFIG } from "./config.ts";
import { machineCount, powerDemand, powerFactor, ratesFor, step } from "./engine.ts";
import { logLines } from "./log.ts";
import { withSettled } from "./settle.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";

const START = 1_700_000_000_000;

/** A stage 2 village: 10 foragers and 10 woodcutters, with some machines. */
function machines(change: (s: GameState) => void = () => {}): GameState {
  const state = createGameState(START);
  state.stage = 2;
  state.owned.forager = 10;
  state.owned.woodcutter = 10;
  state.owned.granary = 50;
  state.owned.woodshed = 50;
  state.population = 30;
  state.owned.house = 2;
  change(state);
  return state;
}

describe("machine power", () => {
  it("is nothing without machines", () => {
    const state = machines();
    expect(machineCount(state.owned)).toBe(0);
    expect(powerDemand(state)).toBe(0);
    expect(powerFactor(state)).toBe(1);
  });

  it("burns wood for every machine of every kind", () => {
    const state = machines((s) => {
      s.owned.autoForager = 2;
      s.owned.sawmillBot = 3;
      s.owned.builderDrone = 1;
    });
    expect(powerDemand(state)).toBeCloseTo(6 * CONFIG.power.perMachine);
  });

  it("lowers the net wood rate by what the machines burn", () => {
    const base = machines();
    const withMachine = machines((s) => {
      s.owned.autoForager = 1;
      s.wood = 100;
    });
    const burn = CONFIG.power.perMachine;
    // The machine displaces nobody's wood job, so wood falls by exactly its burn.
    expect(ratesFor(withMachine, withMachine.owned, false).wood).toBeCloseTo(
      ratesFor(base, base.owned, false).wood - burn,
    );
  });

  it("burns nothing while the village rests", () => {
    const state = machines((s) => {
      s.owned.sawmillBot = 4;
      s.restUntil = 1e9;
    });
    expect(powerDemand(state)).toBe(0);
  });

  it("keeps machines at full speed while wood covers the burn", () => {
    const state = machines((s) => {
      s.owned.autoForager = 5;
      s.wood = 500;
    });
    expect(powerFactor(state)).toBe(1);
  });

  it("does not stall machines just because wood was spent down to nothing", () => {
    const state = machines((s) => {
      s.owned.autoForager = 5;
      s.wood = 0;
    });
    // Ten woodcutters make plenty to cover five machines this very second.
    expect(powerFactor(state)).toBe(1);
  });

  it("slows machines in proportion when the wood cannot cover them", () => {
    const state = machines((s) => {
      s.owned.woodcutter = 0;
      s.owned.autoForager = 200;
      s.owned.forager = 200;
      s.wood = 20;
    });
    const f = powerFactor(state);
    expect(f).toBeGreaterThan(CONFIG.power.minFactor - 1e-9);
    expect(f).toBeLessThan(1);
    // The shortage is shared: the machines make that share of what they would at full speed.
    const full = machines((s) => {
      s.owned.woodcutter = 0;
      s.owned.autoForager = 200;
      s.owned.forager = 200;
      s.wood = 1e9;
    });
    expect(ratesFor(state, state.owned, false).food).toBeLessThan(
      ratesFor(full, full.owned, false).food,
    );
  });

  it("never drops below the floor, so a shortage cannot starve the village", () => {
    const state = machines((s) => {
      s.owned.woodcutter = 0;
      s.owned.forager = 40;
      s.owned.autoForager = 40;
      s.wood = 0;
    });
    expect(powerFactor(state)).toBe(CONFIG.power.minFactor);
    expect(ratesFor(state, state.owned, false).food).toBeGreaterThan(0);
  });

  it("never lets the stock go below nothing", () => {
    const state = machines((s) => {
      s.owned.woodcutter = 0;
      s.owned.forager = 40;
      s.owned.autoForager = 40;
      s.wood = 3;
    });
    for (let i = 0; i < 20; i++) step(state, 1, false, false);
    expect(state.wood).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(state.wood)).toBe(true);
  });
});

describe("the log", () => {
  it("notes the first machine, once", () => {
    const state = withSettled(machines((s) => (s.owned.autoForager = 1)));
    expect(state.unlocked).toContain("power");
    const lines = logLines(state).filter((l) => l.id === "unlock:power");
    expect(lines).toHaveLength(1);
  });

  it("says so while power is short, and not otherwise", () => {
    const fine = withSettled(machines((s) => ((s.owned.autoForager = 1), (s.wood = 100))));
    expect(logLines(fine).some((l) => l.id === "power-short")).toBe(false);
    const short = withSettled(
      machines((s) => {
        s.owned.woodcutter = 0;
        s.owned.forager = 40;
        s.owned.autoForager = 40;
        s.wood = 0;
      }),
    );
    expect(logLines(short).some((l) => l.id === "power-short")).toBe(true);
  });
});
