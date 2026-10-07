import { bulkCost, maxAffordable, milestoneMultiplier, unitCost } from "./economy.ts";

describe("unitCost", () => {
  it("is the base cost when nothing is owned", () => {
    expect(unitCost(10, 1.1, 0)).toBe(10);
  });

  it("grows geometrically with the number owned", () => {
    expect(unitCost(10, 1.1, 2)).toBeCloseTo(12.1);
  });
});

describe("bulkCost", () => {
  it("matches adding up each unit's cost one at a time", () => {
    let total = 0;
    for (let k = 3; k < 3 + 7; k++) total += unitCost(15, 1.12, k);
    expect(bulkCost(15, 1.12, 3, 7)).toBeCloseTo(total);
  });

  it("is free to buy nothing", () => {
    expect(bulkCost(15, 1.12, 3, 0)).toBe(0);
  });

  it("is linear when growth is 1", () => {
    expect(bulkCost(5, 1, 10, 4)).toBe(20);
  });
});

describe("maxAffordable", () => {
  it("buys nothing with no budget", () => {
    expect(maxAffordable(10, 1.15, 0, 0)).toBe(0);
  });

  it("buys nothing when the next unit is too expensive", () => {
    expect(maxAffordable(10, 1.15, 0, 9.99)).toBe(0);
  });

  it("returns the largest count whose total cost fits the budget", () => {
    const budget = 500;
    const n = maxAffordable(10, 1.15, 4, budget);
    expect(bulkCost(10, 1.15, 4, n)).toBeLessThanOrEqual(budget);
    expect(bulkCost(10, 1.15, 4, n + 1)).toBeGreaterThan(budget);
  });

  it("handles an exact fit", () => {
    const exact = bulkCost(10, 1.15, 0, 5);
    expect(maxAffordable(10, 1.15, 0, exact)).toBe(5);
  });

  it("is linear when growth is 1", () => {
    expect(maxAffordable(5, 1, 10, 23)).toBe(4);
  });
});

describe("milestoneMultiplier", () => {
  it("is 1 below the first threshold", () => {
    expect(milestoneMultiplier(9, [10, 25, 50], 2)).toBe(1);
  });

  it("doubles at each threshold reached", () => {
    expect(milestoneMultiplier(10, [10, 25, 50], 2)).toBe(2);
    expect(milestoneMultiplier(30, [10, 25, 50], 2)).toBe(4);
    expect(milestoneMultiplier(50, [10, 25, 50], 2)).toBe(8);
  });
});
