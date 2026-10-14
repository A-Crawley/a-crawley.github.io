import { CONFIG } from "./config.ts";
import { logLines } from "./log.ts";
import { catchUp } from "./offline.ts";
import { withSettled } from "./settle.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import {
  acceptTarget,
  declineTarget,
  goalFor,
  MAX_OFFERS,
  offerTerms,
  targetSecondsLeft,
  windowFor,
} from "./targets.ts";
import { tick } from "./tick.ts";

const START = 1_700_000_000_000;
const t = CONFIG.targets;

/** A stage 2 village at a research level, fed and tidy. */
function stage2(level: number, change: (s: GameState) => void = () => {}): GameState {
  const state = createGameState(START);
  state.stage = 2;
  state.owned.forager = 40;
  state.owned.autoForager = 5;
  state.owned.granary = 400;
  state.owned.house = 4;
  state.population = 60;
  state.owned.research = level;
  state.food = 20_000;
  state.events.nextAt = Infinity;
  state.time = 500; // clear of the seasons, which have their own tests
  change(state);
  return state;
}

describe("when an offer is made", () => {
  it("is made at the first research level, once, and only in stage 2", () => {
    expect(withSettled(stage2(t.offerAtLevels[0] - 1)).targets.offer).toBe(false);
    const offered = withSettled(stage2(t.offerAtLevels[0]));
    expect(offered.targets).toMatchObject({ offer: true, offered: 1 });
    expect(withSettled(offered)).toBe(offered);
    const stage1 = stage2(10, (s) => (s.stage = 1));
    expect(withSettled(stage1).targets.offer).toBe(false);
  });

  it("makes at most three offers in a run, at the three levels", () => {
    expect(MAX_OFFERS).toBe(3);
    let state = withSettled(stage2(t.offerAtLevels[0]));
    for (let i = 1; i < MAX_OFFERS; i++) {
      state = declineTarget(state);
      state.owned.research = t.offerAtLevels[i];
      state = withSettled(state);
      expect(state.targets.offered).toBe(i + 1);
    }
    state = declineTarget(state);
    state.owned.research = CONFIG.researchLevels - t.stretch.levels;
    expect(withSettled(state).targets.offer).toBe(false);
    expect(state.targets.offered).toBe(MAX_OFFERS);
  });

  it("waits while a village event is waiting, then makes the offer", () => {
    const busy = stage2(8, (s) => {
      s.events.pending = { id: "stranger", since: 400 };
    });
    expect(withSettled(busy).targets.offer).toBe(false);
    busy.events.pending = null;
    expect(withSettled(busy).targets.offer).toBe(true);
  });

  it("does not offer when there is no room left for a stretch", () => {
    const late = stage2(CONFIG.researchLevels - t.stretch.levels + 1);
    expect(withSettled(late).targets.offer).toBe(false);
  });

  it("never expires on its own", () => {
    let state = withSettled(stage2(8));
    state = { ...state, time: state.time + 100_000 };
    expect(withSettled(state).targets.offer).toBe(true);
  });
});

describe("what a target asks", () => {
  it("is more levels for the stretch than for the gentler one, capped by the stage", () => {
    const state = stage2(10);
    expect(goalFor(state, "stretch")).toBe(10 + t.stretch.levels);
    expect(goalFor(state, "gentle")).toBe(10 + t.gentle.levels);
    expect(goalFor(stage2(29), "stretch")).toBe(CONFIG.researchLevels);
  });

  it("allows more time per level for the gentler one", () => {
    const state = stage2(14, (s) => (s.food = 12_000));
    const perLevel = (kind: "stretch" | "gentle") =>
      windowFor(state, kind) / (goalFor(state, kind) - state.owned.research);
    expect(perLevel("gentle")).toBeGreaterThan(perLevel("stretch"));
  });

  it("allows longer when the levels are dearer or the income is smaller", () => {
    const early = stage2(8, (s) => (s.food = 0));
    const late = stage2(22, (s) => (s.food = 0));
    expect(windowFor(late, "stretch")).toBeGreaterThan(windowFor(early, "stretch"));
    const poor = stage2(14, (s) => {
      s.food = 0;
      s.owned.forager = 12;
      s.owned.autoForager = 0;
    });
    const rich = stage2(14, (s) => (s.food = 0));
    expect(windowFor(poor, "stretch")).toBeGreaterThanOrEqual(windowFor(rich, "stretch"));
  });

  it("always stays within the bounds, and in steps of ten seconds", () => {
    for (const level of [6, 14, 22]) {
      for (const food of [0, 1e9]) {
        for (const kind of ["stretch", "gentle"] as const) {
          const seconds = windowFor(
            stage2(level, (s) => (s.food = food)),
            kind,
          );
          expect(seconds).toBeGreaterThanOrEqual(t.minSeconds);
          expect(seconds).toBeLessThanOrEqual(t.maxSeconds);
          expect(seconds % 10).toBe(0);
        }
      }
    }
  });

  it("is never a trap when income is nothing", () => {
    const broke = stage2(10, (s) => {
      s.food = 0;
      s.owned.forager = 0;
      s.owned.autoForager = 0;
    });
    expect(windowFor(broke, "stretch")).toBe(t.maxSeconds);
  });

  it("reports its terms for the offer card", () => {
    const state = stage2(14);
    expect(offerTerms(state, "stretch")).toEqual({
      goal: goalFor(state, "stretch"),
      seconds: windowFor(state, "stretch"),
    });
  });
});

describe("accepting", () => {
  it("starts the window, takes morale for the stretch and nothing else", () => {
    const offered = withSettled(stage2(8, (s) => (s.morale = 80)));
    const after = acceptTarget(offered, "stretch");
    expect(after.targets.offer).toBe(false);
    expect(after.targets.active).toEqual({
      kind: "stretch",
      goal: 8 + t.stretch.levels,
      endsAt: offered.time + windowFor(offered, "stretch"),
    });
    expect(after.morale).toBe(80 + t.stretch.moraleOnAccept);
    expect(after.drift).toBe(offered.drift);
  });

  it("costs the gentler target nothing and nudges the drift towards compassion", () => {
    const offered = withSettled(stage2(8, (s) => (s.morale = 80)));
    const after = acceptTarget(offered, "gentle");
    expect(after.morale).toBe(80);
    expect(after.drift).toBe(offered.drift + t.gentle.driftOnAccept);
  });

  it("does nothing without an offer, and does not change the state it is given", () => {
    const none = stage2(8);
    expect(acceptTarget(none, "stretch")).toBe(none);
    const offered = withSettled(stage2(8));
    const copy = structuredClone(offered);
    acceptTarget(offered, "stretch");
    expect(offered).toEqual(copy);
  });

  it("cannot be done twice", () => {
    const accepted = acceptTarget(withSettled(stage2(8)), "gentle");
    expect(acceptTarget(accepted, "stretch")).toBe(accepted);
  });
});

describe("declining", () => {
  it("costs nothing but a nudge towards compassion, and is recorded", () => {
    const offered = withSettled(stage2(8, (s) => (s.morale = 80)));
    const after = declineTarget(offered);
    expect(after.targets).toMatchObject({
      offer: false,
      active: null,
      results: [{ kind: "declined", met: false }],
    });
    expect(after.drift).toBe(offered.drift + t.declineDrift);
    expect(after.morale).toBe(80);
    expect(after.food).toBe(offered.food);
  });

  it("does nothing without an offer", () => {
    const none = stage2(8);
    expect(declineTarget(none)).toBe(none);
  });
});

describe("meeting a target", () => {
  it("pays the stretch in food and moves the drift towards efficiency", () => {
    const accepted = acceptTarget(withSettled(stage2(8)), "stretch");
    const goal = accepted.targets.active!.goal;
    const before = { ...accepted };
    const met = withSettled({ ...accepted, owned: { ...accepted.owned, research: goal } });
    expect(met.targets.active).toBeNull();
    expect(met.targets.results).toEqual([{ kind: "stretch", met: true }]);
    expect(met.food).toBeGreaterThan(before.food);
    expect(met.drift).toBe(before.drift + t.stretch.driftWhenMet);
  });

  it("pays the gentler target a smaller reward and no drift", () => {
    const base = acceptTarget(withSettled(stage2(8)), "gentle");
    const goal = base.targets.active!.goal;
    const met = withSettled({ ...base, owned: { ...base.owned, research: goal } });
    const stretchBase = acceptTarget(withSettled(stage2(8)), "stretch");
    const stretchMet = withSettled({
      ...stretchBase,
      owned: { ...stretchBase.owned, research: stretchBase.targets.active!.goal },
    });
    expect(met.targets.results).toEqual([{ kind: "gentle", met: true }]);
    expect(met.food - base.food).toBeLessThan(stretchMet.food - stretchBase.food);
    expect(met.drift).toBe(base.drift);
  });

  it("keeps the reward within the store", () => {
    const base = acceptTarget(withSettled(stage2(8)), "stretch");
    const full = { ...base, food: 1e12 };
    const met = withSettled({ ...full, owned: { ...full.owned, research: 20 } });
    expect(met.food).toBeLessThanOrEqual(1e12);
  });

  it("is checked as soon as the level is reached, before any time passes", () => {
    const accepted = acceptTarget(withSettled(stage2(8)), "gentle");
    const goal = accepted.targets.active!.goal;
    const bought = withSettled({ ...accepted, owned: { ...accepted.owned, research: goal } });
    expect(bought.targets.results).toHaveLength(1);
  });
});

describe("missing a target", () => {
  it("costs nothing more: no reward, and no drift or morale change", () => {
    const accepted = acceptTarget(withSettled(stage2(8)), "stretch");
    const late = withSettled({ ...accepted, time: accepted.targets.active!.endsAt + 1 });
    expect(late.targets.active).toBeNull();
    expect(late.targets.results).toEqual([{ kind: "stretch", met: false }]);
    expect(late.food).toBe(accepted.food);
    expect(late.morale).toBe(accepted.morale);
    expect(late.drift).toBe(accepted.drift);
  });

  it("is settled when the stage ends first", () => {
    const accepted = acceptTarget(withSettled(stage2(8)), "stretch");
    const moved = withSettled({ ...accepted, stage: 3 });
    expect(moved.targets.results).toEqual([{ kind: "stretch", met: false }]);
  });

  it("withdraws an unanswered offer when stage 2 ends", () => {
    const offered = withSettled(stage2(8));
    const moved = withSettled({ ...offered, stage: 3 });
    expect(moved.targets.offer).toBe(false);
    expect(moved.targets.results).toEqual([{ kind: "declined", met: false }]);
    expect(moved.drift).toBe(offered.drift);
  });

  it("lets the next offer come, because each is one place only", () => {
    let state = acceptTarget(withSettled(stage2(8)), "stretch");
    state = withSettled({ ...state, time: state.targets.active!.endsAt + 1 });
    state.owned.research = t.offerAtLevels[1];
    state = withSettled(state);
    expect(state.targets.offered).toBe(2);
    expect(state.targets.offer).toBe(true);
  });
});

describe("while the player is away", () => {
  it("holds the window still, so a target cannot run out unseen", () => {
    const accepted = acceptTarget(withSettled(stage2(8)), "stretch");
    const left = targetSecondsLeft(accepted);
    const away = catchUp({ ...accepted, lastTickAt: START }, START + 6 * 3600 * 1000);
    expect(away.state.targets.active).not.toBeNull();
    expect(targetSecondsLeft(away.state)).toBeCloseTo(left, 0);
    expect(away.state.targets.results).toEqual([]);
  });

  it("counts down normally while the player is there", () => {
    const accepted = acceptTarget(withSettled(stage2(8)), "stretch");
    const after = tick({ ...accepted, lastTickAt: START }, START + 30_000, { hunger: false });
    expect(targetSecondsLeft(after)).toBeCloseTo(targetSecondsLeft(accepted) - 30, 0);
  });

  it("does not make an offer's worth of trouble: an offer simply waits", () => {
    const offered = withSettled(stage2(8));
    const away = catchUp({ ...offered, lastTickAt: START }, START + 6 * 3600 * 1000);
    expect(away.state.targets.offer).toBe(true);
    expect(away.state.targets.results).toEqual([]);
  });
});

describe("the log", () => {
  it("says what happened to each, in order, and the one still open", () => {
    let state = withSettled(stage2(8));
    state = declineTarget(state);
    expect(logLines(state).some((l) => l.id === "target:0")).toBe(true);
    state.owned.research = t.offerAtLevels[1];
    state = acceptTarget(withSettled(state), "gentle");
    const ids = logLines(state).map((l) => l.id);
    expect(ids).toContain("target:0");
    expect(ids).toContain("target:1");
  });

  it("has no target lines for a run with none", () => {
    expect(logLines(stage2(3)).some((l) => l.id.startsWith("target:"))).toBe(false);
  });
});
