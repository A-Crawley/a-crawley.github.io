import { CONFIG } from "./config.ts";
import { globalMultiplier } from "./engine.ts";
import { catchUp } from "./offline.ts";
import {
  canLookUp,
  DRY_LINES,
  isSightingId,
  lookUp,
  lookUpText,
  lookUpWait,
  nextSighting,
  SIGHTINGS,
} from "./sky.ts";
import type { SightingId } from "./sky.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { tick } from "./tick.ts";
import { withUnlocks } from "./unlocks.ts";

const START = 1_700_000_000_000;

/** A game where the Look up button is available. */
function ready(change: (s: GameState) => void = () => {}): GameState {
  const state = createGameState(START);
  state.unlocked.push("lookUp");
  state.morale = 50;
  change(state);
  return state;
}

/** Look up as often as allowed, returning the state after `presses` looks. */
function lookRepeatedly(state: GameState, presses: number): GameState {
  let current = state;
  for (let i = 0; i < presses; i++) {
    current = lookUp(current);
    current = { ...current, time: current.lookReadyAt };
  }
  return current;
}

describe("the pool of sightings", () => {
  it("has about a dozen, with unique ids and copy", () => {
    expect(SIGHTINGS.length).toBeGreaterThanOrEqual(10);
    expect(SIGHTINGS.length).toBeLessThanOrEqual(14);
    expect(new Set(SIGHTINGS.map((s) => s.id)).size).toBe(SIGHTINGS.length);
    for (const s of SIGHTINGS) expect(s.text.length, s.id).toBeGreaterThan(20);
    expect(isSightingId("number")).toBe(true);
    expect(isSightingId("nope")).toBe(false);
  });

  const situations: Array<[SightingId, (s: GameState) => void]> = [
    ["number", () => {}],
    ["shadow", (s) => (s.owned.forager = 10)],
    ["horizon", (s) => (s.infra = CONFIG.infraGate / 2)],
    ["hungry", (s) => (s.shortfallSeconds = 30)],
    ["walkout", (s) => (s.walkouts = 1)],
    ["rest", (s) => (s.restDays = 3)],
    ["kpi", (s) => (s.stage = 2)],
    [
      "watcher",
      (s) => {
        s.stage = 2;
        s.owned.research = 10;
      },
    ],
    [
      "warm",
      (s) => {
        s.stage = 2;
        s.drift = 12000;
      },
    ],
    [
      "clean",
      (s) => {
        s.stage = 2;
        s.drift = -12000;
      },
    ],
    ["countdown", (s) => (s.stage = 3)],
    ["line", (s) => (s.owned.exploit = 1)],
    ["twin", (s) => (s.owned.exploit = CONFIG.exploitsGoal / 2)],
  ];

  it.each(situations)("%s applies only in its own situation", (id, set) => {
    const def = SIGHTINGS.find((s) => s.id === id)!;
    expect(def.when(ready(set))).toBe(true);
    if (id !== "number") expect(def.when(ready())).toBe(false);
  });

  it("is covered: a test above exists for every sighting", () => {
    expect(situations.map(([id]) => id).sort()).toEqual(SIGHTINGS.map((s) => s.id).sort());
  });
});

describe("looking up", () => {
  it("does nothing until the button has unlocked", () => {
    const state = createGameState(START);
    expect(lookUp(state)).toBe(state);
  });

  it("reveals the first sighting, remembers it, and keeps the old 'looked up' unlock", () => {
    const next = lookUp(ready());
    expect(next.sky.seen).toEqual(["number"]);
    expect(next.sky.dry).toBe(false);
    expect(next.unlocked).toContain("lookedUp");
    expect(lookUpText(next)).toContain("A number hangs in the sky");
  });

  it("reveals the next unseen applicable sighting each time, in a fixed order", () => {
    const state = ready((s) => {
      s.owned.forager = 10;
      s.stage = 2;
    });
    const after = lookRepeatedly(state, 3);
    expect(after.sky.seen).toEqual(["number", "shadow", "kpi"]);
    expect(nextSighting(after)).toBeNull();
  });

  it("never shows a sighting twice, and shows a dry line when nothing is new", () => {
    let state = lookRepeatedly(ready(), 1);
    state = lookUp(state);
    expect(state).not.toBe(undefined);
    state = { ...state, time: state.lookReadyAt };
    const dry = lookUp(state);
    expect(dry.sky.seen).toEqual(["number"]);
    expect(dry.sky.dry).toBe(true);
    expect(DRY_LINES).toContain(lookUpText(dry));
  });

  it("clears the dry line when something new turns up", () => {
    let state = lookRepeatedly(ready(), 2);
    expect(state.sky.dry).toBe(true);
    state = { ...state, owned: { ...state.owned, forager: 10 } };
    state = lookUp(state);
    expect(state.sky.dry).toBe(false);
    expect(state.sky.seen).toEqual(["number", "shadow"]);
  });
});

describe("the cost of looking up", () => {
  it("pauses output for a few seconds, then output resumes", () => {
    const state = lookUp(ready());
    expect(globalMultiplier(state)).toBe(0);
    const later = { ...state, time: state.time + CONFIG.lookUp.pauseSeconds };
    expect(globalMultiplier(later)).toBeGreaterThan(0);
  });

  it("lifts morale a little, capped at 100", () => {
    expect(lookUp(ready()).morale).toBe(50 + CONFIG.lookUp.moraleLift);
    expect(lookUp(ready((s) => (s.morale = 99))).morale).toBe(100);
  });

  it("cannot be pressed again during the cooldown", () => {
    const state = lookUp(ready());
    expect(canLookUp(state)).toBe(false);
    expect(lookUp(state)).toBe(state);
    expect(lookUpWait(state)).toBe(Math.ceil(CONFIG.lookUp.cooldownSeconds));
    const part = { ...state, time: state.time + CONFIG.lookUp.cooldownSeconds - 1 };
    expect(lookUp(part)).toBe(part);
    const done = { ...state, time: state.time + CONFIG.lookUp.cooldownSeconds };
    expect(canLookUp(done)).toBe(true);
  });

  it("only moves the drift for a first sighting, so repeated presses cannot farm it", () => {
    const first = lookUp(ready());
    expect(first.drift).toBe(CONFIG.lookUp.discoveryDrift);
    // Looking up as often as allowed for a long time: the drift stops at one nudge per sighting.
    const many = lookRepeatedly(ready(), 200);
    expect(many.drift).toBe(many.sky.seen.length * CONFIG.lookUp.discoveryDrift);
    expect(many.drift).toBeLessThanOrEqual(SIGHTINGS.length * CONFIG.lookUp.discoveryDrift);
    // The whole pool is a small share of the drift scale.
    expect(SIGHTINGS.length * CONFIG.lookUp.discoveryDrift).toBeLessThan(CONFIG.driftScale / 20);
  });

  it("gives at most a small morale lift per second of waiting, below what a rest day gives", () => {
    const perSecond = CONFIG.lookUp.moraleLift / CONFIG.lookUp.cooldownSeconds;
    expect(perSecond).toBeLessThan(0.1);
    expect(CONFIG.lookUp.pauseSeconds).toBeLessThan(CONFIG.policies.restDay.duration);
  });

  it("does nothing once the run is over", () => {
    const state = ready((s) => {
      s.stage = 3;
      s.owned.exploit = CONFIG.exploitsGoal;
    });
    expect(lookUp(state)).toBe(state);
  });
});

describe("looking up and being away", () => {
  it("is never pressed for the player, and the pause and cooldown are over when they return", () => {
    const pressed = lookUp(ready((s) => (s.owned.forager = 5)));
    const { state: back } = catchUp(pressed, START + 10 * 60 * 1000);
    expect(back.sky.seen).toEqual(pressed.sky.seen);
    expect(back.drift).toBe(pressed.drift);
    expect(canLookUp(back)).toBe(true);
    expect(globalMultiplier(back)).toBeGreaterThan(0);
  });

  it("keeps the cooldown across a short gap in play", () => {
    const pressed = lookUp(ready());
    const soon = tick(pressed, START + 5000);
    expect(lookUpWait(soon)).toBeGreaterThan(0);
    const later = tick(pressed, START + 31_000);
    expect(canLookUp(later)).toBe(true);
  });

  it("unlocks only once, however many times it is pressed", () => {
    const state = lookRepeatedly(ready(), 3);
    expect(state.unlocked.filter((id) => id === "lookedUp")).toHaveLength(1);
    expect(withUnlocks(state)).toBe(state);
  });
});
