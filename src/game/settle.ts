import { applyAchievements, pendingAchievements } from "./achievements.ts";
import { pendingSnapshots, recordReviews } from "./review.ts";
import type { GameState } from "./state.ts";
import { applyUnlocks, pendingUnlocks } from "./unlocks.ts";

/**
 * Bring the earned-but-unrecorded things up to date: unlocks first (some achievements depend on
 * them), then achievements. Changes `state` in place, like the engine's `step`.
 */
export function settle(state: GameState): void {
  applyUnlocks(state);
  applyAchievements(state);
  recordReviews(state);
}

/** A settled copy of a state. Returns the same object if there is nothing to record. */
export function withSettled(state: GameState): GameState {
  if (
    pendingUnlocks(state).length === 0 &&
    pendingAchievements(state).length === 0 &&
    pendingSnapshots(state).length === 0
  ) {
    return state;
  }
  const next = structuredClone(state);
  // Unlocks come first, so an achievement that depends on one is awarded in the same pass.
  settle(next);
  return next;
}
