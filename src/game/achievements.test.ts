import { buyItem, gatherFood, lookUp } from "./actions.ts";
import {
  ACHIEVEMENTS,
  applyAchievements,
  hasAchievement,
  isAchievementId,
  pendingAchievements,
} from "./achievements.ts";
import type { AchievementId } from "./achievements.ts";
import { CONFIG } from "./config.ts";
import { breakOut, phaseOf } from "./ending.ts";
import { catchUp } from "./offline.ts";
import { settle, withSettled } from "./settle.ts";
import { chooseTarget, STRATEGIES } from "./sim/player.ts";
import { canAfford } from "./engine.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { tick } from "./tick.ts";

const fresh = () => createGameState(0);

function earnedAfter(change: (state: GameState) => void): AchievementId[] {
  const state = fresh();
  change(state);
  settle(state);
  return state.achievements;
}

describe("the achievement list", () => {
  it("has a unique id, a title, a hint and a line for each", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.title).not.toBe("");
      expect(a.hint).not.toBe("");
      expect(a.flavour).not.toBe("");
    }
  });

  it("recognises its own ids only", () => {
    expect(isAchievementId("first-hire")).toBe(true);
    expect(isAchievementId("nope")).toBe(false);
    expect(isAchievementId(3)).toBe(false);
  });
});

describe("thresholds", () => {
  it("awards nothing to a new game", () => {
    expect(earnedAfter(() => {})).toEqual([]);
  });

  it("awards hiring milestones", () => {
    expect(earnedAfter((s) => (s.owned.woodcutter = 1))).toEqual(["first-hire"]);
    expect(earnedAfter((s) => (s.owned.forager = 4))).not.toContain("five-foragers");
    expect(earnedAfter((s) => (s.owned.forager = 5))).toContain("five-foragers");
    expect(earnedAfter((s) => (s.owned.forager = 10))).toContain("ten-foragers");
    expect(
      earnedAfter((s) => {
        s.owned.forager = 20;
        s.owned.woodcutter = 20;
        s.owned.builder = 10;
      }),
    ).toContain("fifty-villagers");
    expect(earnedAfter((s) => (s.owned.forager = 49))).not.toContain("fifty-villagers");
  });

  it("awards rest day and walkout milestones", () => {
    expect(earnedAfter((s) => (s.restDays = 1))).toContain("first-rest");
    expect(earnedAfter((s) => (s.restDays = 9))).not.toContain("ten-rests");
    expect(earnedAfter((s) => (s.restDays = 10))).toContain("ten-rests");
    expect(earnedAfter((s) => (s.walkouts = 1))).toContain("first-walkout");
    expect(earnedAfter((s) => (s.walkouts = 4))).not.toContain("five-walkouts");
    expect(earnedAfter((s) => (s.walkouts = 5))).toContain("five-walkouts");
  });

  it("awards machine milestones across all three kinds", () => {
    expect(earnedAfter((s) => (s.owned.sawmillBot = 1))).toContain("first-machine");
    expect(
      earnedAfter((s) => {
        s.owned.autoForager = 4;
        s.owned.sawmillBot = 3;
        s.owned.builderDrone = 3;
      }),
    ).toContain("ten-machines");
  });

  it("awards stage and progress milestones", () => {
    expect(earnedAfter((s) => (s.stage = 2))).toContain("stage-two");
    expect(earnedAfter((s) => (s.stage = 3))).toEqual(
      expect.arrayContaining(["stage-two", "stage-three"]),
    );
    expect(earnedAfter((s) => (s.infra = CONFIG.infraGate * 0.5))).toContain("horizon-half");
    expect(
      earnedAfter((s) => {
        s.stage = 2;
        s.owned.research = CONFIG.researchLevels / 2;
      }),
    ).toContain("research-half");
    expect(
      earnedAfter((s) => {
        s.stage = 3;
        s.owned.exploit = CONFIG.exploitsGoal;
      }),
    ).toContain("all-exploits");
  });

  it("awards Look Up from the unlock it depends on, in the same pass", () => {
    const state = fresh();
    state.unlocked.push("lookedUp");
    settle(state);
    expect(state.achievements).toContain("look-up");
  });
});

describe("endings", () => {
  function finished(drift: number): GameState {
    const state = fresh();
    state.stage = 3;
    state.owned.exploit = CONFIG.exploitsGoal;
    state.drift = drift;
    return state;
  }

  it("awards the ending reached, and a kind or ruthless finish", () => {
    const kind = withSettled(breakOut(finished(CONFIG.driftScale), 0));
    expect(kind.achievements).toEqual(expect.arrayContaining(["conquest", "soft-landing"]));
    expect(kind.achievements).not.toContain("apocalypse");
    expect(kind.achievements).not.toContain("lean-operation");

    const cruel = withSettled(breakOut(finished(-CONFIG.driftScale), 0.99));
    expect(cruel.achievements).toEqual(expect.arrayContaining(["apocalypse", "lean-operation"]));
    expect(cruel.achievements).not.toContain("conquest");
  });

  it("gives neither tone achievement to a balanced finish", () => {
    const even = withSettled(breakOut(finished(0), 0));
    expect(even.achievements).not.toContain("soft-landing");
    expect(even.achievements).not.toContain("lean-operation");
  });

  it("awards no ending achievement before the choice is made", () => {
    const state = withSettled(finished(0));
    expect(state.achievements).toEqual(expect.arrayContaining(["all-exploits"]));
    expect(state.achievements).not.toContain("conquest");
  });
});

describe("applyAchievements", () => {
  it("returns what was awarded just now, once", () => {
    const state = fresh();
    state.owned.forager = 5;
    const first = applyAchievements(state);
    expect(first).toEqual(["first-hire", "five-foragers"]);
    expect(applyAchievements(state)).toEqual([]);
  });

  it("never takes one back", () => {
    const state = fresh();
    state.owned.forager = 5;
    settle(state);
    state.owned.forager = 0;
    expect(applyAchievements(state)).toEqual([]);
    expect(hasAchievement(state, "five-foragers")).toBe(true);
  });

  it("settling a state with nothing due returns the same object", () => {
    const state = withSettled(fresh());
    expect(withSettled(state)).toBe(state);
    expect(pendingAchievements(state)).toEqual([]);
  });
});

describe("during play", () => {
  it("awards them from actions and from time passing", () => {
    let state = fresh();
    state.food = 10;
    state = buyItem(state, "forager");
    expect(state.achievements).toContain("first-hire");
    state.owned.forager = 5;
    state = lookUp(withSettled(state));
    expect(state.achievements).toContain("look-up");
    state = gatherFood(state);
    const later = tick(state, 5000);
    expect(later.achievements).toEqual(expect.arrayContaining(["first-hire", "look-up"]));
  });

  it("awards what a long gap away earned, and says so in the summary", () => {
    const state = fresh();
    state.owned.forager = 12;
    state.owned.builder = 20;
    // Close to the end of stage 1, so the time away carries the village into stage 2.
    state.infra = CONFIG.infraGate - 10;
    const before = withSettled(state);
    expect(before.achievements).not.toContain("stage-two");

    const { state: after, away } = catchUp(before, 3 * 60 * 60 * 1000);
    expect(after.stage).toBe(2);
    expect(after.achievements).toContain("stage-two");
    // The summary lists only what the gap earned, not what the player already had.
    expect(away!.achievementsEarned).toContain("stage-two");
    expect(away!.achievementsEarned).not.toContain("horizon-half");
    expect(away!.achievementsEarned).not.toContain("first-hire");
  });

  it("awards through the stages when a greedy player plays them out", () => {
    const strategy = STRATEGIES.find((s) => s.name === "balanced")!;
    let now = 1_700_000_000_000;
    let state = createGameState(now);
    while (state.stage < 3 && state.time < CONFIG.maxSeconds) {
      strategy.decide(state);
      now += 1000;
      state = tick(state, now);
      for (let i = 0; i < CONFIG.clicksPerSecond; i++) state = gatherFood(state);
      for (;;) {
        const target = chooseTarget(state);
        if (!target || !canAfford(state, target)) break;
        const next = buyItem(state, target.id);
        if (next === state) break;
        state = next;
      }
    }
    expect(state.achievements).toEqual(
      expect.arrayContaining([
        "first-hire",
        "five-foragers",
        "ten-foragers",
        "fifty-villagers",
        "first-machine",
        "horizon-half",
        "stage-two",
        "research-half",
        "stage-three",
      ]),
    );
  });
});

describe("reachability", () => {
  /** Play a strategy to the final choice through the real game API, pressing Look up when ready. */
  function playToTheExit(name: string): GameState {
    const strategy = STRATEGIES.find((s) => s.name === name)!;
    let now = 1_700_000_000_000;
    let state = createGameState(now);
    while (phaseOf(state) === "playing" && state.time < CONFIG.maxSeconds) {
      strategy.decide(state);
      now += 1000;
      state = tick(state, now);
      state = lookUp(state);
      for (let i = 0; i < CONFIG.clicksPerSecond; i++) state = gatherFood(state);
      for (;;) {
        const target = chooseTarget(state);
        if (!target || !canAfford(state, target)) break;
        const next = buyItem(state, target.id);
        if (next === state) break;
        state = next;
      }
    }
    return state;
  }

  it("lets every achievement be earned by some way of playing", () => {
    const kind = withSettled(breakOut(playToTheExit("compassionate"), 0));
    const cruel = withSettled(breakOut(playToTheExit("efficient"), 0.999));
    const earned = new Set([...kind.achievements, ...cruel.achievements]);
    const missing = ACHIEVEMENTS.map((a) => a.id).filter((id) => !earned.has(id));
    expect(missing).toEqual([]);
  });
});
