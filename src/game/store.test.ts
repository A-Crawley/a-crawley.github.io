import { gatherFood } from "./actions.ts";
import { CONFIG, VILLAGE } from "./config.ts";
import { createGameState } from "./state.ts";
import { createGameStore } from "./store.ts";

/** Five foragers feeding a full village of ten, so the food per second stays the same. */
const NET_FOOD = 5 * 0.4 - 10 * VILLAGE.upkeepPerVillager;

function setup() {
  let time = 1_000_000;
  const initialState = createGameState(time);
  initialState.owned.forager = 5;
  initialState.population = 10;
  const store = createGameStore({ now: () => time, initialState });
  return {
    store,
    advance(seconds: number) {
      time += seconds * 1000;
    },
  };
}

describe("createGameStore achievements", () => {
  it("awards what a loaded save has already earned", () => {
    const initialState = createGameState(1_000_000);
    initialState.owned.forager = 10;
    const store = createGameStore({ now: () => 1_000_000, initialState });
    expect(store.getState().achievements).toEqual(
      expect.arrayContaining(["first-hire", "five-foragers", "ten-foragers"]),
    );
  });

  it("awards them for a replacement state, such as an imported save", () => {
    const store = createGameStore({ now: () => 1_000_000 });
    const imported = createGameState(1_000_000);
    imported.restDays = 3;
    store.replace(imported);
    expect(store.getState().achievements).toContain("first-rest");
  });
});

describe("createGameStore unlocks", () => {
  it("settles the unlocks a loaded save has earned before anything is shown", () => {
    const initialState = createGameState(1_000_000);
    initialState.owned.forager = 6;
    const store = createGameStore({ now: () => 1_000_000, initialState });
    expect(store.getState().unlocked).toEqual(
      expect.arrayContaining(["item:forager", "morale", "lookUp"]),
    );
  });

  it("settles a replacement state too, such as an imported save", () => {
    const store = createGameStore({ now: () => 1_000_000 });
    const imported = createGameState(1_000_000);
    imported.owned.forager = 6;
    store.replace(imported);
    expect(store.getState().unlocked).toContain("lookUp");
  });
});

describe("createGameStore", () => {
  it("holds the initial state", () => {
    const { store } = setup();
    expect(store.getState().owned.forager).toBe(5);
  });

  it("advances by elapsed time on tick", () => {
    const { store, advance } = setup();
    advance(10);
    store.tick();
    expect(store.getState().food).toBeCloseTo(NET_FOOD * 10, 5);
  });

  it("catches up to the current time before applying an action", () => {
    const { store, advance } = setup();
    advance(10);
    store.dispatch(gatherFood);
    // Ten seconds of foraging plus the click that came after it.
    expect(store.getState().food).toBeCloseTo(NET_FOOD * 10 + 1, 5);
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

  it("replaces the whole state and tells subscribers", () => {
    const { store } = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    const replacement = createGameState(5);
    store.replace(replacement);
    expect(store.getState()).toBe(replacement);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("gives a stable state object between changes, as React expects", () => {
    const { store } = setup();
    expect(store.getState()).toBe(store.getState());
  });
});

describe("createGameStore: being away", () => {
  it("has no summary for a short gap", () => {
    const { store, advance } = setup();
    advance(30);
    store.tick();
    expect(store.getAway()).toBeNull();
  });

  it("records a summary after a long gap, and tells subscribers", () => {
    const { store, advance } = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    advance(2 * 3600);
    store.tick();
    const away = store.getAway();
    expect(away?.awaySeconds).toBe(2 * 3600);
    expect(away?.gained.food).toBeCloseTo(NET_FOOD * 2 * 3600 * CONFIG.offlineRate, 3);
    expect(listener).toHaveBeenCalled();
  });

  it("catches up as away before applying an action", () => {
    const { store, advance } = setup();
    advance(3600);
    store.dispatch(gatherFood);
    expect(store.getAway()).not.toBeNull();
    expect(store.getState().food).toBeCloseTo(NET_FOOD * 3600 * CONFIG.offlineRate + 1, 3);
  });

  it("clears the summary when it is dismissed", () => {
    const { store, advance } = setup();
    advance(3600);
    store.tick();
    const listener = vi.fn();
    store.subscribe(listener);
    store.dismissAway();
    expect(store.getAway()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    store.dismissAway(); // nothing to dismiss: no extra notification
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("combines two summaries the player has not seen yet", () => {
    const { store, advance } = setup();
    advance(3600);
    store.tick();
    advance(3600);
    store.tick();
    expect(store.getAway()?.awaySeconds).toBe(7200);
  });

  it("forgets the summary when the game is replaced", () => {
    const { store, advance } = setup();
    advance(3600);
    store.tick();
    store.replace(createGameState(5));
    expect(store.getAway()).toBeNull();
  });
});
