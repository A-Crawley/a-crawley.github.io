import {
  addVillagers,
  autoplay,
  grantResources,
  refreshVillage,
  setDriftKind,
  skipTime,
} from "./dev.ts";
import { DEV_KEY, readDevMode } from "./devMode.ts";
import { bedsOf, isFinished } from "./engine.ts";
import { phaseOf } from "./ending.ts";
import { createGameState } from "./state.ts";
import type { StorageLike } from "./storage.ts";

function memory(initial: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function working() {
  const state = createGameState(1_000_000);
  state.owned.forager = 5;
  state.population = 10;
  return state;
}

describe("skipTime", () => {
  it("plays the seconds as if they had passed, and leaves the clock and the input alone", () => {
    const state = working();
    const next = skipTime(state, 120);
    expect(next.time).toBeCloseTo(120, 5);
    expect(next.food).toBeGreaterThan(0);
    expect(next.lastTickAt).toBe(state.lastTickAt);
    expect(state.time).toBe(0);
  });
});

describe("autoplay", () => {
  it("plays a fixed number of seconds", () => {
    const next = autoplay(createGameState(0), "balanced", { kind: "seconds", seconds: 300 });
    expect(next.time).toBeGreaterThanOrEqual(300);
    expect(next.time).toBeLessThan(310);
    expect(next.owned.forager).toBeGreaterThan(0);
  });

  it("stops at the start of a stage", () => {
    const state = autoplay(createGameState(0), "balanced", { kind: "stage", stage: 2 });
    expect(state.stage).toBe(2);
    expect(state.time / 60).toBeGreaterThan(30);
    expect(state.time / 60).toBeLessThan(120);
  });

  it("plays on to the final choice, and the unlocks and achievements are up to date", () => {
    const state = autoplay(createGameState(0), "compassionate", { kind: "choice" });
    expect(isFinished(state)).toBe(true);
    expect(phaseOf(state)).toBe("choice");
    expect(state.unlocked.length).toBeGreaterThan(10);
    expect(state.achievements.length).toBeGreaterThan(0);
  });

  it("does not change the state it was given", () => {
    const state = createGameState(0);
    autoplay(state, "efficient", { kind: "seconds", seconds: 60 });
    expect(state.time).toBe(0);
    expect(state.owned.forager).toBe(0);
  });
});

describe("the other tools", () => {
  it("grants food and wood, even from nothing", () => {
    const next = grantResources(createGameState(0));
    expect(next.food).toBeGreaterThanOrEqual(1000);
    expect(next.wood).toBeGreaterThanOrEqual(1000);
    const rich = { ...working(), food: 500 };
    expect(grantResources(rich).food).toBe(5000);
  });

  it("restores morale and clears a walkout and the rest cooldown", () => {
    const state = {
      ...working(),
      morale: 5,
      walkoutUntil: 999,
      restReadyAt: 999,
      shortfallSeconds: 30,
    };
    const next = refreshVillage(state);
    expect(next).toMatchObject({
      morale: 100,
      walkoutUntil: 0,
      restReadyAt: 0,
      shortfallSeconds: 0,
    });
  });

  it("moves in villagers and builds the beds to hold them", () => {
    const state = working();
    const next = addVillagers(state, 50);
    expect(next.population).toBe(60);
    expect(bedsOf(next.owned, next.upgrades)).toBeGreaterThanOrEqual(60);
  });

  it("sets the drift to each end or the middle", () => {
    const state = working();
    expect(setDriftKind(state, "compassionate").drift).toBeGreaterThan(0);
    expect(setDriftKind(state, "efficient").drift).toBeLessThan(0);
    expect(setDriftKind({ ...state, drift: 500 }, "neutral").drift).toBe(0);
  });
});

describe("dev mode", () => {
  it("is off unless asked for", () => {
    expect(readDevMode("", memory())).toBe(false);
    expect(readDevMode("?dev=2", memory())).toBe(false);
  });

  it("turns on with ?dev=1 and remembers it", () => {
    const storage = memory();
    expect(readDevMode("?dev=1", storage)).toBe(true);
    expect(storage.getItem(DEV_KEY)).toBe("1");
    expect(readDevMode("", storage)).toBe(true);
  });

  it("turns off with ?dev=0 and forgets it", () => {
    const storage = memory({ [DEV_KEY]: "1" });
    expect(readDevMode("?dev=0", storage)).toBe(false);
    expect(readDevMode("", storage)).toBe(false);
  });

  it("still works with no storage", () => {
    expect(readDevMode("?dev=1", null)).toBe(true);
    expect(readDevMode("", null)).toBe(false);
  });
});
