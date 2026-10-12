import type { ItemDef } from "./config.ts";
import { capOf, netFoodRate, ratesFor } from "./engine.ts";
import type { PurchaseQuote, SimState } from "./engine.ts";
import { formatWait } from "./format.ts";

/**
 * What stands between the player and a purchase they cannot afford yet. The UI phrases it, so
 * this stays plain data.
 */
export type AffordWait =
  /** The cost is covered. Anything still blocking it (nobody free, a goal reached) is not about money. */
  | { kind: "covered" }
  /** Affordable after this many seconds at the current rate. */
  | { kind: "wait"; seconds: number }
  /** The cost is more than the store can hold, so waiting will never be enough. */
  | { kind: "bigger-store" }
  /** The stock is not growing, so there is nothing to wait for at the current rate. */
  | { kind: "stalled" };

/** The rate a currency is gaining at: food net of what the village eats. Clicks are not counted. */
function netRate(state: SimState, currency: ItemDef["currency"]): number {
  if (currency === "food") return netFoodRate(state);
  return ratesFor(state, state.owned, false)[currency];
}

/**
 * How long until the player can afford `quote`, at today's rate. `quote` is the purchase as shown
 * (the selected quantity; for Max, the next single unit). Items cost one currency each, so there is
 * one wait to work out; if an item ever costs several, the longest wait is the answer.
 */
export function secondsUntilAffordable(
  state: SimState,
  def: ItemDef,
  quote: PurchaseQuote,
): AffordWait {
  const missing = quote.cost - state[def.currency];
  if (missing <= 0) return { kind: "covered" };
  if (quote.cost > capOf(state, def.currency)) return { kind: "bigger-store" };
  const rate = netRate(state, def.currency);
  if (!(rate > 0)) return { kind: "stalled" };
  return { kind: "wait", seconds: missing / rate };
}

/** The short dry caption for a shop row, or null when there is nothing to say. */
export function waitCaption(wait: AffordWait): string | null {
  switch (wait.kind) {
    case "covered":
      return null;
    case "wait":
      return `ready in ${formatWait(wait.seconds)}`;
    case "bigger-store":
      return "needs more storage";
    case "stalled":
      return "not at this rate";
  }
}
