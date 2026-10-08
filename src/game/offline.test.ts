import { CONFIG } from "./config.ts";
import { ratesFor } from "./engine.ts";
import { AWAY_AFTER_SECONDS, catchUp, MAX_AWAY_SECONDS, mergeAway } from "./offline.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { tick } from "./tick.ts";

const START = 1_700_000_000_000;
const at = (seconds: number) => START + seconds * 1000;

function village(): GameState {
  const state = createGameState(START);
  state.owned.forager = 10;
  state.owned.woodcutter = 4;
  state.owned.builder = 2;
  return state;
}

describe("catchUp: short gaps", () => {
  it("is an ordinary tick with no summary", () => {
    const state = village();
    state.policies.extendedShifts = true;
    const result = catchUp(state, at(AWAY_AFTER_SECONDS - 1));
    expect(result.away).toBeNull();
    expect(result.state).toEqual(tick(state, at(AWAY_AFTER_SECONDS - 1)));
    expect(result.state.policies.extendedShifts).toBe(true);
  });

  it("does nothing when no time has passed, or the clock went backwards", () => {
    const state = village();
    expect(catchUp(state, START).away).toBeNull();
    expect(catchUp(state, START - 5000).away).toBeNull();
    expect(catchUp(state, START - 5000).state.food).toBe(0);
  });
});

describe("catchUp: being away", () => {
  it("starts counting as away at the threshold", () => {
    expect(catchUp(village(), at(AWAY_AFTER_SECONDS)).away).not.toBeNull();
  });

  it("produces rate × time for a steady village, and reports it", () => {
    const state = village();
    const seconds = 2 * 60 * 60;
    const { state: after, away } = catchUp(state, at(seconds));
    const rates = ratesFor(state, state.owned, false);
    expect(after.food).toBeCloseTo(rates.food * seconds, 3);
    expect(after.wood).toBeCloseTo(rates.wood * seconds, 3);
    expect(after.infra).toBeCloseTo(rates.infra * seconds, 3);
    expect(away).toMatchObject({
      awaySeconds: seconds,
      countedSeconds: seconds,
      capped: false,
      stageFrom: 1,
      stageTo: 1,
    });
    expect(away!.gained.food).toBeCloseTo(after.food, 6);
  });

  it("switches the efficiency policies off as the player leaves", () => {
    const state = village();
    state.policies.extendedShifts = true;
    state.policies.rationsOptimisation = true;
    const { state: after, away } = catchUp(state, at(3600));
    expect(after.policies).toEqual({ extendedShifts: false, rationsOptimisation: false });
    expect(away!.policiesEnded).toEqual(["extendedShifts", "rationsOptimisation"]);
    // No morale or drift cost, and no bonus output either.
    expect(after.morale).toBe(100);
    expect(after.drift).toBe(0);
    expect(after.food).toBeCloseTo(ratesFor(village(), village().owned, false).food * 3600, 3);
  });

  it("lists only the policies that were actually on", () => {
    const state = village();
    state.policies.rationsOptimisation = true;
    expect(catchUp(state, at(3600)).away!.policiesEnded).toEqual(["rationsOptimisation"]);
    expect(catchUp(village(), at(3600)).away!.policiesEnded).toEqual([]);
  });

  it("does not change the state it is given", () => {
    const state = village();
    state.policies.extendedShifts = true;
    const copy = structuredClone(state);
    catchUp(state, at(3600));
    expect(state).toEqual(copy);
  });
});

describe("catchUp: the cap", () => {
  it("counts exactly the cap when the gap is exactly the cap", () => {
    const { away } = catchUp(village(), at(MAX_AWAY_SECONDS));
    expect(away).toMatchObject({ countedSeconds: MAX_AWAY_SECONDS, capped: false });
  });

  it("counts only the first 8 hours of a longer gap, and says so", () => {
    const state = village();
    const { state: after, away } = catchUp(state, at(3 * MAX_AWAY_SECONDS));
    const rates = ratesFor(state, state.owned, false);
    expect(after.food).toBeCloseTo(rates.food * MAX_AWAY_SECONDS, 2);
    expect(away).toMatchObject({
      awaySeconds: 3 * MAX_AWAY_SECONDS,
      countedSeconds: MAX_AWAY_SECONDS,
      capped: true,
    });
  });

  it("resumes from now after a capped gap, so the lost time does not come back", () => {
    const state = village();
    const now = at(3 * MAX_AWAY_SECONDS);
    const { state: after } = catchUp(state, now);
    expect(after.lastTickAt).toBe(now);
    const later = tick(after, now + 10_000);
    expect(later.food - after.food).toBeCloseTo(ratesFor(after, after.owned, false).food * 10, 5);
  });

  it("replays a full 8 hours quickly", () => {
    const started = performance.now();
    catchUp(village(), at(MAX_AWAY_SECONDS));
    expect(performance.now() - started).toBeLessThan(2000);
  });
});

describe("catchUp: things that happen while away", () => {
  it("moves on to the next stage if the gate is reached", () => {
    const state = village();
    state.owned.builder = 20;
    state.infra = CONFIG.infraGate - 10;
    const { state: after, away } = catchUp(state, at(3600));
    expect(after.stage).toBe(2);
    expect(away).toMatchObject({ stageFrom: 1, stageTo: 2 });
  });

  it("has no walkouts, even with every forager laid off in stage 2, because policies are off", () => {
    const state = village();
    state.stage = 2;
    state.owned.forager = 40;
    state.owned.autoForager = 40; // all 40 foragers are laid off
    const { state: after } = catchUp(state, at(MAX_AWAY_SECONDS));
    expect(after.walkouts).toBe(0);
    expect(after.morale).toBeGreaterThan(CONFIG.morale.walkoutBelow);
  });

  it("never reports a negative gain, even when a stage resets a currency", () => {
    const state = village();
    state.stage = 2;
    state.food = 1e9;
    state.owned.research = CONFIG.researchLevels - 1;
    state.infra = 5000;
    // Moving to stage 3 resets infrastructure to zero.
    state.owned.research = CONFIG.researchLevels;
    const { away } = catchUp(state, at(3600));
    expect(away!.gained.infra).toBeGreaterThanOrEqual(0);
  });

  it("gives the same result as ticking step by step with the policies off", () => {
    const state = village();
    state.policies.extendedShifts = true;
    const off = structuredClone(state);
    off.policies.extendedShifts = false;
    const reference = tick(off, at(5000));
    const { state: after } = catchUp(state, at(5000));
    expect(after).toEqual(reference);
  });
});

describe("mergeAway", () => {
  it("adds up two unseen summaries", () => {
    const first = catchUp(village(), at(3600)).away!;
    const second = {
      ...catchUp(village(), at(7200)).away!,
      policiesEnded: ["extendedShifts" as const],
      stageTo: 2 as const,
    };
    const merged = mergeAway(first, second);
    expect(merged.awaySeconds).toBe(3600 + 7200);
    expect(merged.gained.food).toBeCloseTo(first.gained.food + second.gained.food, 6);
    expect(merged.policiesEnded).toEqual(["extendedShifts"]);
    expect(merged.stageFrom).toBe(1);
    expect(merged.stageTo).toBe(2);
    expect(merged.capped).toBe(false);
  });
});

describe("catchUp: waiting at the final choice", () => {
  it("reports no time away, because time has stopped", () => {
    const state = village();
    state.stage = 3;
    state.owned.exploit = CONFIG.exploitsGoal;
    const result = catchUp(state, at(3 * 60 * 60));
    expect(result.away).toBeNull();
    expect(result.state.food).toBe(state.food);
  });
});
