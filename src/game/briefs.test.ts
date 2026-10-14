import {
  BRIEF_IDS,
  BRIEF_LOG,
  BRIEF_OPTIONS,
  BRIEF_REVIEW,
  briefLog,
  briefOffered,
  briefOption,
  briefReviewNote,
  chooseBrief,
  isBriefId,
  takeBrief,
} from "./briefs.ts";
import { CONFIG } from "./config.ts";
import { globalMultiplier, moraleDrivers, researchBonusPerLevel } from "./engine.ts";
import { logLines } from "./log.ts";
import { catchUp } from "./offline.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { tick } from "./tick.ts";

function stage2(): GameState {
  const state = createGameState(0);
  state.stage = 2;
  state.owned.research = 10;
  return state;
}

describe("the research brief", () => {
  it("has two briefs with wording and numbers, and no digits in what the player reads", () => {
    expect(BRIEF_IDS).toEqual(["fast", "steady"]);
    for (const id of BRIEF_IDS) {
      expect(isBriefId(id)).toBe(true);
      expect(briefOption(id).label).not.toBe("");
      expect(CONFIG.briefs[id]).toBeDefined();
      const text = [briefOption(id).detail, BRIEF_LOG[id], BRIEF_REVIEW[id]].join(" ");
      expect(text).not.toMatch(/\d|%/);
    }
    expect(BRIEF_OPTIONS).toHaveLength(2);
    expect(isBriefId("slow")).toBe(false);
    expect(isBriefId(null)).toBe(false);
  });

  it("is a real trade: one raises research output and drains morale, the other the reverse", () => {
    expect(CONFIG.briefs.fast.researchFactor).toBeGreaterThan(1);
    expect(CONFIG.briefs.fast.moralePerSecond).toBeLessThan(0);
    expect(CONFIG.briefs.fast.drift).toBeLessThan(0);
    expect(CONFIG.briefs.steady.researchFactor).toBeLessThan(1);
    expect(CONFIG.briefs.steady.moralePerSecond).toBeGreaterThan(0);
    expect(CONFIG.briefs.steady.drift).toBeGreaterThan(0);
  });
});

describe("choosing", () => {
  it("is offered in stage 2 until a brief is chosen", () => {
    expect(briefOffered(createGameState(0))).toBe(false);
    expect(briefOffered(stage2())).toBe(true);
    expect(briefOffered(chooseBrief(stage2(), "fast"))).toBe(false);
  });

  it("saves the choice, nudges the drift once and returns a new state", () => {
    const state = stage2();
    const next = chooseBrief(state, "steady");
    expect(next.brief).toBe("steady");
    expect(next.drift).toBe(state.drift + CONFIG.briefs.steady.drift);
    expect(state.brief).toBeNull();
    expect(chooseBrief(chooseBrief(stage2(), "fast"), "fast").drift).toBe(CONFIG.briefs.fast.drift);
  });

  it("is locked once chosen, and not available outside stage 2", () => {
    const picked = chooseBrief(stage2(), "fast");
    expect(chooseBrief(picked, "steady")).toBe(picked);
    const early = createGameState(0);
    expect(chooseBrief(early, "fast")).toBe(early);
    const late = stage2();
    late.stage = 3;
    expect(chooseBrief(late, "fast")).toBe(late);
    expect(takeBrief(picked, "steady")).toBe(false);
  });
});

describe("effects", () => {
  it("scales what each research level adds, and leaves an unchosen run unchanged", () => {
    const none = stage2();
    expect(researchBonusPerLevel(none)).toBe(CONFIG.researchBonusPerLevel);
    const fast = chooseBrief(stage2(), "fast");
    const steady = chooseBrief(stage2(), "steady");
    expect(globalMultiplier(fast)).toBeGreaterThan(globalMultiplier(none));
    expect(globalMultiplier(steady)).toBeLessThan(globalMultiplier(none));
  });

  it("pushes morale only during stage 2, in the direction of the brief", () => {
    const driver = (state: GameState) => moraleDrivers(state).find((d) => d.id === "brief");
    expect(driver(stage2())).toBeUndefined();
    expect(driver(chooseBrief(stage2(), "fast"))!.perSecond).toBeLessThan(0);
    expect(driver(chooseBrief(stage2(), "steady"))!.perSecond).toBeGreaterThan(0);
    const later = chooseBrief(stage2(), "fast");
    later.stage = 3;
    expect(driver(later)).toBeUndefined();
  });

  it("is the same online and away: a brief chosen before time away is kept", () => {
    const state = chooseBrief(stage2(), "fast");
    state.owned.forager = 5;
    state.population = 5;
    state.arrivalTimer = -Infinity;
    state.events.nextAt = Infinity;
    const { state: back } = catchUp({ ...state, lastTickAt: 0 }, 3600_000);
    expect(back.brief).toBe("fast");
    expect(tick(state, 10_000).brief).toBe("fast");
  });
});

describe("log and review wording", () => {
  it("says nothing until a brief is chosen, then one line each", () => {
    expect(briefLog(stage2())).toBeNull();
    expect(briefReviewNote(stage2())).toBeNull();
    const fast = chooseBrief(stage2(), "fast");
    expect(briefLog(fast)).toBe(BRIEF_LOG.fast);
    expect(briefReviewNote(fast)).toBe(BRIEF_REVIEW.fast);
    expect(logLines(fast).some((l) => l.id === "brief" && l.text === BRIEF_LOG.fast)).toBe(true);
    expect(logLines(stage2()).some((l) => l.id === "brief")).toBe(false);
  });

  it("reads differently for each brief", () => {
    expect(BRIEF_LOG.fast).not.toBe(BRIEF_LOG.steady);
    expect(BRIEF_REVIEW.fast).not.toBe(BRIEF_REVIEW.steady);
  });
});
