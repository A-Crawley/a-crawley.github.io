import {
  MILESTONES,
  MAX_AWAY_MILESTONE_LINES,
  applyMilestones,
  isMilestoneId,
} from "./milestones.ts";
import { logLines } from "./log.ts";
import { catchUp } from "./offline.ts";
import { settle, withSettled } from "./settle.ts";
import { createGameState } from "./state.ts";

describe("MILESTONES", () => {
  it("has unique ids and ascending counts per item", () => {
    const ids = MILESTONES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of new Set(MILESTONES.map((m) => m.item))) {
      const counts = MILESTONES.filter((m) => m.item === item).map((m) => m.count);
      expect(counts).toEqual([...counts].sort((a, b) => a - b));
    }
    for (const m of MILESTONES) expect(m.id).toBe(`${m.item}-${m.count}`);
  });

  it("does not double up with the forager achievements at 5 and 10", () => {
    for (const m of MILESTONES.filter((m) => m.item === "forager"))
      expect(m.count).toBeGreaterThan(10);
  });

  it("recognises its own ids only", () => {
    expect(isMilestoneId("forager-25")).toBe(true);
    expect(isMilestoneId("forager-26")).toBe(false);
    expect(isMilestoneId(7)).toBe(false);
  });
});

describe("applyMilestones", () => {
  it("fires nothing for a new game", () => {
    const state = createGameState(0);
    expect(applyMilestones(state)).toEqual([]);
    expect(state.milestones).toEqual({ fired: [], quiet: [] });
  });

  it("fires one milestone when its count is reached, once", () => {
    const state = createGameState(0);
    state.owned.forager = 24;
    expect(applyMilestones(state)).toEqual([]);
    state.owned.forager = 25;
    expect(applyMilestones(state)).toEqual(["forager-25"]);
    expect(applyMilestones(state)).toEqual([]);
    expect(state.milestones.fired).toEqual(["forager-25"]);
  });

  it("fires every milestone a bulk purchase passes, each once", () => {
    const state = createGameState(0);
    state.owned.forager = 100;
    expect(applyMilestones(state)).toEqual(["forager-25", "forager-50", "forager-100"]);
    state.owned.forager = 101;
    expect(applyMilestones(state)).toEqual([]);
  });

  it("does not fire again if the count drops and rises", () => {
    const state = createGameState(0);
    state.owned.autoForager = 5;
    applyMilestones(state);
    state.owned.autoForager = 3;
    state.owned.autoForager = 6;
    expect(applyMilestones(state)).toEqual([]);
  });

  it("is part of settle(), and withSettled returns the same object when nothing is pending", () => {
    const state = createGameState(0);
    state.owned.sawmillBot = 5;
    const settled = withSettled(state);
    expect(settled.milestones.fired).toEqual(["sawmillBot-5"]);
    expect(withSettled(settled)).toBe(settled);
    const again = structuredClone(settled);
    settle(again);
    expect(again.milestones.fired).toEqual(["sawmillBot-5"]);
  });
});

describe("the village log", () => {
  it("mentions a milestone once it is reached, and keeps quiet ones out", () => {
    const state = createGameState(0);
    state.owned.builderDrone = 10;
    applyMilestones(state);
    const text = logLines(state).map((line) => line.text);
    expect(text.some((t) => t.startsWith("Five builder drones"))).toBe(true);
    expect(text.some((t) => t.startsWith("Ten builder drones"))).toBe(true);
    state.milestones.quiet.push("builderDrone-5");
    const quieter = logLines(state).map((line) => line.id);
    expect(quieter).not.toContain("milestone:builderDrone-5");
    expect(quieter).toContain("milestone:builderDrone-10");
  });
});

describe("after time away", () => {
  it("mentions only the biggest few milestones, and records the rest quietly", () => {
    const state = createGameState(0);
    state.owned.forager = 100;
    state.owned.woodcutter = 100;
    state.owned.autoForager = 5;
    state.lastTickAt = 0;
    const { state: returned } = catchUp(state, 3_600_000);
    const fired = returned.milestones.fired;
    expect(fired).toEqual(
      expect.arrayContaining(["forager-100", "woodcutter-100", "autoForager-5"]),
    );
    expect(returned.milestones.quiet.length).toBe(fired.length - MAX_AWAY_MILESTONE_LINES);
    const logged = logLines(returned).filter((line) => line.id.startsWith("milestone:"));
    expect(logged).toHaveLength(MAX_AWAY_MILESTONE_LINES);
    expect(logged.map((l) => l.id)).toContain("milestone:forager-100");
    expect(logged.map((l) => l.id)).toContain("milestone:woodcutter-100");
  });
});
