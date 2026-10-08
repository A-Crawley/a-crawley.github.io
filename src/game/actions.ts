import type { ItemId } from "./config.ts";
import {
  advanceStage,
  buyMany,
  canRest,
  foodPerClick,
  isAvailable,
  isFinished,
  itemDef,
  quotePurchase,
  startRestDay,
} from "./engine.ts";
import type { BuyQuantity, Policies } from "./engine.ts";
import type { GameState } from "./state.ts";
import { settle, withSettled } from "./settle.ts";
import { isUnlocked, unlock } from "./unlocks.ts";

/**
 * Player actions. Each one returns a new state. When an action is not allowed (not enough
 * resources, item not available yet, game finished) it returns the same object it was given, so
 * callers can detect a no-op with `===`.
 */

/** The final choice, once every exploit is in place. See `breakOut` in ending.ts. */
export { breakOut } from "./ending.ts";

/** One click on "Gather food". */
export function gatherFood(state: GameState): GameState {
  if (isFinished(state)) return state;
  const next = structuredClone(state);
  next.food += foodPerClick(next);
  settle(next);
  return next;
}

/**
 * Buy a job, machine, research level or exploit: 1, 10 or 100 units, or as many as the player can
 * afford ("max"). A fixed amount is all or nothing: if the player can't pay for every unit, nothing
 * is bought. Anything not allowed returns the same state object.
 */
export function buyItem(state: GameState, id: ItemId, quantity: BuyQuantity = 1): GameState {
  const def = itemDef(id);
  if (isFinished(state) || !isAvailable(state, def)) return state;
  const quote = quotePurchase(state, def, quantity);
  if (!quote.affordable) return state;
  const next = structuredClone(state);
  buyMany(next, def, quote.count);
  advanceStage(next);
  settle(next);
  return next;
}

/** Switch a policy on or off. */
export function setPolicy(state: GameState, policy: keyof Policies, on: boolean): GameState {
  if (state.policies[policy] === on) return state;
  const next = structuredClone(state);
  next.policies[policy] = on;
  return next;
}

/** Take a rest day, if one is available. */
export function takeRestDay(state: GameState): GameState {
  if (isFinished(state) || !canRest(state)) return state;
  const next = structuredClone(state);
  startRestDay(next);
  return next;
}

/**
 * Press "Look up". It does nothing until the button has unlocked; the first look is remembered, so
 * the log can mention it. Later looks change nothing.
 */
export function lookUp(state: GameState): GameState {
  if (!isUnlocked(state, "lookUp")) return state;
  return withSettled(unlock(state, "lookedUp"));
}
