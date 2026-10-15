import { CONFIG } from "./config.ts";
import type { Currency } from "./config.ts";
import {
  bedsOf,
  buy,
  idleHands,
  isAvailable,
  isFinished,
  itemDef,
  powerDemand,
  quotePurchase,
  unemployed,
  upkeepPerSecond,
} from "./engine.ts";
import type { GameState } from "./state.ts";
import { hasUpgrade } from "./upgrades.ts";

/**
 * Standing orders (GAME-63): the player hands routine hiring to the village once stage 2 has
 * brought the upgrade. Each order is a cap ("keep 40 foragers"). Housing orders build whenever
 * beds run short.
 */

/** What can be ordered, in the order orders are filled: beds first, then jobs. */
export const ORDER_IDS = ["hut", "house", "forager", "woodcutter", "builder"] as const;
export type OrderId = (typeof ORDER_IDS)[number];

/** A cap per order. Missing or 0 means no order. */
export type Orders = Partial<Record<OrderId, number>>;

export function isOrderId(value: unknown): value is OrderId {
  return typeof value === "string" && (ORDER_IDS as readonly string[]).includes(value);
}

/** Whether the village is running any orders: the upgrade is owned and the run is still going. */
export function ordersRunning(state: GameState): boolean {
  return (
    hasUpgrade(state, "standingOrders") &&
    state.stage >= 2 &&
    state.ending === null &&
    !isFinished(state)
  );
}

/** The stock an order must leave behind: a minute of what the village eats (food) or burns (wood). */
export function reserveOf(state: GameState, currency: Currency): number {
  const perSecond =
    currency === "food" ? upkeepPerSecond(state) : currency === "wood" ? powerDemand(state) : 0;
  return Math.ceil(perSecond * CONFIG.orders.reserveSeconds);
}

/** Whether an order would buy one unit right now. */
export function orderDue(state: GameState, id: OrderId): boolean {
  const cap = state.orders[id] ?? 0;
  const def = itemDef(id);
  if (cap <= 0 || state.owned[id] >= cap || !isAvailable(state, def)) return false;
  if (def.beds !== undefined) {
    if (bedsOf(state.owned, state.upgrades) - state.population >= CONFIG.orders.freeBeds) {
      return false;
    }
  } else if (unemployed(state) - idleHands(state) < 1) {
    // Only villagers nobody has displaced: what to do with those is the player's call.
    return false;
  }
  const quote = quotePurchase(state, def, 1);
  return quote.affordable && state[def.currency] - quote.cost >= reserveOf(state, def.currency);
}

/** Whether any order has something to buy. Cheap enough to ask on every render. */
export function pendingOrders(state: GameState): boolean {
  return ordersRunning(state) && ORDER_IDS.some((id) => orderDue(state, id));
}

/** Fill the orders that are due, in place. Returns how many purchases it made. */
export function applyOrders(state: GameState): number {
  if (!ordersRunning(state)) return 0;
  let made = 0;
  while (made < CONFIG.orders.maxPerPass) {
    const id = ORDER_IDS.find((candidate) => orderDue(state, candidate));
    if (!id) break;
    buy(state, itemDef(id));
    state.drift += CONFIG.orders.driftPerPurchase;
    made += 1;
  }
  return made;
}

/**
 * Set (or with 0, clear) the cap on one order, on a copy. Returns the same state when it is not
 * allowed. The caller settles, so the order is filled at once.
 */
export function setOrder(state: GameState, id: OrderId, cap: number): GameState {
  if (!ordersRunning(state) || !Number.isInteger(cap)) return state;
  const next = Math.min(Math.max(cap, 0), CONFIG.orders.maxCap);
  if ((state.orders[id] ?? 0) === next) return state;
  const copy = structuredClone(state);
  if (next === 0) delete copy.orders[id];
  else copy.orders[id] = next;
  return copy;
}
