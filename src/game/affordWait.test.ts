import { waitCaption, secondsUntilAffordable } from "./affordWait.ts";
import { ITEMS } from "./config.ts";
import type { ItemId } from "./config.ts";
import { capOf, netFoodRate, quotePurchase, ratesFor } from "./engine.ts";
import { formatWait } from "./format.ts";
import { createGameState } from "./state.ts";

const def = (id: ItemId) => {
  const found = ITEMS.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
};

function stateWith(change: (s: ReturnType<typeof createGameState>) => void) {
  const state = createGameState(0);
  change(state);
  return state;
}

describe("secondsUntilAffordable", () => {
  it("is covered when the player can already pay", () => {
    const state = stateWith((s) => {
      s.food = 100;
    });
    const forager = def("forager");
    expect(secondsUntilAffordable(state, forager, quotePurchase(state, forager, 1))).toEqual({
      kind: "covered",
    });
  });

  it("works out the wait from the missing amount and the net rate", () => {
    const state = stateWith((s) => {
      s.owned.forager = 10;
      s.population = 40;
      s.food = 0;
    });
    const hut = def("hut");
    const quote = quotePurchase(state, hut, 1);
    const rate = netFoodRate(state);
    expect(rate).toBeGreaterThan(0);
    const wait = secondsUntilAffordable(state, hut, quote);
    expect(wait.kind).toBe("wait");
    if (wait.kind === "wait") expect(wait.seconds).toBeCloseTo(quote.cost / rate, 6);
  });

  it("counts only what is still missing", () => {
    const state = stateWith((s) => {
      s.owned.forager = 10;
      s.population = 40;
      s.food = 0;
    });
    const hut = def("hut");
    const quote = quotePurchase(state, hut, 1);
    const far = secondsUntilAffordable(state, hut, quote);
    state.food = quote.cost / 2;
    const near = secondsUntilAffordable(state, hut, quote);
    expect(far.kind === "wait" && near.kind === "wait" && near.seconds < far.seconds).toBe(true);
  });

  it("says stalled when the net rate is zero", () => {
    const state = stateWith((s) => {
      s.food = 0;
    });
    const forager = def("forager");
    expect(netFoodRate(state)).toBe(0);
    expect(secondsUntilAffordable(state, forager, quotePurchase(state, forager, 1))).toEqual({
      kind: "stalled",
    });
  });

  it("says stalled when the village eats more than it makes", () => {
    const state = stateWith((s) => {
      s.owned.forager = 1;
      s.population = 200;
      s.food = 0;
    });
    const forager = def("forager");
    expect(netFoodRate(state)).toBeLessThan(0);
    expect(secondsUntilAffordable(state, forager, quotePurchase(state, forager, 10)).kind).toBe(
      "stalled",
    );
  });

  it("says a bigger store is needed when the cost is over the ceiling", () => {
    const state = stateWith((s) => {
      s.owned.forager = 10;
      s.population = 40;
    });
    const forager = def("forager");
    const quote = { count: 100, cost: capOf(state, "food") * 2, affordable: false };
    expect(secondsUntilAffordable(state, forager, quote)).toEqual({ kind: "bigger-store" });
  });

  it("uses the price of the selected quantity, and of the next unit for Max", () => {
    const state = stateWith((s) => {
      s.owned.forager = 10;
      s.population = 20;
      s.food = 0;
    });
    const forager = def("forager");
    const one = secondsUntilAffordable(state, forager, quotePurchase(state, forager, 1));
    const ten = secondsUntilAffordable(state, forager, quotePurchase(state, forager, 10));
    const max = secondsUntilAffordable(state, forager, quotePurchase(state, forager, "max"));
    expect(one.kind).toBe("wait");
    expect(ten.kind === "wait" || ten.kind === "bigger-store").toBe(true);
    if (one.kind === "wait" && ten.kind === "wait")
      expect(ten.seconds).toBeGreaterThan(one.seconds);
    expect(max).toEqual(one);
    const hundred = secondsUntilAffordable(state, forager, quotePurchase(state, forager, 100));
    expect(hundred.kind === "wait" || hundred.kind === "bigger-store").toBe(true);
  });

  it("uses wood and infrastructure rates for items bought with them", () => {
    const state = stateWith((s) => {
      s.stage = 2;
      s.owned.woodcutter = 10;
      s.owned.builder = 5;
      s.population = 40;
      s.wood = 0;
      s.infra = 0;
    });
    const rates = ratesFor(state, state.owned, false);
    const wood = def("granary");
    const woodWait = secondsUntilAffordable(state, wood, quotePurchase(state, wood, 1));
    expect(woodWait.kind).toBe("wait");
    if (woodWait.kind === "wait") {
      expect(woodWait.seconds).toBeCloseTo(quotePurchase(state, wood, 1).cost / rates.wood, 6);
    }
  });

  it("is covered when only a limit, not money, stops the purchase", () => {
    const state = stateWith((s) => {
      s.food = 1000;
      s.population = 3;
    });
    const forager = def("forager");
    const quote = { ...quotePurchase(state, forager, 1), affordable: false };
    expect(secondsUntilAffordable(state, forager, quote)).toEqual({ kind: "covered" });
  });
});

describe("waitCaption", () => {
  it("phrases each case, and says nothing when covered", () => {
    expect(waitCaption({ kind: "covered" })).toBeNull();
    expect(waitCaption({ kind: "wait", seconds: 130 })).toBe("ready in 2m 10s");
    expect(waitCaption({ kind: "bigger-store" })).toBe("needs more storage");
    expect(waitCaption({ kind: "stalled" })).toBe("not at this rate");
  });
});

describe("formatWait", () => {
  it("is to the second when short, rounds up, and drops seconds past an hour", () => {
    expect(formatWait(0.2)).toBe("1s");
    expect(formatWait(45)).toBe("45s");
    expect(formatWait(130)).toBe("2m 10s");
    expect(formatWait(130.2)).toBe("2m 11s");
    expect(formatWait(3900)).toBe("1h 5m");
    expect(formatWait(0)).toBe("0s");
    expect(formatWait(Infinity)).toBe("0s");
  });
});
