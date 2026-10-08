import { buyUpgrade } from "./actions.ts";
import { ITEMS } from "./config.ts";
import { bedsOf, capOf, costOf, itemDef, ratesFor, retrainCost } from "./engine.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { withUnlocks } from "./unlocks.ts";
import {
  hasUpgrade,
  isUpgradeAvailable,
  isUpgradeId,
  UPGRADE_EFFECTS,
  upgradeDef,
  UPGRADES,
} from "./upgrades.ts";
import type { UpgradeId } from "./upgrades.ts";

/** A mid-game village where every upgrade's requirement is met, with plenty to spend. */
function rich(): GameState {
  const state = createGameState(0);
  state.stage = 2;
  state.owned.forager = 20;
  state.owned.woodcutter = 10;
  state.owned.builder = 5;
  state.owned.autoForager = 5;
  state.owned.sawmillBot = 3;
  state.owned.builderDrone = 1;
  state.owned.hut = 3;
  state.owned.granary = 1;
  state.population = 40;
  state.food = 100_000;
  state.wood = 100_000;
  return state;
}

function withUpgrade(state: GameState, id: UpgradeId): GameState {
  return { ...state, upgrades: [...state.upgrades, id] };
}

describe("the upgrade list", () => {
  it("is small, so each one matters", () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(8);
    expect(UPGRADES.length).toBeLessThanOrEqual(12);
  });

  it("has unique ids and a price in food or wood", () => {
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(UPGRADES.length);
    for (const upgrade of UPGRADES) {
      expect(["food", "wood"]).toContain(upgrade.currency);
      expect(upgrade.cost).toBeGreaterThan(0);
    }
  });

  it("recognises its own ids only", () => {
    expect(isUpgradeId("betterBaskets")).toBe(true);
    expect(isUpgradeId("nope")).toBe(false);
    expect(isUpgradeId(3)).toBe(false);
  });

  it("is offered only once what it improves exists", () => {
    const fresh = createGameState(0);
    for (const upgrade of UPGRADES) expect(isUpgradeAvailable(fresh, upgrade)).toBe(false);
    const early = { ...rich(), stage: 1 as const };
    for (const upgrade of UPGRADES.filter((u) => u.firstStage === 1)) {
      expect(isUpgradeAvailable(early, upgrade)).toBe(true);
    }
    for (const upgrade of UPGRADES.filter((u) => u.firstStage === 2)) {
      expect(isUpgradeAvailable(rich(), upgrade)).toBe(true);
    }
  });

  it("stops offering the root cellar after stage 1, when the stores already hold plenty", () => {
    const state = rich();
    expect(isUpgradeAvailable(state, upgradeDef("rootCellar"))).toBe(false);
  });

  it("keeps stage 2 upgrades out of stage 1", () => {
    const state = rich();
    state.stage = 1;
    for (const upgrade of UPGRADES.filter((u) => u.firstStage === 2)) {
      expect(isUpgradeAvailable(state, upgrade)).toBe(false);
    }
  });

  it("is no longer offered once bought", () => {
    const state = withUpgrade(rich(), "betterBaskets");
    expect(isUpgradeAvailable(state, upgradeDef("betterBaskets"))).toBe(false);
  });
});

describe("what each upgrade does", () => {
  it("Better baskets: foragers make more", () => {
    const state = rich();
    state.owned.autoForager = 0;
    const before = ratesFor(state, state.owned, false).food;
    const after = ratesFor(withUpgrade(state, "betterBaskets"), state.owned, false).food;
    expect(after / before).toBeCloseTo(UPGRADE_EFFECTS.betterBaskets, 5);
  });

  it("Sharper axes: woodcutters make more", () => {
    const state = rich();
    state.owned.sawmillBot = 0;
    const before = ratesFor(state, state.owned, false).wood;
    const after = ratesFor(withUpgrade(state, "sharperAxes"), state.owned, false).wood;
    expect(after / before).toBeCloseTo(UPGRADE_EFFECTS.sharperAxes, 5);
  });

  it("Shared spreadsheet: builders cost less, and nothing else does", () => {
    const state = rich();
    const builder = itemDef("builder");
    const next = withUpgrade(state, "sharedSpreadsheet");
    expect(costOf(next, builder)).toBeCloseTo(
      costOf(state, builder) * UPGRADE_EFFECTS.sharedSpreadsheet,
      8,
    );
    expect(costOf(next, itemDef("woodcutter"))).toBe(costOf(state, itemDef("woodcutter")));
  });

  it("Sturdier huts: each hut sleeps more, houses do not", () => {
    const state = rich();
    const before = bedsOf(state.owned, state.upgrades);
    const after = bedsOf(state.owned, ["sturdierHuts"]);
    expect(after - before).toBe(state.owned.hut * UPGRADE_EFFECTS.sturdierHuts);
    state.owned.hut = 0;
    state.owned.house = 2;
    expect(bedsOf(state.owned, ["sturdierHuts"])).toBe(bedsOf(state.owned, []));
  });

  it("Root cellar: the food store holds more, the wood store does not", () => {
    const state = rich();
    state.stage = 1;
    const next = withUpgrade(state, "rootCellar");
    expect(capOf(next, "food") - capOf(state, "food")).toBe(UPGRADE_EFFECTS.rootCellar);
    expect(capOf(next, "wood")).toBe(capOf(state, "wood"));
  });

  it("Maintenance contract: machines cost less", () => {
    const state = rich();
    const next = withUpgrade(state, "maintenanceContract");
    for (const id of ["autoForager", "sawmillBot", "builderDrone"] as const) {
      expect(costOf(next, itemDef(id))).toBeCloseTo(
        costOf(state, itemDef(id)) * UPGRADE_EFFECTS.maintenanceContract,
        8,
      );
    }
  });

  it("Preventive maintenance: machines make more", () => {
    const state = rich();
    state.owned.forager = state.owned.autoForager; // only machines make food
    const before = ratesFor(state, state.owned, false).food;
    const after = ratesFor(withUpgrade(state, "preventiveMaintenance"), state.owned, false).food;
    expect(after / before).toBeCloseTo(UPGRADE_EFFECTS.preventiveMaintenance, 5);
  });

  it("Onboarding deck: retraining costs less", () => {
    const state = rich();
    expect(retrainCost(withUpgrade(state, "onboardingDeck"))).toBeCloseTo(
      retrainCost(state) * UPGRADE_EFFECTS.onboardingDeck,
      8,
    );
  });

  it("leaves no upgrade strictly pointless: each changes something the player can see", () => {
    const state = rich();
    const early = { ...rich(), stage: 1 as const };
    const snapshot = (s: GameState) => ({
      rates: ratesFor(s, s.owned, false),
      beds: bedsOf(s.owned, s.upgrades),
      foodCap: capOf(s, "food"),
      retrain: retrainCost(s),
      prices: ITEMS.map((def) => costOf(s, def)),
    });
    for (const upgrade of UPGRADES) {
      const base = upgrade.lastStage === 1 ? early : state;
      expect(snapshot(withUpgrade(base, upgrade.id))).not.toEqual(snapshot(base));
    }
  });
});

describe("buyUpgrade", () => {
  it("pays the price and records the upgrade, on a copy", () => {
    const state = rich();
    const def = upgradeDef("betterBaskets");
    const next = buyUpgrade(state, "betterBaskets");
    expect(hasUpgrade(next, "betterBaskets")).toBe(true);
    expect(next.food).toBe(state.food - def.cost);
    expect(state.upgrades).toEqual([]);
  });

  it("pays in wood for a wood upgrade", () => {
    const state = rich();
    const def = upgradeDef("sharedSpreadsheet");
    expect(buyUpgrade(state, "sharedSpreadsheet").wood).toBe(state.wood - def.cost);
  });

  it("can't be bought twice, early, or without the money", () => {
    const state = rich();
    const once = buyUpgrade(state, "betterBaskets");
    expect(buyUpgrade(once, "betterBaskets")).toBe(once);
    expect(buyUpgrade(createGameState(0), "betterBaskets")).toEqual(createGameState(0));
    const poor = rich();
    poor.food = 1;
    expect(buyUpgrade(poor, "betterBaskets")).toBe(poor);
  });

  it("is revealed at half its price and stays revealed", () => {
    const state = rich();
    state.food = upgradeDef("betterBaskets").cost / 2 - 1;
    expect(withUnlocks(state).unlocked).not.toContain("upgrade:betterBaskets");
    state.food += 1;
    const revealed = withUnlocks(state);
    expect(revealed.unlocked).toContain("upgrade:betterBaskets");
    revealed.food = 0;
    expect(withUnlocks(revealed).unlocked).toContain("upgrade:betterBaskets");
  });
});
