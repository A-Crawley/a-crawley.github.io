import { gatherFood } from "./actions.ts";
import { createGameState } from "./state.ts";
import { createGameStore } from "./store.ts";

function setup() {
  let time = 1_000_000;
  const initialState = createGameState(time);
  initialState.owned.forager = 5;
  const store = createGameStore({ now: () => time, initialState });
  return {
    store,
    advance(seconds: number) {
      time += seconds * 1000;
    },
  };
}

describe("createGameStore", () => {
  it("holds the initial state", () => {
    const { store } = setup();
    expect(store.getState().owned.forager).toBe(5);
  });

  it("advances by elapsed time on tick", () => {
    const { store, advance } = setup();
    advance(10);
    store.tick();
    expect(store.getState().food).toBeCloseTo(5 * 0.4 * 10, 5);
  });

  it("catches up to the current time before applying an action", () => {
    const { store, advance } = setup();
    advance(10);
    store.dispatch(gatherFood);
    // Ten seconds of foraging plus the click that came after it.
    expect(store.getState().food).toBeCloseTo(5 * 0.4 * 10 + 1, 5);
  });

  it("tells subscribers about changes, and stops once they unsubscribe", () => {
    const { store, advance } = setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    advance(1);
    store.tick();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    advance(1);
    store.tick();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("gives a stable state object between changes, as React expects", () => {
    const { store } = setup();
    expect(store.getState()).toBe(store.getState());
  });
});
