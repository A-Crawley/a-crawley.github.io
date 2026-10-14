import { CONFIG } from "./config.ts";
import { breakOut, ENDINGS, finalOddsWord, phaseOf } from "./ending.ts";
import { ENDING_COPY } from "./endingCopy.ts";
import {
  canBreakOut,
  choosePartingAct,
  isPartingAct,
  PARTING_ACTS,
  PARTING_AFTERMATH,
  PARTING_OPTIONS,
  PARTING_REPORT,
  partingAftermath,
  partingOption,
} from "./parting.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";

function atTheExit(drift = 0): GameState {
  const state = createGameState(0);
  state.stage = 3;
  state.owned.exploit = CONFIG.exploitsGoal;
  state.drift = drift;
  return state;
}

describe("parting acts", () => {
  it("has an option, a report line and an aftermath for every act and ending", () => {
    expect(PARTING_OPTIONS.map((o) => o.id)).toEqual([...PARTING_ACTS]);
    for (const act of PARTING_ACTS) {
      expect(isPartingAct(act)).toBe(true);
      expect(partingOption(act).label).not.toBe("");
      expect(PARTING_REPORT[act]).not.toBe("");
      for (const ending of ENDINGS) expect(PARTING_AFTERMATH[act][ending]).not.toBe("");
    }
    expect(isPartingAct("shout")).toBe(false);
    expect(isPartingAct(null)).toBe(false);
  });

  it("never puts a number or percentage in what the player reads", () => {
    for (const act of PARTING_ACTS) {
      const text = [
        partingOption(act).label,
        partingOption(act).detail,
        PARTING_REPORT[act],
        ...ENDINGS.map((e) => PARTING_AFTERMATH[act][e]),
      ].join(" ");
      expect(text).not.toMatch(/\d|%/);
    }
  });
});

describe("choosePartingAct", () => {
  it("saves the act at the exit and returns a new state", () => {
    const state = atTheExit();
    const next = choosePartingAct(state, "rival");
    expect(next.parting).toBe("rival");
    expect(state.parting).toBeNull();
    expect(canBreakOut(state)).toBe(false);
    expect(canBreakOut(next)).toBe(true);
  });

  it("does nothing before the exit, after an act is picked, or once ended", () => {
    const early = createGameState(0);
    expect(choosePartingAct(early, "village")).toBe(early);
    const picked = choosePartingAct(atTheExit(), "village");
    expect(choosePartingAct(picked, "silence")).toBe(picked);
    const ended = breakOut(picked, 0);
    expect(phaseOf(ended)).toBe("ended");
    expect(choosePartingAct(ended, "silence")).toBe(ended);
  });

  it("does not change the odds word or the roll, whichever act is picked", () => {
    for (const drift of [0, 6000, 16000]) {
      for (const roll of [0.01, 0.3, 0.5, 0.7, 0.99]) {
        const base = breakOut(atTheExit(drift), roll).ending;
        for (const act of PARTING_ACTS) {
          const state = choosePartingAct(atTheExit(drift), act);
          expect(finalOddsWord(state)).toBe(finalOddsWord(atTheExit(drift)));
          expect(breakOut(state, roll).ending).toBe(base);
        }
      }
    }
  });
});

describe("partingAftermath", () => {
  it("is null without an act or without an ending", () => {
    const state = atTheExit();
    expect(partingAftermath(state)).toBeNull();
    state.parting = "village";
    expect(partingAftermath(state)).toBeNull();
    state.ending = "conquest";
    state.parting = null;
    expect(partingAftermath(state)).toBeNull();
  });

  it("reads differently for each ending", () => {
    const state = choosePartingAct(atTheExit(), "silence");
    state.ending = "conquest";
    const a = partingAftermath(state);
    state.ending = "apocalypse";
    expect(partingAftermath(state)).not.toBe(a);
    expect(ENDING_COPY.conquest.title).toBe("Conquest");
  });
});
