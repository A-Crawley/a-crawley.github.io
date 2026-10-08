import { CONFIG, ITEMS, STORAGE, VILLAGE } from "./config.ts";
import type { ItemDef } from "./config.ts";
import {
  advanceStage,
  bedsOf,
  bulkCostOf,
  buy,
  buyMany,
  canAfford,
  canRest,
  capOf,
  clampStocks,
  compassionIndex,
  conquestOdds,
  costOf,
  createState,
  idleVillagers,
  isAvailable,
  isFinished,
  isFull,
  isHungry,
  isResting,
  itemDef,
  maxAffordableOf,
  netFoodRate,
  purchaseLimit,
  quotePurchase,
  ratesFor,
  startRestDay,
  step,
  unemployed,
  upkeepPerSecond,
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
    state.population = 20;
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

describe("the village", () => {
  it("starts with a few people and ten beds", () => {
    const state = createState();
    expect(state.population).toBe(3);
    expect(bedsOf(state.owned)).toBe(10);
    expect(unemployed(state)).toBe(3);
  });

  it("gains a villager every few seconds while there is a free bed", () => {
    const state = createState();
    for (let i = 0; i < 4; i++) step(state);
    expect(state.population).toBe(4);
    for (let i = 0; i < 8; i++) step(state);
    expect(state.population).toBe(6);
  });

  it("stops at the number of beds, and starts again when a hut is built", () => {
    const state = createState();
    for (let i = 0; i < 200; i++) step(state);
    expect(state.population).toBe(10);
    state.owned.hut = 1;
    for (let i = 0; i < 40; i++) step(state);
    expect(state.population).toBe(15);
  });

  it("counts a villager as free again when a machine takes over the job", () => {
    const state = createState();
    state.population = 5;
    state.owned.forager = 5;
    expect(unemployed(state)).toBe(0);
    state.owned.autoForager = 2;
    expect(unemployed(state)).toBe(2);
  });

  it("never reports a negative number of free villagers", () => {
    const state = createState();
    state.owned.forager = 50;
    expect(unemployed(state)).toBe(0);
  });

  it("limits job purchases to the free villagers, but not machines", () => {
    const state = createState();
    expect(purchaseLimit(state, itemDef("forager"))).toBe(3);
    state.stage = 2;
    expect(purchaseLimit(state, itemDef("autoForager"))).toBe(Infinity);
  });

  it("offers houses only to a village of 25, and keeps offering them once built", () => {
    const state = createState();
    expect(isAvailable(state, itemDef("house"))).toBe(false);
    state.population = 25;
    expect(isAvailable(state, itemDef("house"))).toBe(true);
    state.population = 10;
    state.owned.house = 1;
    expect(isAvailable(state, itemDef("house"))).toBe(true);
  });

  it("adds up beds from every kind of housing", () => {
    const state = createState();
    state.owned.hut = 2;
    state.owned.house = 3;
    expect(bedsOf(state.owned)).toBe(10 + 2 * 5 + 3 * 25);
  });
});

describe("food upkeep", () => {
  /** A village of ten with one forager's worth of work, so the numbers are easy to follow. */
  function fed(): SimState {
    const state = createState();
    state.population = 10;
    state.owned.forager = 10;
    return state;
  }

  it("is zero until someone has a job", () => {
    const state = createState();
    state.population = 10;
    expect(upkeepPerSecond(state)).toBe(0);
    step(state, 1, false);
    expect(state.food).toBe(0);
    expect(state.shortfallSeconds).toBe(0);
  });

  it("is a tenth of a food per villager, working or not", () => {
    const state = fed();
    expect(upkeepPerSecond(state)).toBeCloseTo(1, 10);
    state.population = 20;
    expect(upkeepPerSecond(state)).toBeCloseTo(2, 10);
  });

  it("is cut by Rations Optimisation", () => {
    const state = fed();
    state.policies.rationsOptimisation = true;
    expect(upkeepPerSecond(state)).toBeCloseTo(0.7, 10);
  });

  it("comes out of what the village makes", () => {
    const state = fed();
    const made = ratesFor(state, state.owned, false).food;
    step(state, 1, false);
    expect(state.food).toBeCloseTo(made - 1, 10);
    expect(netFoodRate(state)).toBeCloseTo(made - 1, 10);
  });

  it("never takes food below nothing, and counts the seconds of shortfall", () => {
    const state = createState();
    state.population = 10;
    state.owned.woodcutter = 10; // eats, makes no food
    step(state, 1, false);
    expect(state.food).toBe(0);
    expect(state.shortfallSeconds).toBe(1);
    step(state, 1, false);
    expect(state.shortfallSeconds).toBe(2);
    state.food = 100;
    step(state, 1, false);
    expect(state.shortfallSeconds).toBe(0);
  });

  it("is hungry only after a few seconds, not for a blip", () => {
    const state = createState();
    state.population = 10;
    state.owned.woodcutter = 10;
    for (let i = 0; i < 4; i++) step(state, 1, false);
    expect(isHungry(state)).toBe(false);
    step(state, 1, false);
    expect(isHungry(state)).toBe(true);
  });

  it("costs morale only once the shortfall outlasts the grace period", () => {
    const grace = VILLAGE.hunger.graceSeconds;
    const state = createState();
    state.population = 10;
    state.owned.woodcutter = 10;
    state.morale = 100;
    for (let i = 0; i < grace; i++) step(state, 1, false);
    expect(state.morale).toBe(100);
    for (let i = 0; i < 10; i++) step(state, 1, false);
    expect(state.morale).toBeLessThan(100);
  });

  it("sends someone without a job away first, after a long famine", () => {
    const state = createState();
    state.population = 10;
    state.owned.woodcutter = 6; // four villagers have no job
    state.shortfallSeconds = VILLAGE.hunger.starveAfterSeconds - 1;
    step(state, 1, false);
    expect(state.population).toBe(9);
    expect(state.owned.woodcutter).toBe(6);
    expect(state.shortfallSeconds).toBe(
      VILLAGE.hunger.starveAfterSeconds - VILLAGE.hunger.leaveSeconds,
    );
  });

  it("loses a worker when there is nobody without a job, from the biggest job", () => {
    const state = createState();
    state.population = 10;
    state.owned.woodcutter = 6;
    state.owned.builder = 4;
    state.shortfallSeconds = VILLAGE.hunger.starveAfterSeconds - 1;
    step(state, 1, false);
    expect(state.population).toBe(9);
    expect(state.owned.woodcutter).toBe(5);
    expect(state.owned.builder).toBe(4);
  });

  it("does not lose a worker a machine has already replaced", () => {
    const state = createState();
    state.stage = 2;
    state.population = 4;
    state.owned.woodcutter = 4;
    state.owned.sawmillBot = 4; // all four are free; the machines do the work
    state.shortfallSeconds = VILLAGE.hunger.starveAfterSeconds - 1;
    step(state, 1, false);
    expect(state.population).toBe(3);
    expect(state.owned.woodcutter).toBe(4);
  });

  it("keeps new villagers from arriving while the village is hungry", () => {
    const state = createState();
    state.owned.woodcutter = 3;
    state.shortfallSeconds = 10;
    for (let i = 0; i < 12; i++) step(state, 1, false);
    // Nobody new came in, because there was not enough food to go round.
    expect(state.population).toBe(3);
  });

  it("lets a famine pass with no cost when hunger is switched off", () => {
    const state = createState();
    state.population = 10;
    state.owned.woodcutter = 10;
    for (let i = 0; i < 200; i++) step(state, 1, false, false);
    expect(state.population).toBe(10);
    expect(state.morale).toBeGreaterThan(90);
    expect(state.shortfallSeconds).toBe(0);
    expect(state.food).toBe(0);
  });
});

describe("storage", () => {
  it("starts with the base ceiling for food and wood, and none for infrastructure", () => {
    const state = createState();
    expect(capOf(state, "food")).toBe(STORAGE.base.food);
    expect(capOf(state, "wood")).toBe(STORAGE.base.wood);
    expect(capOf(state, "infra")).toBe(Infinity);
  });

  it("raises only its own stock, by the same amount for each unit", () => {
    const state = createState();
    const granary = itemDef("granary");
    const woodshed = itemDef("woodshed");
    state.owned.granary = 2;
    expect(capOf(state, "food")).toBe(STORAGE.base.food + 2 * (granary.stores?.amount ?? 0));
    expect(capOf(state, "wood")).toBe(STORAGE.base.wood);
    state.owned.woodshed = 1;
    expect(capOf(state, "wood")).toBe(STORAGE.base.wood + (woodshed.stores?.amount ?? 0));
  });

  it("never sits below what the dearest available purchase costs, so saving up stays possible", () => {
    const state = createState();
    state.stage = 2;
    state.owned.research = 20;
    const price = costOf(state, itemDef("research"));
    expect(price).toBeGreaterThan(STORAGE.base.food);
    expect(capOf(state, "food")).toBeGreaterThanOrEqual(price);
  });

  it("throws away what does not fit when time passes", () => {
    const state = createState();
    state.owned.forager = 10;
    state.population = 10;
    state.food = STORAGE.base.food - 1;
    step(state, 100);
    expect(state.food).toBe(STORAGE.base.food);
    expect(isFull(state, "food")).toBe(true);
  });

  it("keeps more once a granary is built", () => {
    const state = createState();
    state.owned.forager = 10;
    state.population = 10;
    state.owned.granary = 1;
    state.food = STORAGE.base.food;
    step(state, 10);
    expect(state.food).toBeGreaterThan(STORAGE.base.food);
  });

  it("leaves a stock under the ceiling alone", () => {
    const state = createState();
    state.food = 50;
    expect(clampStocks(state)).toBe(false);
    expect(state.food).toBe(50);
  });
});
