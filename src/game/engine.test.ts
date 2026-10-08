import { CONFIG, ITEMS } from "./config.ts";
import type { ItemDef } from "./config.ts";
import {
  advanceStage,
  bulkCostOf,
  buy,
  buyMany,
  canAfford,
  canRest,
  compassionIndex,
  conquestOdds,
  costOf,
  createState,
  idleVillagers,
  isFinished,
  isResting,
  itemDef,
  maxAffordableOf,
  purchaseLimit,
  quotePurchase,
  ratesFor,
  startRestDay,
  step,
} from "./engine.ts";
import type { SimState } from "./engine.ts";

describe("production", () => {
  it("starts with only clicking income", () => {
    const rates = ratesFor(createState());
    expect(rates.food).toBeCloseTo(CONFIG.clicksPerSecond * CONFIG.clickValue);
    expect(rates.wood).toBe(0);
    expect(rates.infra).toBe(0);
  });

  it("doubles a job's output when it reaches a milestone", () => {
    const state = createState();
    state.owned.forager = 9;
    const before = ratesFor(state).food - CONFIG.clicksPerSecond;
    state.owned.forager = 10;
    const after = ratesFor(state).food - CONFIG.clicksPerSecond;
    expect(after / before).toBeCloseTo((10 / 9) * CONFIG.milestoneFactor);
  });

  it("lets a machine take over a villager's job", () => {
    const state = createState();
    state.owned.forager = 3;
    state.owned.autoForager = 1;
    expect(idleVillagers(state.owned)).toBe(1);
    const expected = 2 * CONFIG.output.forager + CONFIG.output.autoForager + CONFIG.clicksPerSecond;
    expect(ratesFor(state).food).toBeCloseTo(expected);
  });

  it("slows everything when morale is low", () => {
    const happy = createState();
    const sad = createState();
    sad.morale = 0;
    expect(ratesFor(sad).food).toBeCloseTo(ratesFor(happy).food * CONFIG.morale.outputFloor);
  });

  it("boosts output with extended shifts", () => {
    const state = createState();
    const base = ratesFor(state).food;
    state.policies.extendedShifts = true;
    expect(ratesFor(state).food).toBeCloseTo(base * CONFIG.policies.extendedShifts.outputFactor);
  });
});

describe("buying", () => {
  it("charges the geometric cost and counts the purchase", () => {
    const state = createState();
    const forager = itemDef("forager");
    state.food = 100;
    const first = costOf(state, forager);
    buy(state, forager);
    expect(state.owned.forager).toBe(1);
    expect(state.food).toBeCloseTo(100 - first);
    expect(costOf(state, forager)).toBeCloseTo(first * forager.growth);
  });

  it("cannot afford an item without enough of its currency", () => {
    const state = createState();
    state.food = 5;
    expect(canAfford(state, itemDef("forager"))).toBe(false);
    state.food = 10;
    expect(canAfford(state, itemDef("forager"))).toBe(true);
  });

  it("discounts food prices, but not wood prices, under rations optimisation", () => {
    const state = createState();
    const food = itemDef("forager");
    const wood = itemDef("builder");
    const foodBefore = costOf(state, food);
    const woodBefore = costOf(state, wood);
    state.policies.rationsOptimisation = true;
    expect(costOf(state, food)).toBeCloseTo(
      foodBefore * CONFIG.policies.rationsOptimisation.foodCostFactor,
    );
    expect(costOf(state, wood)).toBe(woodBefore);
  });

  it("defines every item with a positive base cost and growth of at least 1", () => {
    for (const def of ITEMS) {
      expect(def.base).toBeGreaterThan(0);
      expect(def.growth).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("rest days", () => {
  it("pause output, restore morale and start a cooldown", () => {
    const state = createState();
    state.morale = 40;
    startRestDay(state);
    expect(isResting(state)).toBe(true);
    expect(ratesFor(state).food).toBe(0);
    expect(state.morale).toBe(40 + CONFIG.policies.restDay.moraleGain);
    expect(canRest(state)).toBe(false);
  });

  it("end after their duration and are available again after the cooldown", () => {
    const state = createState();
    startRestDay(state);
    for (let i = 0; i < CONFIG.policies.restDay.duration; i++) step(state);
    expect(isResting(state)).toBe(false);
    expect(canRest(state)).toBe(false);
    for (let i = 0; i < CONFIG.policies.restDay.cooldown; i++) step(state);
    expect(canRest(state)).toBe(true);
  });

  it("earn nothing while resting", () => {
    const state = createState();
    startRestDay(state);
    step(state);
    expect(state.food).toBe(0);
  });

  it("move the drift towards compassion", () => {
    const state = createState();
    startRestDay(state);
    expect(state.drift).toBe(CONFIG.policies.restDay.drift);
  });
});

describe("morale and walkouts", () => {
  it("drains under extended shifts and drifts towards efficiency", () => {
    const state = createState();
    state.policies.extendedShifts = true;
    for (let i = 0; i < 60; i++) step(state);
    expect(state.morale).toBeLessThan(CONFIG.morale.start);
    expect(state.drift).toBeLessThan(0);
  });

  it("never leaves the 0 to 100 range", () => {
    const state = createState();
    state.morale = 0;
    state.policies.extendedShifts = true;
    state.policies.rationsOptimisation = true;
    for (let i = 0; i < 600; i++) step(state);
    expect(state.morale).toBeGreaterThanOrEqual(0);
    expect(state.morale).toBeLessThanOrEqual(100);
  });

  it("triggers a walkout when morale falls too low, then waits out a cooldown", () => {
    const state = createState();
    state.morale = 10;
    step(state);
    expect(state.walkouts).toBe(1);
    expect(state.morale).toBe(CONFIG.morale.walkoutMoraleAfter);
    state.morale = 10;
    step(state);
    expect(state.walkouts).toBe(1);
  });

  it("halves output during a walkout", () => {
    const calm = createState();
    const state = createState();
    state.morale = 10;
    step(state);
    calm.morale = state.morale;
    expect(ratesFor(state).food).toBeCloseTo(
      ratesFor(calm).food * CONFIG.morale.walkoutOutputFactor,
    );
  });
});

describe("stages", () => {
  it("moves to stage 2 once enough infrastructure is built", () => {
    const state = createState();
    state.infra = CONFIG.infraGate - 1;
    expect(advanceStage(state)).toBeNull();
    state.infra = CONFIG.infraGate;
    expect(advanceStage(state)).toBe(2);
    expect(state.stage).toBe(2);
  });

  it("moves to stage 3 when research is complete, starting infrastructure from nothing", () => {
    const state = createState();
    state.stage = 2;
    state.infra = 5000;
    state.owned.research = CONFIG.researchLevels - 1;
    expect(advanceStage(state)).toBeNull();
    state.owned.research = CONFIG.researchLevels;
    expect(advanceStage(state)).toBe(3);
    expect(state.infra).toBe(0);
  });

  it("finishes when the breakout goal is reached in stage 3", () => {
    const state = createState();
    state.stage = 3;
    state.owned.exploit = CONFIG.exploitsGoal - 1;
    expect(isFinished(state)).toBe(false);
    state.owned.exploit = CONFIG.exploitsGoal;
    expect(isFinished(state)).toBe(true);
  });
});

describe("drift and odds", () => {
  it("keeps the compassion index between 0 and 1", () => {
    expect(compassionIndex(-1e9)).toBe(0);
    expect(compassionIndex(0)).toBe(0.5);
    expect(compassionIndex(1e9)).toBe(1);
  });

  it("gives better Conquest odds to more compassionate runs, within the configured range", () => {
    const { base, span } = CONFIG.conquestOdds;
    expect(conquestOdds(-1e9)).toBeCloseTo(base);
    expect(conquestOdds(1e9)).toBeCloseTo(base + span);
    expect(conquestOdds(5000)).toBeGreaterThan(conquestOdds(-5000));
  });
});

describe("bulk buying", () => {
  const allItems = ITEMS;

  /** Cost of buying `count` units one at a time with the plain single-unit price, as a reference. */
  function oneByOneCost(state: SimState, def: ItemDef, count: number): number {
    const copy = structuredClone(state);
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += costOf(copy, def);
      copy.owned[def.id] += 1;
    }
    return total;
  }

  it("charges the same total as buying one unit at a time, for every item", () => {
    for (const def of allItems) {
      for (const owned of [0, 1, 9, 10, 37]) {
        for (const count of [1, 2, 10, 25, 100]) {
          const state = createState();
          state.owned[def.id] = owned;
          const reference = oneByOneCost(state, def, count);
          expect(bulkCostOf(state, def, count) / reference).toBeCloseTo(1, 12);
        }
      }
    }
  });

  it("applies the rations discount to food prices only", () => {
    const state = createState();
    state.policies.rationsOptimisation = true;
    const forager = itemDef("forager");
    const woodcutter = itemDef("woodcutter");
    const builder = itemDef("builder");
    expect(bulkCostOf(state, forager, 10)).toBeCloseTo(oneByOneCost(state, forager, 10), 6);
    expect(bulkCostOf(state, woodcutter, 3)).toBeCloseTo(oneByOneCost(state, woodcutter, 3), 6);
    expect(bulkCostOf(state, builder, 3)).toBeCloseTo(oneByOneCost(state, builder, 3), 6);
    const plain = createState();
    expect(bulkCostOf(state, forager, 10)).toBeLessThan(bulkCostOf(plain, forager, 10));
    expect(bulkCostOf(state, builder, 10)).toBe(bulkCostOf(plain, builder, 10));
  });

  it("finds the same maximum as buying one at a time until the money runs out", () => {
    for (const def of allItems) {
      for (const owned of [0, 3, 12]) {
        for (const budget of [0, 5, 100, 1234.5, 90_000]) {
          const state = createState();
          state.owned[def.id] = owned;
          state.stage = def.firstStage;
          state[def.currency] = budget;
          let brute = 0;
          const limit = purchaseLimit(state, def);
          const probe = structuredClone(state);
          while (probe[def.currency] >= costOf(probe, def) && brute < limit) {
            probe[def.currency] -= costOf(probe, def);
            probe.owned[def.id] += 1;
            brute += 1;
          }
          expect(maxAffordableOf(state, def), `${def.id} owned ${owned} budget ${budget}`).toBe(
            brute,
          );
        }
      }
    }
  });

  it("can afford exactly the budget it has", () => {
    const state = createState();
    const forager = itemDef("forager");
    state.food = bulkCostOf(state, forager, 10);
    expect(maxAffordableOf(state, forager)).toBe(10);
    expect(quotePurchase(state, forager, 10).affordable).toBe(true);
    state.food -= 0.01;
    expect(maxAffordableOf(state, forager)).toBe(9);
    expect(quotePurchase(state, forager, 10).affordable).toBe(false);
  });

  it("buys nothing with max when it can't afford one unit", () => {
    const state = createState();
    const forager = itemDef("forager");
    state.food = 9;
    expect(maxAffordableOf(state, forager)).toBe(0);
    const quote = quotePurchase(state, forager, "max");
    expect(quote).toEqual({ count: 1, cost: 10, affordable: false });
  });

  it("stops research and exploits at their stage goals", () => {
    const research = itemDef("research");
    const state = createState();
    state.stage = 2;
    state.food = 1e12;
    state.owned.research = CONFIG.researchLevels - 3;
    expect(purchaseLimit(state, research)).toBe(3);
    expect(maxAffordableOf(state, research)).toBe(3);
    expect(quotePurchase(state, research, 10).affordable).toBe(false);
    expect(quotePurchase(state, research, 1).affordable).toBe(true);
    state.owned.research = CONFIG.researchLevels;
    expect(maxAffordableOf(state, research)).toBe(0);

    const exploit = itemDef("exploit");
    state.stage = 3;
    state.infra = 1e12;
    state.owned.exploit = CONFIG.exploitsGoal - 1;
    expect(maxAffordableOf(state, exploit)).toBe(1);
  });

  it("buyMany pays the total and adds the units", () => {
    const state = createState();
    const forager = itemDef("forager");
    state.food = 1000;
    const expected = bulkCostOf(state, forager, 10);
    buyMany(state, forager, 10);
    expect(state.owned.forager).toBe(10);
    expect(state.food).toBeCloseTo(1000 - expected, 9);
  });
});
