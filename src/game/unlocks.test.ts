import { buyItem, gatherFood } from "./actions.ts";
import { CONFIG } from "./config.ts";
import { canAfford } from "./engine.ts";
import { chooseNext, STRATEGIES } from "./sim/player.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { logLines } from "./log.ts";
import { tick } from "./tick.ts";
import {
  applyUnlocks,
  BULK_AFTER_OWNED,
  isUnlockId,
  isUnlocked,
  LOOK_UP_AFTER_FORAGERS,
  pendingUnlocks,
  POLICIES_AFTER_JOBS,
  unlock,
  UNLOCKS,
  withUnlocks,
} from "./unlocks.ts";
import type { UnlockId } from "./unlocks.ts";

const fresh = () => createGameState(0);

function unlockedAfter(change: (state: GameState) => void): UnlockId[] {
  const state = fresh();
  change(state);
  applyUnlocks(state);
  return state.unlocked;
}

describe("the unlock list", () => {
  it("has a unique id for every unlock", () => {
    const ids = UNLOCKS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("recognises its own ids and nothing else", () => {
    expect(isUnlockId("lookUp")).toBe(true);
    expect(isUnlockId("item:forager")).toBe(true);
    expect(isUnlockId("item:nothing")).toBe(false);
    expect(isUnlockId(7)).toBe(false);
    expect(isUnlockId(null)).toBe(false);
  });
});

describe("thresholds", () => {
  it("starts a new game with nothing unlocked", () => {
    expect(unlockedAfter(() => {})).toEqual([]);
  });

  it("offers the forager at half its price, and not before", () => {
    expect(unlockedAfter((s) => (s.food = 4.9))).toEqual([]);
    expect(unlockedAfter((s) => (s.food = 5))).toEqual(["item:forager"]);
  });

  it("shows morale after the first hire", () => {
    const ids = unlockedAfter((s) => (s.owned.forager = 1));
    expect(ids).toContain("morale");
    expect(ids).not.toContain("lookUp");
  });

  it("brings the Look up button alive after a few foragers", () => {
    expect(unlockedAfter((s) => (s.owned.forager = LOOK_UP_AFTER_FORAGERS - 1))).not.toContain(
      "lookUp",
    );
    expect(unlockedAfter((s) => (s.owned.forager = LOOK_UP_AFTER_FORAGERS))).toContain("lookUp");
  });

  it("never unlocks Look up's first look by itself", () => {
    const ids = unlockedAfter((s) => {
      s.owned.forager = 50;
      s.stage = 3;
    });
    expect(ids).not.toContain("lookedUp");
  });

  it("offers the stage 1 policy choices after ten jobs, of any kind", () => {
    const below = unlockedAfter((s) => {
      s.owned.forager = 5;
      s.owned.woodcutter = POLICIES_AFTER_JOBS - 6;
    });
    expect(below).not.toContain("policy:restDay");
    const at = unlockedAfter((s) => {
      s.owned.forager = 5;
      s.owned.woodcutter = POLICIES_AFTER_JOBS - 5;
    });
    expect(at).toContain("policy:restDay");
    expect(at).toContain("policy:rationsOptimisation");
    expect(at).not.toContain("policy:extendedShifts");
  });

  it("holds Extended Shifts back until the machines arrive", () => {
    expect(unlockedAfter((s) => (s.owned.forager = 40))).not.toContain("policy:extendedShifts");
    expect(unlockedAfter((s) => (s.stage = 2))).toEqual(
      expect.arrayContaining(["stage2", "policy:extendedShifts"]),
    );
  });

  it("offers bulk buying once any one item reaches the threshold", () => {
    expect(unlockedAfter((s) => (s.owned.woodcutter = BULK_AFTER_OWNED - 1))).not.toContain(
      "bulkBuying",
    );
    expect(unlockedAfter((s) => (s.owned.woodcutter = BULK_AFTER_OWNED))).toContain("bulkBuying");
  });

  it("tracks the stage 1 goal at 2%, half and 85% of the infrastructure target", () => {
    const at = (fraction: number) => unlockedAfter((s) => (s.infra = CONFIG.infraGate * fraction));
    expect(at(0.01)).not.toContain("horizon");
    expect(at(0.02)).toContain("horizon");
    expect(at(0.49)).not.toContain("horizonHalf");
    expect(at(0.5)).toContain("horizonHalf");
    expect(at(0.84)).not.toContain("rumours");
    expect(at(0.85)).toContain("rumours");
  });

  it("does not show the stage 1 goal in later stages", () => {
    const ids = unlockedAfter((s) => {
      s.stage = 2;
      s.infra = CONFIG.infraGate;
    });
    expect(ids).not.toContain("horizon");
  });

  it("tracks research in stage 2", () => {
    const at = (levels: number) =>
      unlockedAfter((s) => {
        s.stage = 2;
        s.owned.research = levels;
      });
    expect(at(0)).not.toContain("researchStarted");
    expect(at(1)).toContain("researchStarted");
    expect(at(CONFIG.researchLevels / 2 - 1)).not.toContain("researchHalf");
    expect(at(CONFIG.researchLevels / 2)).toContain("researchHalf");
    expect(at(CONFIG.researchLevels - 3)).not.toContain("researchNearly");
    expect(at(CONFIG.researchLevels - 2)).toContain("researchNearly");
  });

  it("only offers an item in the stages it can be bought", () => {
    const stage1 = unlockedAfter((s) => (s.food = 100_000));
    expect(stage1).not.toContain("item:autoForager");
    expect(stage1).not.toContain("item:research");
    const stage2 = unlockedAfter((s) => {
      s.stage = 2;
      s.food = 100_000;
    });
    expect(stage2).toEqual(expect.arrayContaining(["item:autoForager", "item:research"]));
  });
});

describe("applyUnlocks", () => {
  it("returns what unlocked just now and does it only once", () => {
    const state = fresh();
    state.owned.forager = 1;
    const first = applyUnlocks(state);
    expect(first).toEqual(expect.arrayContaining(["item:forager", "morale"]));
    expect(applyUnlocks(state)).toEqual([]);
    expect(state.unlocked).toEqual(first);
  });

  it("never locks anything again, even when the reason goes away", () => {
    const state = fresh();
    state.food = 100;
    applyUnlocks(state);
    expect(isUnlocked(state, "item:forager")).toBe(true);
    state.food = 0;
    expect(applyUnlocks(state)).toEqual([]);
    expect(isUnlocked(state, "item:forager")).toBe(true);
  });

  it("keeps unlocks in the order they happened", () => {
    const state = fresh();
    state.food = 5;
    applyUnlocks(state);
    state.owned.forager = LOOK_UP_AFTER_FORAGERS;
    applyUnlocks(state);
    const { unlocked } = state;
    expect(unlocked.indexOf("item:forager")).toBeLessThan(unlocked.indexOf("lookUp"));
  });
});

describe("withUnlocks and unlock", () => {
  it("settles a state without changing the original", () => {
    const state = fresh();
    state.owned.forager = 1;
    const settled = withUnlocks(state);
    expect(settled.unlocked).toContain("morale");
    expect(state.unlocked).toEqual([]);
  });

  it("returns the same object when there is nothing to unlock", () => {
    const state = withUnlocks(fresh());
    expect(withUnlocks(state)).toBe(state);
    expect(pendingUnlocks(state)).toEqual([]);
  });

  it("unlocks an id set by an action, once", () => {
    const state = fresh();
    const next = unlock(state, "lookedUp");
    expect(next.unlocked).toEqual(["lookedUp"]);
    expect(state.unlocked).toEqual([]);
    expect(unlock(next, "lookedUp")).toBe(next);
  });
});

describe("through play", () => {
  it("unlocks while time passes, even in one long gap", () => {
    const state = fresh();
    state.owned.forager = 5;
    const next = tick(state, 600_000);
    expect(next.unlocked).toEqual(expect.arrayContaining(["morale", "lookUp", "item:woodcutter"]));
  });

  it("reveals the two stages in order, at a pace of an unlock every few minutes", () => {
    const strategy = STRATEGIES.find((s) => s.name === "balanced")!;
    let now = 1_700_000_000_000;
    let state = createGameState(now);
    const metAt = new Map<UnlockId, number>();
    while (state.stage < 3 && state.time < CONFIG.maxSeconds) {
      strategy.decide(state);
      now += 1000;
      state = tick(state, now);
      for (let i = 0; i < CONFIG.clicksPerSecond; i++) state = gatherFood(state);
      for (;;) {
        const target = chooseNext(state).item;
        if (!target || !canAfford(state, target)) break;
        const next = buyItem(state, target.id);
        if (next === state) break;
        state = next;
      }
      for (const id of state.unlocked) if (!metAt.has(id)) metAt.set(id, state.time);
    }

    const at = (id: UnlockId) => metAt.get(id) ?? Number.NaN;
    // Both stages are played through.
    expect(state.stage).toBe(3);
    for (const id of ["stage2", "stage3", "researchStarted", "researchNearly"] as UnlockId[]) {
      expect(metAt.has(id)).toBe(true);
    }
    // They arrive in the order the design describes.
    const order: UnlockId[] = [
      "item:forager",
      "morale",
      "lookUp",
      "policy:restDay",
      "horizon",
      "horizonHalf",
      "rumours",
      "stage2",
      "researchStarted",
      "researchHalf",
      "researchNearly",
      "stage3",
    ];
    for (let i = 1; i < order.length; i++) {
      expect(at(order[i]!)).toBeGreaterThanOrEqual(at(order[i - 1]!));
    }
    // Early on, something new turns up within the first few minutes.
    expect(at("lookUp")).toBeLessThan(5 * 60);
    // Beds now compete with builders for the early food and wood, so Horizon comes a little later.
    expect(at("horizon")).toBeLessThan(15 * 60);
    // Nothing leaves a gap of more than 35 minutes once the game is under way (a perfect bot plays
    // far faster than a person, so a person only sees these later). The longest is the stretch
    // between the research halfway mark and "nearly done", which food upkeep stretched past half
    // an hour. Upgrades and events (GAME-30, GAME-31) are meant to fill it.
    const times = [...metAt.values()].sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]! - times[i - 1]!).toBeLessThan(35 * 60);
    }
  });
});

describe("rival incidents", () => {
  const rival = (state: GameState) => state.unlocked.filter((id) => id.startsWith("rival:"));

  it("stay quiet before stage 3", () => {
    expect(rival(withUnlocks(stateWith({ exploit: 5 }, 2)))).toEqual([]);
  });

  it("arrive at fixed exploit counts, once each", () => {
    const state = stateWith({ exploit: 6 }, 3);
    applyUnlocks(state);
    expect(rival(state)).toEqual(["rival:1:wary", "rival:6:wary"]);
    expect(applyUnlocks(state)).toEqual([]);
  });

  it("take their tone from the drift when they happen", () => {
    const kind = stateWith({ exploit: 1 }, 3, CONFIG.driftScale);
    const cruel = stateWith({ exploit: 1 }, 3, -CONFIG.driftScale);
    expect(rival(withUnlocks(kind))).toEqual(["rival:1:gentle"]);
    expect(rival(withUnlocks(cruel))).toEqual(["rival:1:ruthless"]);
  });

  it("keep the tone they had, even if the drift changes later", () => {
    const state = stateWith({ exploit: 1 }, 3, CONFIG.driftScale);
    applyUnlocks(state);
    state.drift = -CONFIG.driftScale;
    state.owned.exploit = 6;
    applyUnlocks(state);
    expect(rival(state)).toEqual(["rival:1:gentle", "rival:6:ruthless"]);
  });
});

function stateWith(
  owned: Partial<GameState["owned"]>,
  stage: GameState["stage"],
  drift = 0,
): GameState {
  const state = fresh();
  state.stage = stage;
  state.drift = drift;
  Object.assign(state.owned, owned);
  return state;
}

describe("housing reveal", () => {
  it("is offered once the village is nearly full and there is food to pay for it", () => {
    const state = fresh();
    state.food = 60;
    state.population = 5;
    expect(withUnlocks(state).unlocked).not.toContain("item:hut");
    state.population = 9;
    expect(withUnlocks(state).unlocked).toContain("item:hut");
  });

  it("logs the first time the village runs out of beds, once", () => {
    const state = fresh();
    state.population = 10;
    const next = withUnlocks(state);
    expect(next.unlocked).toContain("housing");
    expect(logLines(next).some((line) => /run out of beds/.test(line.text))).toBe(true);
  });

  it("shows the village line from the first job", () => {
    const state = fresh();
    expect(withUnlocks(state).unlocked).not.toContain("village");
    state.owned.forager = 1;
    expect(withUnlocks(state).unlocked).toContain("village");
  });
});

describe("storage reveal", () => {
  it("is offered once the stock is well on its way to the ceiling", () => {
    const state = fresh();
    state.wood = 200;
    state.food = 100;
    expect(withUnlocks(state).unlocked).not.toContain("item:granary");
    state.food = 200;
    const next = withUnlocks(state);
    expect(next.unlocked).toContain("item:granary");
    expect(next.unlocked).toContain("storage");
    expect(logLines(next).some((line) => /more than it can keep/.test(line.text))).toBe(true);
  });

  it("only offers the shed for the stock that is filling up", () => {
    const state = fresh();
    state.wood = 150;
    const next = withUnlocks(state);
    expect(next.unlocked).toContain("item:woodshed");
    expect(next.unlocked).not.toContain("item:granary");
  });
});
