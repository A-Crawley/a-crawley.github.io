import { ACHIEVEMENTS } from "./achievements.ts";
import { ENDING_COPY, OTHER_ENDING_HINT } from "./endingCopy.ts";
import { ENDINGS } from "./ending.ts";
import { EVENTS } from "./events.ts";
import { runReport } from "./runReport.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";

function finished(ending: "conquest" | "apocalypse" | null = "conquest"): GameState {
  const state = createGameState(0);
  state.ending = ending;
  return state;
}

describe("runReport", () => {
  it("has no events and counts everything as unseen for a run with none", () => {
    const report = runReport(finished());
    expect(report.events).toEqual([]);
    expect(report.unseenEvents).toBe(EVENTS.length);
    expect(report.unseenAchievements).toBe(ACHIEVEMENTS.length);
  });

  it("lists every event when all have been met, and counts none as unseen", () => {
    const state = finished();
    state.events.resolved = EVENTS.map((def) => ({
      id: def.id,
      choice: def.defaultChoice,
      auto: false,
    }));
    const report = runReport(state);
    expect(report.events).toHaveLength(EVENTS.length);
    expect(report.unseenEvents).toBe(0);
  });

  it("names the choice by its label and marks auto-decided events, keeping the order", () => {
    const state = finished();
    state.events.resolved = [
      { id: "frost", choice: "fires", auto: false },
      { id: "leanWeek", choice: "cut", auto: true },
    ];
    const report = runReport(state);
    expect(report.events).toEqual([
      { title: "A hard frost", choice: "Burn wood for shared fires", auto: false },
      { title: "A lean week", choice: "Cut portions", auto: true },
    ]);
    expect(report.unseenEvents).toBe(EVENTS.length - 2);
  });

  it("counts achievements earned", () => {
    const state = finished();
    state.achievements = ACHIEVEMENTS.slice(0, 3).map((a) => a.id);
    expect(runReport(state).unseenAchievements).toBe(ACHIEVEMENTS.length - 3);
  });

  it("hints at the other ending for each ending, and at nothing before there is one", () => {
    expect(runReport(finished("conquest")).hint).toBe(OTHER_ENDING_HINT.conquest);
    expect(runReport(finished("apocalypse")).hint).toBe(OTHER_ENDING_HINT.apocalypse);
    expect(runReport(finished(null)).hint).toBeNull();
    expect(OTHER_ENDING_HINT.conquest).not.toBe(OTHER_ENDING_HINT.apocalypse);
  });

  it("never carries the drift, an odds figure or any number in what the player reads", () => {
    for (const ending of ENDINGS) {
      const state = finished(ending);
      state.drift = 12345;
      state.events.resolved = [{ id: "leanWeek", choice: "share", auto: false }];
      const report = runReport(state);
      expect(JSON.stringify(report)).not.toMatch(/12345|drift|odds|%/i);
      expect(report.hint).not.toMatch(/\d|%/);
      expect(Object.keys(report).sort()).toEqual(
        ["events", "hint", "unseenAchievements", "unseenEvents"].sort(),
      );
    }
    for (const hint of Object.values(OTHER_ENDING_HINT)) expect(hint).not.toMatch(/\d|%/);
    expect(Object.keys(ENDING_COPY)).toEqual(Object.keys(OTHER_ENDING_HINT));
  });

  it("does not change the state it reads", () => {
    const state = finished();
    const before = structuredClone(state);
    runReport(state);
    expect(state).toEqual(before);
  });
});
