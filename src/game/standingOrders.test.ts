import { CONFIG } from "./config.ts";
import { bedsOf, costOf, isHungry, itemDef, upkeepPerSecond } from "./engine.ts";
import { catchUp } from "./offline.ts";
import { parseSave, serializeState } from "./save.ts";
import { withSettled } from "./settle.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import {
  applyOrders,
  orderDue,
  ORDER_IDS,
  ordersRunning,
  pendingOrders,
  reserveOf,
  setOrder,
} from "./standingOrders.ts";
import { tick } from "./tick.ts";
import { setStandingOrder } from "./actions.ts";

const START = 1_700_000_000_000;

/** A stage 2 village that owns the upgrade, with room and food, and nothing ordered yet. */
function village(change: (s: GameState) => void = () => {}): GameState {
  const state = createGameState(START);
  state.stage = 2;
  state.upgrades = ["standingOrders"];
  state.owned.forager = 10;
  state.owned.hut = 6;
  state.owned.granary = 40;
  state.owned.woodshed = 40;
  state.population = 20;
  state.food = 5_000;
  state.wood = 5_000;
  state.events.nextAt = 1e9; // far off, and finite so the state can be saved
  state.targets.offered = 3;
  state.targets.results = [
    { kind: "declined", met: false },
    { kind: "declined", met: false },
    { kind: "declined", met: false },
  ];
  state.time = 500;
  change(state);
  return state;
}

describe("whether orders run", () => {
  it("needs the upgrade, and stage 2 or later", () => {
    expect(ordersRunning(village())).toBe(true);
    expect(ordersRunning(village((s) => (s.upgrades = [])))).toBe(false);
    expect(ordersRunning(village((s) => (s.stage = 1)))).toBe(false);
  });

  it("does nothing without the upgrade, even with caps in the save", () => {
    const state = village((s) => {
      s.upgrades = [];
      s.orders = { forager: 50 };
    });
    expect(pendingOrders(state)).toBe(false);
    const next = withSettled(state);
    expect(next.owned).toEqual(state.owned);
    expect(next.drift).toBe(state.drift);
  });
});

describe("job orders", () => {
  it("hire a new arrival while below the cap", () => {
    const state = village((s) => {
      s.orders = { forager: 12 };
      s.population = 11; // one villager with no job
    });
    expect(orderDue(state, "forager")).toBe(true);
    const next = withSettled(state);
    expect(next.owned.forager).toBe(11);
  });

  it("stop at the cap", () => {
    const state = village((s) => {
      s.orders = { forager: 10 };
      s.population = 15;
    });
    expect(orderDue(state, "forager")).toBe(false);
    expect(withSettled(state).owned.forager).toBe(10);
  });

  it("wait for a villager to do the job", () => {
    const state = village((s) => {
      s.orders = { woodcutter: 5 };
      s.population = 10; // every villager already has a job
    });
    expect(orderDue(state, "woodcutter")).toBe(false);
  });

  it("leave villagers a machine displaced for the player to place", () => {
    const state = village((s) => {
      s.orders = { forager: 30 };
      s.owned.autoForager = 3;
      s.population = 10; // three of the ten foragers have been displaced
    });
    expect(orderDue(state, "forager")).toBe(false);
  });

  it("buy as much as the cap and the arrivals allow in one pass", () => {
    const state = village((s) => {
      s.orders = { forager: 18 };
      s.population = 20;
    });
    const made = applyOrders(state);
    expect(made).toBe(8);
    expect(state.owned.forager).toBe(18);
  });
});

describe("housing orders", () => {
  it("build a hut when fewer than two beds are free, and not before", () => {
    const roomy = village((s) => {
      s.orders = { hut: 10 };
      s.population = bedsOf(s.owned) - CONFIG.orders.freeBeds;
    });
    expect(orderDue(roomy, "hut")).toBe(false);
    const tight = village((s) => {
      s.orders = { hut: 10 };
      s.population = bedsOf(s.owned) - CONFIG.orders.freeBeds + 1;
    });
    expect(orderDue(tight, "hut")).toBe(true);
    const next = withSettled(tight);
    expect(next.owned.hut).toBe(7);
    expect(bedsOf(next.owned) - next.population).toBeGreaterThanOrEqual(CONFIG.orders.freeBeds);
  });

  it("respect the cap", () => {
    const state = village((s) => {
      s.orders = { hut: 6 };
      s.population = bedsOf(s.owned);
    });
    expect(orderDue(state, "hut")).toBe(false);
  });
});

describe("priorities and cost", () => {
  it("fill housing before jobs", () => {
    expect(ORDER_IDS.indexOf("hut")).toBeLessThan(ORDER_IDS.indexOf("forager"));
    const state = village((s) => {
      s.orders = { hut: 7, forager: 11 };
    });
    state.population = bedsOf(state.owned); // beds full, and a villager with no job
    const hut = itemDef("hut");
    const forager = itemDef("forager");
    // Enough for the hut and the reserve, but not for the forager as well.
    state.food = costOf(state, hut) + reserveOf(state, "food") + costOf(state, forager) / 2;
    applyOrders(state);
    expect(state.owned.hut).toBe(7);
    expect(state.owned.forager).toBe(10);
  });

  it("do not buy what cannot be paid for", () => {
    const state = village((s) => {
      s.orders = { forager: 12 };
      s.population = 12;
      s.food = 1;
    });
    expect(applyOrders(state)).toBe(0);
  });

  it("each purchase nudges the drift towards efficiency", () => {
    const state = village((s) => {
      s.orders = { forager: 12 };
      s.population = 12;
    });
    const before = state.drift;
    const made = applyOrders(state);
    expect(made).toBe(2);
    expect(state.drift).toBe(before + 2 * CONFIG.orders.driftPerPurchase);
    expect(CONFIG.orders.driftPerPurchase).toBeLessThan(0);
  });
});

describe("the reserve", () => {
  it("is a minute of upkeep in food, and a minute of the machines' burn in wood", () => {
    const state = village((s) => (s.owned.autoForager = 2));
    expect(reserveOf(state, "food")).toBe(Math.ceil(upkeepPerSecond(state) * 60));
    expect(reserveOf(state, "wood")).toBeGreaterThan(0);
    expect(reserveOf(state, "infra")).toBe(0);
  });

  it("is never spent: an order leaves the reserve in the store", () => {
    const probe = village();
    const reserve = reserveOf(probe, "food");
    const state = village((s) => {
      s.orders = { forager: 40 };
      s.population = 40;
      s.food = reserve + 30; // a forager costs more than the 30 over the reserve
    });
    applyOrders(state);
    expect(state.food).toBeGreaterThanOrEqual(reserve);
    expect(state.owned.forager).toBe(10);
  });

  it("cannot cause hunger: a long run of orders never leaves the village hungry", () => {
    const state = village((s) => {
      s.orders = { forager: 60, woodcutter: 30, hut: 30 };
      s.food = 400;
      s.population = 24;
    });
    let now = START;
    let current = state;
    for (let i = 0; i < 600; i++) {
      now += 1000;
      current = tick(current, now);
      expect(isHungry(current)).toBe(false);
    }
    expect(current.owned.forager + current.owned.woodcutter).toBeGreaterThan(10);
  });
});

describe("setting orders", () => {
  it("sets, changes and clears a cap", () => {
    let state = village();
    state = setOrder(state, "forager", 20);
    expect(state.orders.forager).toBe(20);
    state = setOrder(state, "forager", 25);
    expect(state.orders.forager).toBe(25);
    state = setOrder(state, "forager", 0);
    expect(state.orders).toEqual({});
  });

  it("keeps the cap in range, and returns the same state for a no-op", () => {
    const state = village();
    expect(setOrder(state, "forager", 0)).toBe(state);
    expect(setOrder(state, "forager", 1.5)).toBe(state);
    expect(setOrder(state, "forager", 9999).orders.forager).toBe(CONFIG.orders.maxCap);
    expect(setOrder(state, "forager", -4)).toBe(state);
  });

  it("is refused without the upgrade, and does not change the old state", () => {
    const none = village((s) => (s.upgrades = []));
    expect(setOrder(none, "forager", 5)).toBe(none);
    const state = village();
    setOrder(state, "forager", 5);
    expect(state.orders).toEqual({});
  });

  it("fills a due order at once through the action", () => {
    const state = village((s) => (s.population = 12));
    const next = setStandingOrder(state, "forager", 12);
    expect(next.owned.forager).toBe(12);
  });
});

describe("while away", () => {
  it("orders keep working at the away rate, and the reserve still holds", () => {
    const state = village((s) => {
      s.orders = { forager: 60, hut: 20 };
      s.population = 22;
      s.lastTickAt = START;
    });
    const { state: after } = catchUp(state, START + 30 * 60 * 1000);
    expect(after.owned.forager).toBeGreaterThan(state.owned.forager);
    expect(after.food).toBeGreaterThanOrEqual(0);
  });
});

describe("saves", () => {
  it("round-trips orders", () => {
    const state = village((s) => (s.orders = { forager: 12, hut: 9 }));
    const result = parseSave(serializeState(state));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.orders).toEqual({ forager: 12, hut: 9 });
  });

  it("migrates a version 21 save to no orders", () => {
    const old = JSON.parse(serializeState(village())) as Record<string, unknown>;
    delete old.orders;
    old.version = 21;
    const result = parseSave(JSON.stringify(old));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.orders).toEqual({});
  });

  it("rejects an unknown order, a bad cap, or a missing field", () => {
    const base = JSON.parse(serializeState(village())) as Record<string, unknown>;
    for (const orders of [{ exploit: 3 }, { forager: 0 }, { forager: 1.5 }, { forager: 9999 }, 4]) {
      expect(parseSave(JSON.stringify({ ...base, orders })).ok).toBe(false);
    }
    const without = { ...base };
    delete without.orders;
    expect(parseSave(JSON.stringify(without)).ok).toBe(false);
  });
});
