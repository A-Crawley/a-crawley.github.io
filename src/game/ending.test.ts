import { CONFIG } from "./config.ts";
import {
  breakOut,
  endingIsPossible,
  endStats,
  finalOddsWord,
  oddsWord,
  phaseOf,
  temperamentOf,
} from "./ending.ts";
import { conquestOdds } from "./engine.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";

function finished(drift = 0): GameState {
  const state = createGameState(0);
  state.stage = 3;
  state.owned.exploit = CONFIG.exploitsGoal;
  state.drift = drift;
  return state;
}

describe("phaseOf", () => {
  it("is playing until every exploit is in", () => {
    const state = createGameState(0);
    expect(phaseOf(state)).toBe("playing");
    state.stage = 3;
    state.owned.exploit = CONFIG.exploitsGoal - 1;
    expect(phaseOf(state)).toBe("playing");
  });

  it("waits at the final choice once every exploit is in", () => {
    expect(phaseOf(finished())).toBe("choice");
  });

  it("is ended once an ending is set", () => {
    const state = finished();
    state.ending = "conquest";
    expect(phaseOf(state)).toBe("ended");
  });
});

describe("oddsWord", () => {
  it("uses a word for each band and never a number", () => {
    const cases: Array<[number, string]> = [
      [0, "Unlikely"],
      [0.24, "Unlikely"],
      [0.25, "Risky"],
      [0.44, "Risky"],
      [0.45, "Even"],
      [0.59, "Even"],
      [0.6, "Promising"],
      [0.79, "Promising"],
      [0.8, "Likely"],
      [1, "Likely"],
    ];
    for (const [odds, word] of cases) expect(oddsWord(odds)).toBe(word);
  });

  it("follows the drift: a ruthless run is unlikely to win, a kind one likely", () => {
    expect(finalOddsWord(finished(-CONFIG.driftScale))).toBe("Unlikely");
    expect(finalOddsWord(finished(CONFIG.driftScale))).toBe("Likely");
  });
});

describe("breakOut", () => {
  it("is Conquest when the roll is under the odds, Apocalypse when it is not", () => {
    const state = finished(0);
    const odds = conquestOdds(0);
    expect(breakOut(state, odds - 0.001).ending).toBe("conquest");
    expect(breakOut(state, odds).ending).toBe("apocalypse");
    expect(breakOut(state, 0.999).ending).toBe("apocalypse");
    expect(breakOut(state, 0).ending).toBe("conquest");
  });

  it("gives a kind run better chances than a ruthless one for the same roll", () => {
    const roll = 0.5;
    expect(breakOut(finished(CONFIG.driftScale), roll).ending).toBe("conquest");
    expect(breakOut(finished(-CONFIG.driftScale), roll).ending).toBe("apocalypse");
  });

  it("does not change the state it is given", () => {
    const state = finished();
    breakOut(state, 0);
    expect(state.ending).toBeNull();
  });

  it("does nothing before the choice is ready", () => {
    const state = createGameState(0);
    expect(breakOut(state, 0)).toBe(state);
  });

  it("cannot be rolled twice", () => {
    const first = breakOut(finished(), 0);
    expect(first.ending).toBe("conquest");
    expect(breakOut(first, 0.99)).toBe(first);
  });
});

describe("temperamentOf", () => {
  it("mirrors the drift: gentle, wary or ruthless", () => {
    expect(temperamentOf(CONFIG.driftScale)).toBe("gentle");
    expect(temperamentOf(0)).toBe("wary");
    expect(temperamentOf(-CONFIG.driftScale)).toBe("ruthless");
  });
});

describe("endStats", () => {
  it("summarises the run", () => {
    const state = finished();
    state.time = 7321;
    state.owned.forager = 30;
    state.owned.woodcutter = 20;
    state.owned.builder = 10;
    state.owned.autoForager = 5;
    state.owned.sawmillBot = 4;
    state.owned.builderDrone = 3;
    state.owned.research = 30;
    state.restDays = 8;
    state.walkouts = 2;
    expect(endStats(state)).toEqual({
      seconds: 7321,
      villagers: 60,
      machines: 12,
      restDays: 8,
      walkouts: 2,
      researchLevels: 30,
      exploits: CONFIG.exploitsGoal,
    });
  });
});

describe("endingIsPossible", () => {
  it("is true only for a finished run", () => {
    expect(endingIsPossible(finished())).toBe(true);
    expect(endingIsPossible(createGameState(0))).toBe(false);
  });
});
