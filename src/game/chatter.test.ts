import {
  applyChatter,
  capAwayChatter,
  CHATTER,
  chatterDue,
  chatterGap,
  chatterText,
  createChatterState,
  eligibleChatter,
  FIRST_CHATTER_AT,
  isChatterId,
  MAX_CHATTER_GAP,
  MAX_CHATTER_LINES,
  MIN_CHATTER_GAP,
  pickChatter,
} from "./chatter.ts";
import { CONFIG } from "./config.ts";
import { logLines } from "./log.ts";
import { catchUp } from "./offline.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { withSettled } from "./settle.ts";

function due(): GameState {
  const state = createGameState(0);
  state.time = FIRST_CHATTER_AT;
  return state;
}

describe("the chatter list", () => {
  it("has unique ids and text for each, with no numbers", () => {
    const ids = CHATTER.map((def) => def.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const def of CHATTER) {
      expect(isChatterId(def.id)).toBe(true);
      expect(chatterText(def.id)).toBe(def.text);
      expect(def.text).not.toMatch(/\d|%/);
    }
    expect(isChatterId("nope")).toBe(false);
  });

  it("has lines for every stage with no condition", () => {
    for (const stage of [1, 2, 3] as const) {
      const state = createGameState(0);
      state.stage = stage;
      expect(eligibleChatter(state).length).toBeGreaterThan(3);
    }
  });
});

describe("chatterGap", () => {
  it("is always between 2 and 4 minutes, and the same for the same count", () => {
    for (let count = 0; count < 500; count++) {
      const gap = chatterGap(count);
      expect(gap).toBeGreaterThanOrEqual(MIN_CHATTER_GAP);
      expect(gap).toBeLessThanOrEqual(MAX_CHATTER_GAP);
      expect(chatterGap(count)).toBe(gap);
    }
    expect(MIN_CHATTER_GAP).toBe(120);
    expect(MAX_CHATTER_GAP).toBe(240);
  });
});

describe("applyChatter", () => {
  it("waits for the first line, then adds one and schedules the next", () => {
    const state = createGameState(0);
    state.time = FIRST_CHATTER_AT - 1;
    expect(chatterDue(state)).toBe(false);
    expect(applyChatter(state)).toBe(false);
    expect(state.chatter).toEqual(createChatterState());

    state.time = FIRST_CHATTER_AT;
    expect(applyChatter(state)).toBe(true);
    expect(state.chatter.seen).toHaveLength(1);
    expect(state.chatter.count).toBe(1);
    expect(state.chatter.nextAt).toBe(FIRST_CHATTER_AT + chatterGap(1));
    expect(applyChatter(state)).toBe(false);
  });

  it("gives the same line for the same state, so a reload does not reshuffle", () => {
    const a = due();
    const b = due();
    applyChatter(a);
    applyChatter(b);
    expect(a.chatter).toEqual(b.chatter);
    expect(pickChatter(due())).toBe(pickChatter(due()));
  });

  it("never repeats the line just heard", () => {
    const state = due();
    let last = "";
    for (let i = 0; i < 60; i++) {
      state.time = state.chatter.nextAt;
      applyChatter(state);
      const id = state.chatter.seen[state.chatter.seen.length - 1]!;
      expect(id).not.toBe(last);
      last = id;
    }
  });

  it("keeps only the most recent lines, and counts all of them", () => {
    const state = due();
    for (let i = 0; i < MAX_CHATTER_LINES + 5; i++) {
      state.time = state.chatter.nextAt;
      applyChatter(state);
    }
    expect(state.chatter.seen).toHaveLength(MAX_CHATTER_LINES);
    expect(state.chatter.count).toBe(MAX_CHATTER_LINES + 5);
  });

  it("only uses a state-reactive line when its condition holds", () => {
    const state = due();
    const ids = () => eligibleChatter(state).map((def) => def.id);
    expect(ids()).not.toContain("hunger");
    expect(ids()).not.toContain("idle");
    expect(ids()).not.toContain("full");
    expect(ids()).not.toContain("machines");
    state.shortfallSeconds = 60;
    state.population = 5;
    state.owned.autoForager = 1;
    state.food = 10_000_000;
    expect(ids()).toContain("machines");
    expect(ids()).toContain("full");
  });

  it("keeps stage-specific lines to their stage", () => {
    const state = due();
    state.stage = 1;
    expect(eligibleChatter(state).map((d) => d.id)).not.toContain("seam");
    state.stage = 3;
    expect(eligibleChatter(state).map((d) => d.id)).not.toContain("touch-base");
  });

  it("does nothing once the run has ended or is at the final choice", () => {
    const ended = due();
    ended.stage = 3;
    ended.owned.exploit = CONFIG.exploitsGoal;
    expect(chatterDue(ended)).toBe(false);
    ended.ending = "conquest";
    expect(chatterDue(ended)).toBe(false);
  });

  it("changes nothing but the chatter", () => {
    const state = due();
    const before = structuredClone(state);
    applyChatter(state);
    const { chatter: after, ...rest } = state;
    const { chatter: was, ...restBefore } = before;
    expect(rest).toEqual(restBefore);
    expect(after).not.toEqual(was);
  });
});

describe("chatter in the log and after time away", () => {
  it("shows overheard lines at the end of the log with keys that stay put", () => {
    const state = due();
    for (let i = 0; i < MAX_CHATTER_LINES + 2; i++) {
      state.time = state.chatter.nextAt;
      applyChatter(state);
    }
    const lines = logLines(state).filter((l) => l.id.startsWith("chatter:"));
    expect(lines).toHaveLength(MAX_CHATTER_LINES);
    expect(lines[0]!.id).toBe("chatter:2");
    expect(lines[lines.length - 1]!.id).toBe(`chatter:${MAX_CHATTER_LINES + 1}`);
    expect(logLines(state).at(-1)!.text).toBe(chatterText(state.chatter.seen.at(-1)!));
  });

  it("gives at most one line after a long absence", () => {
    const state = createGameState(1_700_000_000_000);
    state.owned.forager = 5;
    state.population = 5;
    state.arrivalTimer = -Infinity;
    state.events.nextAt = Infinity;
    const { state: back } = catchUp(state, 1_700_000_000_000 + 8 * 3600 * 1000);
    const settled = withSettled(back);
    expect(settled.chatter.count).toBeGreaterThan(1);
    expect(settled.chatter.seen).toHaveLength(1);
    expect(settled.chatter.nextAt).toBeGreaterThan(settled.time);
    expect(logLines(settled).filter((l) => l.id.startsWith("chatter:"))).toHaveLength(1);
  });
});

describe("capAwayChatter", () => {
  it("keeps earlier lines and only the latest of the new ones", () => {
    const before = due();
    applyChatter(before);
    const after = structuredClone(before);
    for (let i = 0; i < 6; i++) {
      after.time = after.chatter.nextAt;
      applyChatter(after);
    }
    const latest = after.chatter.seen.at(-1);
    capAwayChatter(before, after);
    expect(after.chatter.seen).toEqual([...before.chatter.seen, latest]);
    expect(after.chatter.count).toBe(7);
  });

  it("leaves it alone when there is at most one new line", () => {
    const before = due();
    const after = structuredClone(before);
    applyChatter(after);
    const copy = structuredClone(after);
    capAwayChatter(before, after);
    expect(after).toEqual(copy);
  });
});
