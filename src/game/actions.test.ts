import { CONFIG } from "./config.ts";
import { bedsOf, startRestDay, unemployed } from "./engine.ts";
import { buyItem, gatherFood, lookUp, setPolicy, takeRestDay } from "./actions.ts";
import { createGameState } from "./state.ts";
import { withUnlocks } from "./unlocks.ts";

const fresh = () => createGameState(0);

/** A fresh game whose village already has plenty of people, so jobs are not limited by headcount. */
function withVillagers(population: number) {
  const state = createGameState(0);
  state.population = population;
  return state;
}

describe("gatherFood", () => {
  it("adds one click of food and leaves the original alone", () => {
    const state = fresh();
    const next = gatherFood(state);
    expect(next.food).toBe(CONFIG.clickValue);
    expect(state.food).toBe(0);
  });

  it("gives less food when morale is low", () => {
    const state = fresh();
    state.morale = 0;
    expect(gatherFood(state).food).toBeCloseTo(CONFIG.clickValue * CONFIG.morale.outputFloor);
  });

  it("gives nothing on a rest day", () => {
    const state = fresh();
    startRestDay(state);
    expect(gatherFood(state).food).toBe(0);
  });
});

describe("buyItem", () => {
  it("does nothing without enough resources", () => {
    const state = fresh();
    state.food = 9;
    expect(buyItem(state, "forager")).toBe(state);
  });

  it("buys a unit and pays for it", () => {
    const state = fresh();
    state.food = 25;
    const next = buyItem(state, "forager");
    expect(next).not.toBe(state);
    expect(next.owned.forager).toBe(1);
    expect(next.food).toBe(15);
    expect(state.owned.forager).toBe(0);
  });

  it("raises the price of the next unit", () => {
    let state = fresh();
    state.food = 1000;
    state = buyItem(state, "forager");
    const afterFirst = state.food;
    state = buyItem(state, "forager");
    expect(afterFirst - state.food).toBeCloseTo(10 * 1.12);
  });

  it("will not sell something that is not available in the current stage", () => {
    const state = fresh();
    state.wood = 1e6;
    state.food = 1e6;
    expect(buyItem(state, "sawmillBot")).toBe(state);
    expect(buyItem(state, "research")).toBe(state);
    expect(buyItem(state, "exploit")).toBe(state);
  });

  it("moves to stage 3 when the last research level is bought", () => {
    const state = fresh();
    state.stage = 2;
    state.food = 1e9;
    state.infra = 777;
    state.owned.research = CONFIG.researchLevels - 1;
    const next = buyItem(state, "research");
    expect(next.stage).toBe(3);
    expect(next.infra).toBe(0);
  });
});

describe("setPolicy", () => {
  it("switches a policy on and off", () => {
    const on = setPolicy(fresh(), "extendedShifts", true);
    expect(on.policies.extendedShifts).toBe(true);
    expect(setPolicy(on, "extendedShifts", false).policies.extendedShifts).toBe(false);
  });

  it("does nothing when the policy is already in that state", () => {
    const state = fresh();
    expect(setPolicy(state, "rationsOptimisation", false)).toBe(state);
  });
});

describe("takeRestDay", () => {
  it("starts a rest day and then refuses another until the cooldown ends", () => {
    const state = fresh();
    const rested = takeRestDay(state);
    expect(rested).not.toBe(state);
    expect(rested.restUntil).toBeGreaterThan(0);
    expect(takeRestDay(rested)).toBe(rested);
  });
});

describe("a finished game", () => {
  it("ignores every action", () => {
    const state = fresh();
    state.stage = 3;
    state.owned.exploit = CONFIG.exploitsGoal;
    state.food = 1e6;
    expect(gatherFood(state)).toBe(state);
    expect(buyItem(state, "forager")).toBe(state);
    expect(takeRestDay(state)).toBe(state);
  });
});

describe("buyItem with a quantity", () => {
  it("buys exactly ten when ten are affordable", () => {
    const state = withVillagers(100);
    state.food = 1000;
    const next = buyItem(state, "forager", 10);
    expect(next.owned.forager).toBe(10);
    expect(next.food).toBeLessThan(1000 - 10 * 10);
    expect(state.owned.forager).toBe(0);
  });

  it("is all or nothing for a fixed amount", () => {
    const state = withVillagers(100);
    state.food = 100; // enough for several, not ten
    expect(buyItem(state, "forager", 10)).toBe(state);
  });

  it("buys as many as it can with max", () => {
    const state = withVillagers(100);
    state.food = 100;
    const next = buyItem(state, "forager", "max");
    expect(next.owned.forager).toBe(6);
    expect(next.food).toBeGreaterThanOrEqual(0);
    expect(next.food).toBeLessThan(state.food);
  });

  it("does nothing with max when nothing is affordable", () => {
    const state = withVillagers(100);
    state.food = 3;
    expect(buyItem(state, "forager", "max")).toBe(state);
  });

  it("gives the same result as buying one at a time", () => {
    const bulk = withVillagers(100);
    bulk.food = 500;
    const single = structuredClone(bulk);
    const bought = buyItem(bulk, "forager", 10);
    let stepwise = single;
    for (let i = 0; i < 10; i++) stepwise = buyItem(stepwise, "forager");
    expect(bought.owned.forager).toBe(stepwise.owned.forager);
    expect(bought.food).toBeCloseTo(stepwise.food, 6);
  });

  it("still blocks items that are not available in the current stage", () => {
    const state = withVillagers(100);
    state.food = 1e9;
    expect(buyItem(state, "autoForager", "max")).toBe(state);
  });

  it("advances the stage when a bulk purchase reaches the research goal", () => {
    const state = withVillagers(100);
    state.stage = 2;
    state.food = 1e12;
    state.owned.research = CONFIG.researchLevels - 2;
    const next = buyItem(state, "research", "max");
    expect(next.owned.research).toBe(CONFIG.researchLevels);
    expect(next.stage).toBe(3);
  });
});

describe("unlocking while playing", () => {
  it("unlocks the first job when a click brings enough food", () => {
    let state = fresh();
    state.food = 4.5;
    expect(state.unlocked).toEqual([]);
    state = gatherFood(state);
    expect(state.unlocked).toContain("item:forager");
  });

  it("unlocks what a purchase earns, such as morale after the first hire", () => {
    const state = withVillagers(100);
    state.food = 10;
    const next = buyItem(state, "forager");
    expect(next.unlocked).toContain("morale");
    expect(state.unlocked).toEqual([]);
  });

  it("keeps an item on offer after the food that revealed it is spent", () => {
    const state = withVillagers(100);
    state.food = 25;
    state.owned.forager = 1;
    let next = withUnlocks(state);
    expect(next.unlocked).toContain("item:woodcutter");
    next = buyItem(next, "forager", 1);
    expect(next.food).toBeLessThan(20);
    expect(next.unlocked).toContain("item:woodcutter");
  });
});

describe("lookUp", () => {
  it("does nothing while the button is still locked", () => {
    const state = withVillagers(100);
    expect(lookUp(state)).toBe(state);
  });

  it("records the first look once the button works, and ignores later looks", () => {
    const state = withVillagers(100);
    state.owned.forager = 5;
    const ready = withUnlocks(state);
    const looked = lookUp(ready);
    expect(looked.unlocked).toContain("lookedUp");
    expect(ready.unlocked).not.toContain("lookedUp");
    expect(lookUp(looked)).toBe(looked);
  });
});

describe("hiring needs a free villager", () => {
  it("hires only as many as there are people without a job", () => {
    const state = withVillagers(4);
    state.food = 1e6;
    const next = buyItem(state, "forager", "max");
    expect(next.owned.forager).toBe(4);
    expect(buyItem(next, "forager")).toBe(next);
  });

  it("refuses a fixed amount bigger than the free villagers", () => {
    const state = withVillagers(5);
    state.food = 1e6;
    expect(buyItem(state, "forager", 10)).toBe(state);
  });

  it("does not limit machines, which take over a job", () => {
    const state = withVillagers(0);
    state.stage = 2;
    state.owned.forager = 5;
    state.food = 1e9;
    expect(buyItem(state, "autoForager", 10).owned.autoForager).toBe(10);
  });

  it("frees villagers again when machines take their jobs", () => {
    const state = withVillagers(10);
    state.stage = 2;
    state.owned.forager = 10;
    state.food = 1e9;
    expect(unemployed(state)).toBe(0);
    const next = buyItem(state, "autoForager", 10);
    expect(unemployed(next)).toBe(10);
    expect(buyItem(next, "forager", 10).owned.forager).toBe(20);
  });
});

describe("housing", () => {
  it("is bought like anything else and adds beds", () => {
    const state = withVillagers(10);
    state.food = 1e6;
    const next = buyItem(state, "hut");
    expect(next.owned.hut).toBe(1);
    expect(bedsOf(next.owned)).toBe(bedsOf(state.owned) + 5);
  });

  it("needs a village of 25 before houses are offered", () => {
    const state = withVillagers(10);
    state.wood = 1e6;
    expect(buyItem(state, "house")).toBe(state);
    state.population = 25;
    expect(buyItem(state, "house").owned.house).toBe(1);
  });
});
