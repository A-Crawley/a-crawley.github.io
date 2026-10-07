import type { ItemId } from "./config.ts";
import {
  advanceStage,
  buy,
  canAfford,
  canRest,
  foodPerClick,
  isAvailable,
  isFinished,
  itemDef,
  startRestDay,
} from "./engine.ts";
import type { Policies } from "./engine.ts";
import type { GameState } from "./state.ts";

/**
 * Player actions. Each one returns a new state. When an action is not allowed (not enough
 * resources, item not available yet, game finished) it returns the same object it was given, so
 * callers can detect a no-op with `===`.
 */

/** One click on "Gather food". */
export function gatherFood(state: GameState): GameState {
  if (isFinished(state)) return state;
  const next = structuredClone(state);
  next.food += foodPerClick(next);
  return next;
}

/** Buy one unit of a job, machine, research level or exploit. */
export function buyItem(state: GameState, id: ItemId): GameState {
  const def = itemDef(id);
  if (isFinished(state) || !isAvailable(state, def) || !canAfford(state, def)) return state;
  const next = structuredClone(state);
  buy(next, def);
  advanceStage(next);
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
