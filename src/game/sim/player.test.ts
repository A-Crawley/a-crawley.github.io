import { createState } from "../engine.ts";
import { chooseTarget, paybackSeconds, runSimulation, STRATEGIES } from "./player.ts";
import type { RunResult } from "./player.ts";
import { itemDef } from "../engine.ts";

describe("greedy player", () => {
  it("starts by saving for a forager", () => {
    expect(chooseTarget(createState())?.id).toBe("forager");
  });

  it("values an item that produces nothing as never paying back", () => {
    const state = createState();
    state.stage = 3;
    expect(paybackSeconds(state, itemDef("exploit"))).toBe(Infinity);
  });

  it("saves for the stage-ending research once nothing else pays back quickly", () => {
    const state = createState();
    state.stage = 2;
    // Machines and jobs are all enormously expensive, so research is the only sensible purchase.
    state.owned.forager = 200;
    state.owned.woodcutter = 200;
    state.owned.builder = 200;
    state.owned.autoForager = 200;
    state.owned.sawmillBot = 200;
    state.owned.builderDrone = 200;
    expect(chooseTarget(state)?.id).toBe("research");
  });
});

describe("full playthrough", () => {
  const results: Record<string, RunResult> = {};

  beforeAll(() => {
    for (const strategy of STRATEGIES) results[strategy.name] = runSimulation(strategy);
  });

  it("finishes for every strategy in roughly the 2 hour target", () => {
    for (const result of Object.values(results)) {
      expect(result.finished).toBe(true);
      expect(result.totalSeconds / 60).toBeGreaterThan(90);
      expect(result.totalSeconds / 60).toBeLessThan(180);
    }
  });

  it("passes through all three stages in order", () => {
    for (const result of Object.values(results)) {
      expect(result.stages.map((s) => s.stage)).toEqual([1, 2, 3]);
      for (const stage of result.stages) {
        expect(stage.endedAt).not.toBeNull();
        expect(stage.endedAt as number).toBeGreaterThan(stage.startedAt);
      }
    }
  });

  it("makes use of every job and machine, so no tier is dead", () => {
    for (const result of Object.values(results)) {
      expect(result.neverBought).toEqual([]);
    }
  });

  it("keeps the longest wait between purchases under 6 minutes", () => {
    for (const result of Object.values(results)) {
      for (const stage of result.stages) {
        expect(stage.longestGapSeconds).toBeLessThan(6 * 60);
      }
    }
  });

  it("gives compassionate play better Conquest odds than efficient play", () => {
    expect(results.compassionate.conquestOdds).toBeGreaterThan(results.balanced.conquestOdds);
    expect(results.balanced.conquestOdds).toBeGreaterThan(results.efficient.conquestOdds);
  });

  // GAME-18 decisions: efficiency is not a faster way to play (that is the joke: grinding people gets
  // you nowhere, and costs you the ending), and kindness costs no extra time.
  it("does not make efficient play faster than balanced play, nor slower", () => {
    const ratio = results.efficient.totalSeconds / results.balanced.totalSeconds;
    expect(ratio).toBeGreaterThan(0.95);
    expect(ratio).toBeLessThan(1.05);
  });

  it("lets compassionate play finish within 5% of balanced play", () => {
    const ratio = results.compassionate.totalSeconds / results.balanced.totalSeconds;
    expect(ratio).toBeGreaterThan(0.95);
    expect(ratio).toBeLessThan(1.05);
  });

  it("keeps every strategy close to the 2 hour target", () => {
    for (const result of Object.values(results)) {
      expect(result.totalSeconds / 60).toBeGreaterThan(105);
      expect(result.totalSeconds / 60).toBeLessThan(140);
    }
  });

  it("makes the efficient strategy suffer walkouts and the compassionate one rest", () => {
    expect(results.efficient.walkouts).toBeGreaterThan(0);
    expect(results.compassionate.restDays).toBeGreaterThan(0);
  });

  // GAME-22 and GAME-23: villagers fill jobs and sleep in beds. The cap should be felt, not stall.
  it("grows a village of a few hundred, and builds both kinds of housing", () => {
    for (const result of Object.values(results)) {
      expect(result.peakPopulation).toBeGreaterThan(100);
      expect(result.peakPopulation).toBeLessThan(300);
      expect(result.purchases.some((p) => p.item === "hut")).toBe(true);
      expect(result.purchases.some((p) => p.item === "house")).toBe(true);
    }
  });

  it("keeps time spent waiting for villagers to a few minutes", () => {
    for (const result of Object.values(results)) {
      expect(result.waitingForVillagersSeconds).toBeLessThan(10 * 60);
      expect(result.waitingForBedsSeconds).toBeLessThanOrEqual(result.waitingForVillagersSeconds);
      expect(result.waitingForBedsSeconds).toBeLessThan(5 * 60);
    }
  });

  it("is deterministic", () => {
    const again = runSimulation(STRATEGIES[1]);
    expect(again.totalSeconds).toBe(results.balanced.totalSeconds);
    expect(again.purchases.length).toBe(results.balanced.purchases.length);
  });
});
