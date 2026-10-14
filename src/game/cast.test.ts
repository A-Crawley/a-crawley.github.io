import {
  applyCast,
  CAST,
  castDepartures,
  castEnding,
  castPresent,
  castReviewNote,
  createCastState,
  nameList,
  pendingCast,
} from "./cast.ts";
import { logLines } from "./log.ts";
import { catchUp } from "./offline.ts";
import { withSettled } from "./settle.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";

function withPopulation(population: number): GameState {
  const state = createGameState(0);
  state.population = population;
  applyCast(state);
  return state;
}

describe("the cast", () => {
  it("has about eight unique names, each with a role and a leaving line that names them", () => {
    expect(CAST.length).toBeGreaterThanOrEqual(6);
    expect(CAST.length).toBeLessThanOrEqual(8);
    expect(new Set(CAST.map((c) => c.name)).size).toBe(CAST.length);
    for (const member of CAST) {
      expect(member.role).not.toBe("");
      expect(member.leaves).toContain(member.name);
      expect(member.leaves).toContain(member.role);
    }
  });
});

describe("arrival", () => {
  it("starts with the first villagers named, in order", () => {
    const state = createGameState(0);
    expect(state.cast).toEqual(createCastState(state.population));
    expect(castPresent(state.cast)).toEqual([0, 1, 2]);
  });

  it("names each newcomer in arrival order, up to the size of the cast", () => {
    const state = withPopulation(5);
    expect(castPresent(state.cast)).toEqual([0, 1, 2, 3, 4]);
    state.population = 50;
    applyCast(state);
    expect(castPresent(state.cast)).toEqual(CAST.map((_, i) => i));
    expect(state.cast.arrived).toBe(CAST.length);
  });

  it("gives the same result however the arrivals are grouped", () => {
    const stepwise = createGameState(0);
    for (let p = 4; p <= 12; p++) {
      stepwise.population = p;
      applyCast(stepwise);
    }
    expect(stepwise.cast).toEqual(withPopulation(12).cast);
  });
});

describe("departure", () => {
  it("takes the earliest named villager first, and keeps the order", () => {
    const state = withPopulation(10);
    state.population = 9;
    applyCast(state);
    state.population = 7;
    applyCast(state);
    expect(state.cast.departed).toEqual([0, 1, 2]);
    expect(castPresent(state.cast)).toEqual([3, 4, 5, 6, 7]);
    expect(castDepartures(state.cast)).toEqual([CAST[0]!.leaves, CAST[1]!.leaves, CAST[2]!.leaves]);
  });

  it("does not bring a departed villager back when the village grows again", () => {
    const state = withPopulation(10);
    state.population = 9;
    applyCast(state);
    state.population = 20;
    applyCast(state);
    expect(state.cast.departed).toEqual([0]);
    expect(castPresent(state.cast)).not.toContain(0);
  });

  it("runs out of named villagers without error", () => {
    const state = withPopulation(3);
    state.population = 0;
    applyCast(state);
    expect(state.cast.departed).toEqual([0, 1, 2]);
    state.population = 2;
    applyCast(state);
    expect(state.cast.departed).toHaveLength(3);
  });

  it("is only pending when the population changed in a way that matters", () => {
    const state = withPopulation(10);
    expect(pendingCast(state)).toBe(false);
    state.population = 9;
    expect(pendingCast(state)).toBe(true);
    applyCast(state);
    state.population = 15;
    expect(pendingCast(state)).toBe(false); // everyone in the cast has already arrived
  });

  it("does not touch anything but the cast", () => {
    const state = withPopulation(10);
    state.population = 6;
    const before = structuredClone(state);
    applyCast(state);
    const { cast: after, ...rest } = state;
    const { cast: was, ...restBefore } = before;
    expect(rest).toEqual(restBefore);
    expect(after).not.toEqual(was);
  });
});

describe("log, review and ending copy", () => {
  it("logs each departure once, by name, with a stable key", () => {
    const state = withPopulation(10);
    state.population = 8;
    applyCast(state);
    const lines = logLines(state).filter((l) => l.id.startsWith("cast:"));
    expect(lines.map((l) => l.id)).toEqual(["cast:0", "cast:1"]);
    expect(lines[0]!.text).toBe(CAST[0]!.leaves);
  });

  it("gives a review note only once someone has left", () => {
    const state = withPopulation(10);
    expect(castReviewNote(state.cast)).toBeNull();
    state.population = 9;
    applyCast(state);
    expect(castReviewNote(state.cast)).toContain("Priya has left");
    state.population = 8;
    applyCast(state);
    expect(castReviewNote(state.cast)).toContain("Priya and Marcus have left");
  });

  it("handles everyone staying, everyone leaving and a mix in the ending", () => {
    const stayed = withPopulation(20);
    expect(castEnding(stayed.cast)).toMatch(
      /^Everyone you came to know stayed: Priya, .* and Abel\./,
    );

    const mixed = withPopulation(20);
    mixed.population = 18;
    applyCast(mixed);
    expect(castEnding(mixed.cast)).toBe(
      "Still here at the end: Dee, Okafor, Wen, Tomasz, Ines and Abel. Gone: Priya and Marcus.",
    );

    const none = withPopulation(20);
    none.population = 0;
    applyCast(none);
    expect(castEnding(none.cast)).toMatch(/^Nobody from the early days/);

    expect(castEnding({ arrived: 0, departed: [], lastPopulation: 0 })).toBeNull();
  });

  it("has no numbers in anything the player reads", () => {
    for (const member of CAST) expect(member.leaves).not.toMatch(/\d/);
    expect(nameList(["A"])).toBe("A");
    expect(nameList(["A", "B"])).toBe("A and B");
    expect(nameList(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("catchUp and the cast", () => {
  it("names departures the same way whether they happen online or while away", () => {
    const state = createGameState(1_700_000_000_000);
    state.owned.forager = 5;
    state.population = 10;
    applyCast(state);
    state.arrivalTimer = -Infinity;
    state.events.nextAt = Infinity;
    const away = withSettled(catchUp(state, 1_700_000_000_000 + 3600_000).state);
    // Drop the village by hand after the trip: the same rule applies.
    away.population -= 2;
    const settled = withSettled(away);
    expect(settled.cast.departed.length).toBeGreaterThanOrEqual(2);
    expect(settled.cast.departed.slice(0, 2)).toEqual([0, 1]);
  });
});
