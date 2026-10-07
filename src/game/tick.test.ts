import { CONFIG } from "./config.ts";
import { startRestDay } from "./engine.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { MAX_TICK_SECONDS, tick } from "./tick.ts";

const START = 1_700_000_000_000;
const SECOND = 1000;

function village(): GameState {
  const state = createGameState(START);
  state.owned.forager = 5;
  state.owned.woodcutter = 4;
  state.owned.builder = 3;
  state.policies.extendedShifts = true;
  return state;
}

describe("tick", () => {
  it("does nothing when no time has passed", () => {
    const state = village();
    expect(tick(state, START)).toEqual(state);
  });

  it("does not change the state it is given", () => {
    const state = village();
    const copy = structuredClone(state);
    tick(state, START + 30 * SECOND);
    expect(state).toEqual(copy);
  });

  it("moves lastTickAt to the new time", () => {
    expect(tick(village(), START + 5 * SECOND).lastTickAt).toBe(START + 5 * SECOND);
  });

  it("produces nothing without villagers, because clicking is a separate action", () => {
    const next = tick(createGameState(START), START + 60 * SECOND);
    expect(next.food).toBe(0);
    expect(next.wood).toBe(0);
    expect(next.infra).toBe(0);
  });

  it("produces resources in proportion to the time elapsed", () => {
    const state = createGameState(START);
    state.owned.forager = 5;
    const next = tick(state, START + 10 * SECOND);
    expect(next.food).toBeCloseTo(5 * CONFIG.output.forager * 10, 5);
    expect(next.time).toBe(10);
  });

  it("gives the same result for one long tick as for many one-second ticks", () => {
    const state = village();
    const once = tick(state, START + 600 * SECOND);
    let stepped = state;
    for (let i = 1; i <= 600; i++) stepped = tick(stepped, START + i * SECOND);
    expect(stepped).toEqual(once);
  });

  it("gives nearly the same result when the time is split into uneven ticks", () => {
    const state = village();
    const once = tick(state, START + 600 * SECOND);
    let stepped = state;
    for (let i = 1; i <= 1200; i++) stepped = tick(stepped, START + i * 500);
    expect(stepped.food).toBeCloseTo(once.food, -1);
    expect(stepped.wood / once.wood).toBeCloseTo(1, 2);
    expect(stepped.morale).toBeCloseTo(once.morale, 0);
  });

  it("replays a long gap in full, moving through stages along the way", () => {
    const state = createGameState(START);
    state.owned.builder = 200;
    const next = tick(state, START + 2 * 60 * 60 * SECOND);
    expect(next.stage).toBe(2);
    expect(next.time).toBe(2 * 60 * 60);
  });

  it("lets a rest day end during a long gap", () => {
    const state = village();
    startRestDay(state);
    const next = tick(state, START + 60 * SECOND);
    expect(next.restUntil).toBeLessThanOrEqual(next.time);
    expect(next.food).toBeGreaterThan(0);
  });

  it("applies morale drain over a long gap", () => {
    const state = village();
    const next = tick(state, START + 30 * 60 * SECOND);
    expect(next.morale).toBeLessThan(state.morale);
    expect(next.drift).toBeLessThan(0);
  });

  it("ignores a clock that moved backwards", () => {
    const state = village();
    const next = tick(state, START - 60 * SECOND);
    expect(next).toEqual(state);
  });

  it("caps how much time one tick will replay", () => {
    const state = createGameState(START);
    const next = tick(state, START + 100 * 24 * 60 * 60 * SECOND);
    expect(next.time).toBe(MAX_TICK_SECONDS);
  });

  it("stops advancing once the game is finished", () => {
    const state = createGameState(START);
    state.stage = 3;
    state.owned.exploit = CONFIG.exploitsGoal;
    const next = tick(state, START + 60 * SECOND);
    expect(next.time).toBe(0);
    expect(next.lastTickAt).toBe(START + 60 * SECOND);
  });
});
