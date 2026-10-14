import { CONFIG } from "./config.ts";
import {
  ECHO_NOTES,
  ECHO_OPENING,
  ECHO_RIVAL,
  ECHO_SKY,
  isRunRecord,
  parseRunRecord,
  recordOf,
} from "./echoes.ts";
import type { RunRecord } from "./echoes.ts";
import { ENDINGS, TEMPERAMENTS } from "./ending.ts";
import { logLines } from "./log.ts";
import { nextSighting, lookUp } from "./sky.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { withSettled } from "./settle.ts";

const rec = (over: Partial<RunRecord> = {}): RunRecord => ({
  ending: "apocalypse",
  tone: "wary",
  walkouts: 2,
  ...over,
});

function run(echo: RunRecord | null, change: (s: GameState) => void = () => {}): GameState {
  const state = createGameState(0, echo);
  state.unlocked.push("lookUp");
  change(state);
  return state;
}

describe("the run record", () => {
  it("is made from a finished run only", () => {
    const state = createGameState(0);
    expect(recordOf(state)).toBeNull();
    state.ending = "conquest";
    state.drift = 500;
    state.walkouts = 4;
    expect(recordOf(state)).toMatchObject({ ending: "conquest", walkouts: 4 });
  });

  it("is checked field by field", () => {
    expect(isRunRecord(rec())).toBe(true);
    expect(parseRunRecord({ ...rec(), extra: 1 })).toEqual(rec());
    expect(parseRunRecord(null)).toBeNull();
    expect(parseRunRecord({ ...rec(), walkouts: Infinity })).toBeNull();
  });
});

describe("a first run", () => {
  it("has no echo lines at all", () => {
    const state = run(null, (s) => {
      s.stage = 3;
      s.owned.forager = 50;
      s.owned.research = CONFIG.researchLevels;
    });
    const settled = withSettled(state);
    expect(logLines(settled).some((l) => l.id === "echo-opening")).toBe(false);
    expect(settled.unlocked.some((id) => id.startsWith("memory:"))).toBe(false);
    expect(nextSighting(settled)?.id.startsWith("echo:") ?? false).toBe(false);
  });

  it("is unchanged by a new game with no record", () => {
    expect(createGameState(0).echo).toBeNull();
  });
});

describe("the opening line", () => {
  it("is the second line of a second run's log, once", () => {
    const state = run(rec());
    const lines = logLines(state);
    expect(lines.map((l) => l.id).slice(0, 2)).toEqual(["day-one", "echo-opening"]);
    expect(lines[1].text).toBe(ECHO_OPENING);
    expect(lines.filter((l) => l.text === ECHO_OPENING)).toHaveLength(1);
    // Deriving again (a reload) gives the same single line.
    expect(logLines(structuredClone(state)).filter((l) => l.id === "echo-opening")).toHaveLength(1);
  });
});

describe("Sky notes", () => {
  it.each(ENDINGS)("offers three notes for an earlier %s, as the run reaches them", (ending) => {
    let state = run(rec({ ending }), (s) => {
      s.owned.forager = 12;
    });
    const seen: string[] = [];
    const look = () => {
      state = lookUp(state);
      state = { ...state, time: state.lookReadyAt };
      return state.sky.seen[state.sky.seen.length - 1];
    };
    // Look until the first-run sightings are gone, then the first echo note appears.
    for (let i = 0; i < 20; i++) look();
    seen.push(...state.sky.seen.filter((id) => id.startsWith("echo:")));
    expect(seen).toEqual([`echo:1:${ending}`]);
    state.stage = 2;
    for (let i = 0; i < 20; i++) look();
    state.stage = 3;
    for (let i = 0; i < 20; i++) look();
    expect(state.sky.seen.filter((id) => id.startsWith("echo:"))).toEqual(
      ECHO_NOTES.map((n) => `echo:${n}:${ending}`),
    );
    expect(ECHO_NOTES.map((n) => ECHO_SKY[ending][n])).toHaveLength(3);
  });

  it("never offers a note for the other ending", () => {
    let state = run(rec({ ending: "conquest" }), (s) => {
      s.stage = 3;
      s.owned.forager = 20;
    });
    for (let i = 0; i < 30; i++) {
      state = lookUp(state);
      state = { ...state, time: state.lookReadyAt };
    }
    expect(state.sky.seen.some((id) => id.endsWith(":apocalypse"))).toBe(false);
  });

  it("does not move the drift", () => {
    const base = run(rec(), (s) => {
      s.owned.forager = 12;
    });
    // Use up every first-run sighting first.
    let state = base;
    for (let i = 0; i < 20; i++) {
      state = lookUp(state);
      state = { ...state, time: state.lookReadyAt };
    }
    const before = state.drift;
    const echoes = state.sky.seen.filter((id) => id.startsWith("echo:")).length;
    expect(echoes).toBe(1);
    // That one echo sighting added nothing: drift equals first-run sightings times the nudge.
    const plain = state.sky.seen.length - echoes;
    expect(before).toBeCloseTo(plain * CONFIG.lookUp.discoveryDrift, 6);
  });
});

describe("the rival's line", () => {
  it.each(TEMPERAMENTS)("fires once for an earlier %s run, at stage 2", (tone) => {
    const state = run(rec({ tone }), (s) => {
      s.stage = 2;
      s.owned.research = 12;
    });
    const settled = withSettled(state);
    expect(settled.unlocked.filter((id) => id.startsWith("memory:"))).toEqual([`memory:${tone}`]);
    const text = logLines(settled).find((l) => l.id === `unlock:memory:${tone}`)?.text;
    expect(text).toBe(ECHO_RIVAL[tone]);
    expect(withSettled(settled).unlocked.filter((id) => id.startsWith("memory:"))).toHaveLength(1);
  });

  it("waits for the research to be under way", () => {
    const state = withSettled(
      run(rec(), (s) => {
        s.stage = 2;
        s.owned.research = 5;
      }),
    );
    expect(state.unlocked.some((id) => id.startsWith("memory:"))).toBe(false);
  });
});

describe("no effect on the economy", () => {
  it("leaves every number alone", () => {
    const a = createGameState(0);
    const b = createGameState(0, rec());
    expect({ ...b, echo: null }).toEqual(a);
  });
});
