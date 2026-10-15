import { applyAchievements, pendingAchievements } from "./achievements.ts";
import { applyCast, pendingCast } from "./cast.ts";
import { applyChatter, pendingChatter } from "./chatter.ts";
import { applyMilestones, pendingMilestones } from "./milestones.ts";
import { applyOrders, pendingOrders } from "./standingOrders.ts";
import { applyTargets, pendingTargets } from "./targets.ts";
import { pendingSnapshots, recordReviews } from "./review.ts";
import type { GameState } from "./state.ts";
import { applyUnlocks, pendingUnlocks } from "./unlocks.ts";

/**
 * Bring the earned-but-unrecorded things up to date: unlocks first (some achievements depend on
 * them), then achievements. Changes `state` in place, like the engine's `step`.
 */
export function settle(state: GameState): void {
  // Orders go first: what they buy can unlock things and earn achievements in the same pass.
  applyOrders(state);
  applyUnlocks(state);
  applyAchievements(state);
  applyMilestones(state);
  recordReviews(state);
  applyCast(state);
  applyChatter(state);
  applyTargets(state);
}

/** A settled copy of a state. Returns the same object if there is nothing to record. */
export function withSettled(state: GameState): GameState {
  if (
    pendingUnlocks(state).length === 0 &&
    pendingAchievements(state).length === 0 &&
    pendingMilestones(state).length === 0 &&
    pendingSnapshots(state).length === 0 &&
    !pendingCast(state) &&
    !pendingChatter(state) &&
    !pendingTargets(state) &&
    !pendingOrders(state)
  ) {
    return state;
  }
  const next = structuredClone(state);
  // Unlocks come first, so an achievement that depends on one is awarded in the same pass.
  settle(next);
  return next;
}
