import { CONFIG } from "./config.ts";
import { capOf } from "./engine.ts";
import {
  exchangeNote,
  marketOffered,
  quoteTrade,
  trade,
  tradeRate,
  tradeReason,
} from "./market.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { step } from "./engine.ts";
import { withSettled } from "./settle.ts";

const START = 1_700_000_000_000;

function village(change: (s: GameState) => void = () => {}): GameState {
  const state = createGameState(START);
  state.owned.woodcutter = 2;
  state.population = 5;
  state.events.nextAt = Infinity;
  change(state);
  return state;
}

describe("when the Exchange opens", () => {
  it("is closed with nothing stored, and with wood out of play", () => {
    expect(marketOffered(createGameState(START))).toBe(false);
    const noWood = createGameState(START);
    noWood.food = capOf(noWood, "food");
    expect(marketOffered(noWood)).toBe(false);
  });

  it("opens once wood is in play and a store is nearly full", () => {
    const state = village();
    expect(marketOffered(state)).toBe(false);
    state.wood = capOf(state, "wood") * CONFIG.market.revealAt;
    expect(marketOffered(state)).toBe(true);
    const foodFull = village((s) => (s.food = capOf(s, "food")));
    expect(marketOffered(foodFull)).toBe(true);
  });

  it("is revealed (and logged) by settling, then stays open", () => {
    const state = withSettled(village((s) => (s.wood = capOf(s, "wood"))));
    expect(state.unlocked).toContain("market");
    state.wood = 0;
    expect(withSettled(state).unlocked).toContain("market");
  });
});

describe("a trade", () => {
  it("sells a lot of wood for less food, after the fee", () => {
    const state = village((s) => (s.wood = capOf(s, "wood")));
    const lot = Math.floor(capOf(state, "wood") * CONFIG.market.lotFraction);
    const quote = quoteTrade(state, "woodForFood");
    expect(quote).toMatchObject({ giveAmount: lot, give: "wood", get: "food", possible: true });
    expect(quote.getAmount).toBe(Math.floor(lot * (1 - CONFIG.market.fee)));
    const after = trade(state, "woodForFood");
    expect(after.wood).toBe(state.wood - lot);
    expect(after.food).toBe(state.food + quote.getAmount);
  });

  it("leaves the state alone when it cannot happen", () => {
    const state = village();
    expect(trade(state, "woodForFood")).toBe(state);
    expect(tradeReason(state, "woodForFood")).toBe("Not enough wood to trade.");
  });

  it("does not change the state it is given", () => {
    const state = village((s) => (s.wood = 150));
    const copy = structuredClone(state);
    trade(state, "woodForFood");
    expect(state).toEqual(copy);
  });

  it("keeps a floor of food for the village", () => {
    const state = village((s) => {
      s.food = capOf(s, "food") * CONFIG.market.foodFloor;
    });
    expect(quoteTrade(state, "foodForWood").possible).toBe(false);
    expect(tradeReason(state, "foodForWood")).toBe("Keep some food for the village.");
    state.food += 5;
    expect(quoteTrade(state, "foodForWood")).toMatchObject({ possible: true, giveAmount: 5 });
  });

  it("never sells more than the other store has room for", () => {
    const state = village((s) => {
      s.wood = capOf(s, "wood");
      s.food = capOf(s, "food") - 3;
    });
    const quote = quoteTrade(state, "woodForFood");
    expect(quote.getAmount).toBeLessThanOrEqual(3);
    const after = trade(state, "woodForFood");
    expect(after.food).toBeLessThanOrEqual(capOf(after, "food"));
    const full = village((s) => {
      s.wood = capOf(s, "wood");
      s.food = capOf(s, "food");
    });
    expect(tradeReason(full, "woodForFood")).toBe("The food store is full.");
  });

  it("is not possible once the run is over", () => {
    const state = village((s) => {
      s.wood = 150;
      s.ending = "conquest";
    });
    expect(quoteTrade(state, "woodForFood").possible).toBe(false);
  });

  it("never touches infrastructure", () => {
    const state = village((s) => (s.wood = capOf(s, "wood")));
    expect(trade(state, "woodForFood").infra).toBe(state.infra);
  });
});

describe("the rate", () => {
  it("worsens with each trade and recovers while nobody trades", () => {
    let state = village((s) => (s.wood = capOf(s, "wood")));
    const fresh = tradeRate(state);
    expect(fresh).toBeCloseTo(1 - CONFIG.market.fee, 6);
    state = trade(state, "woodForFood");
    const worn = tradeRate(state);
    expect(worn).toBeLessThan(fresh);
    expect(exchangeNote(state)).toContain("worn");
    const rested = structuredClone(state);
    for (let i = 0; i < 480; i++) step(rested, 1, false, false);
    expect(rested.marketStrain).toBe(0);
    expect(tradeRate(rested)).toBeCloseTo(fresh, 6);
  });

  it("strains less for a part lot", () => {
    const full = trade(
      village((s) => (s.wood = capOf(s, "wood"))),
      "woodForFood",
    );
    const part = trade(
      village((s) => (s.wood = 8)),
      "woodForFood",
    );
    expect(part.marketStrain).toBeGreaterThan(0);
    expect(part.marketStrain).toBeLessThan(full.marketStrain);
  });
});

describe("no profitable loop", () => {
  it("loses at least half of the value going round once", () => {
    let state = village((s) => {
      s.wood = 190;
      s.food = capOf(s, "food") * 0.5;
    });
    const start = state.wood;
    state = trade(state, "woodForFood");
    const food = state.food;
    // Bring the food back to wood in the same way.
    let woodBack = 0;
    for (let i = 0; i < 20; i++) {
      const before = state.wood;
      state = trade(state, "foodForWood");
      woodBack += state.wood - before;
      if (state.food - 1 < capOf(state, "food") * CONFIG.market.foodFloor) break;
    }
    expect(food).toBeGreaterThan(0);
    expect(woodBack).toBeLessThan(start / 2);
  });

  it("caps how much a player can convert in an hour, even trading constantly", () => {
    let state = village();
    let received = 0;
    for (let second = 0; second < 3600; second++) {
      state.wood = capOf(state, "wood");
      state.food = capOf(state, "food") * 0.3;
      const before = state.food;
      state = trade(state, "woodForFood");
      received += state.food - before;
      step(state, 1, false, false);
    }
    // At most about one store's worth of food every few minutes, at a poor rate.
    expect(received).toBeLessThan(capOf(state, "food") * 6);
  });
});
