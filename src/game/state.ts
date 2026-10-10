import { createState } from "./engine.ts";
import type { SimState } from "./engine.ts";
import type { AchievementId } from "./achievements.ts";
import type { Ending } from "./ending.ts";
import { createEventsState } from "./events.ts";
import type { EventsState } from "./events.ts";
import { createSkyState } from "./sky.ts";
import type { SkyState } from "./sky.ts";
import type { UnlockId } from "./unlocks.ts";
import { createReviewsState } from "./review.ts";
import type { ReviewsState } from "./review.ts";

/** Bumped when the shape changes, so the save system can migrate older saves. */
export const STATE_VERSION = 12;

/**
 * The full game state. It is plain data (numbers, booleans and records only), so it survives
 * `JSON.stringify` and `structuredClone` unchanged. That is what the save system relies on.
 *
 * `achievements` lists what the player has earned. `unlocked` lists the controls and panels the player has revealed, in the order they appeared.
 * `time` is seconds of game time played; `lastTickAt` is the wall-clock timestamp (ms since the
 * epoch) the state was last advanced to.
 */
export interface GameState extends SimState {
  version: number;
  lastTickAt: number;
  unlocked: UnlockId[];
  /** How the run ended, or null while it is still going. Set once, by the final choice. */
  ending: Ending | null;
  /** Achievements earned, in the order they were awarded. */
  achievements: AchievementId[];
  /** Village events: the one waiting for an answer, and the ones already answered. */
  events: EventsState;
  /** Stage performance reviews: what each looked like, and which the player has dismissed. */
  reviews: ReviewsState;
  /** What the player has seen by looking up. */
  sky: SkyState;
}

export function createGameState(now: number): GameState {
  return {
    ...createState(),
    version: STATE_VERSION,
    lastTickAt: now,
    unlocked: [],
    ending: null,
    achievements: [],
    events: createEventsState(),
    reviews: createReviewsState(),
    sky: createSkyState(),
  };
}
