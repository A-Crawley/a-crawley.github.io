import { CONFIG } from "./config.ts";
import { createGameState, STATE_VERSION } from "./state.ts";

describe("createGameState", () => {
  it("starts a fresh village at the given time", () => {
    const state = createGameState(1_700_000_000_000);
    expect(state.version).toBe(STATE_VERSION);
    expect(state.lastTickAt).toBe(1_700_000_000_000);
    expect(state.stage).toBe(1);
    expect(state.time).toBe(0);
    expect(state.food).toBe(0);
    expect(state.morale).toBe(CONFIG.morale.start);
    expect(Object.values(state.owned).every((count) => count === 0)).toBe(true);
  });

  it("survives a JSON round trip unchanged, so it can be saved", () => {
    const state = createGameState(5);
    state.food = 12.5;
    state.owned.forager = 3;
    state.policies.extendedShifts = true;
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("survives structuredClone unchanged", () => {
    const state = createGameState(5);
    expect(structuredClone(state)).toEqual(state);
  });
});
