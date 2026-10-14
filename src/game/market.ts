import { CONFIG } from "./config.ts";
import { capOf, isFinished } from "./engine.ts";
import { settle } from "./settle.ts";
import type { GameState } from "./state.ts";

/**
 * The Exchange: swap food for wood or wood for food, at a loss. Infrastructure is deliberately not
 * for sale, so trade can never shorten Project Horizon. Each trade strains the rate, which eases
 * back while nobody trades, so there is no profitable loop.
 */

export type Trade = "woodForFood" | "foodForWood";

export const TRADES: readonly Trade[] = ["woodForFood", "foodForWood"];

const SIDES = {
  woodForFood: { give: "wood", get: "food" },
  foodForWood: { give: "food", get: "wood" },
} as const;

export interface TradeQuote {
  give: "food" | "wood";
  get: "food" | "wood";
  /** Whole units sold and received for one lot (zero when the trade is not possible). */
  giveAmount: number;
  getAmount: number;
  /** What the seller gets per unit sold right now, from 0 to 1. */
  rate: number;
  possible: boolean;
}

/** What one unit sells for right now: the fee, then the strain on top of it. */
export function tradeRate(state: GameState): number {
  const { market } = CONFIG;
  return (1 - market.fee) / (1 + state.marketStrain);
}

/** The Exchange opens once wood is in play and one of the stores is nearly full. */
export function marketOffered(state: GameState): boolean {
  if (state.wood <= 0 && state.owned.woodcutter === 0) return false;
  const { revealAt } = CONFIG.market;
  return (
    state.food >= capOf(state, "food") * revealAt || state.wood >= capOf(state, "wood") * revealAt
  );
}

/** One lot of a trade: what would be sold and received now. Whole numbers only. */
export function quoteTrade(state: GameState, trade: Trade): TradeQuote {
  const { give, get } = SIDES[trade];
  const { market } = CONFIG;
  const rate = tradeRate(state);
  const none: TradeQuote = { give, get, giveAmount: 0, getAmount: 0, rate, possible: false };
  if (isFinished(state) || state.ending !== null) return none;
  const lot = Math.floor(capOf(state, give) * market.lotFraction);
  const floor = give === "food" ? capOf(state, "food") * market.foodFloor : 0;
  let giveAmount = Math.min(lot, Math.floor(state[give] - floor));
  // Never sell more than the other store has room for.
  const room = Math.floor(capOf(state, get) - state[get]);
  giveAmount = Math.min(giveAmount, Math.floor(room / rate));
  if (giveAmount < 1) return none;
  const getAmount = Math.floor(giveAmount * rate);
  if (getAmount < 1) return none;
  return { give, get, giveAmount, getAmount, rate, possible: true };
}

/**
 * Make one trade. Returns the same state if it is not possible. A full lot adds `strainPerLot` of
 * strain; a part lot adds its share, so small trades near a full store are not penalised.
 */
export function trade(state: GameState, which: Trade): GameState {
  const quote = quoteTrade(state, which);
  if (!quote.possible) return state;
  const next = structuredClone(state);
  const lot = Math.max(1, Math.floor(capOf(next, quote.give) * CONFIG.market.lotFraction));
  next[quote.give] -= quote.giveAmount;
  next[quote.get] += quote.getAmount;
  next.marketStrain += CONFIG.market.strainPerLot * (quote.giveAmount / lot);
  settle(next);
  return next;
}

/** Why a trade cannot be made right now, in words, or null when it can. */
export function tradeReason(state: GameState, which: Trade): string | null {
  const quote = quoteTrade(state, which);
  if (quote.possible) return null;
  const { give, get } = quote;
  if (isFinished(state) || state.ending !== null) return "Nothing more to trade.";
  if (capOf(state, get) - state[get] < 1) return `The ${get} store is full.`;
  if (give === "food") return "Keep some food for the village.";
  return "Not enough wood to trade.";
}

/** The rate in words: what the seller keeps, and whether recent trades have worn it. */
export function exchangeNote(state: GameState): string {
  const percent = Math.round(tradeRate(state) * 100);
  const worn = state.marketStrain >= 0.05;
  return worn
    ? `You get ${percent}% of what you sell. Recent trades have worn the rate; it recovers if you stop.`
    : `You get ${percent}% of what you sell, after the handling fee. Every trade worsens the rate.`;
}
