import { temperamentOf } from "./ending.ts";
import type { Temperament } from "./ending.ts";
import type { GameState } from "./state.ts";

/** The stages that open with a performance review: entering stage 2 and entering stage 3. */
export type ReviewStage = 2 | 3;

export const REVIEW_STAGES: readonly ReviewStage[] = [2, 3];

/**
 * How the stage just left went, taken at the moment the next one began. The drift is kept as a
 * temperament word only: the number never reaches the player.
 */
export interface ReviewSnapshot {
  /** Game time (seconds) when the new stage began. */
  at: number;
  /** How long the stage just left took, in game seconds. */
  seconds: number;
  /** Villagers hired into jobs. */
  jobs: number;
  /** Everyone living in the village. */
  villagers: number;
  /** Walkouts and rest days over the run so far. */
  walkouts: number;
  restDays: number;
  temperament: Temperament;
}

/** Saved with the game: which reviews the player has dismissed, and the snapshot for each stage entered. */
export interface ReviewsState {
  seen: ReviewStage[];
  entries: Partial<Record<ReviewStage, ReviewSnapshot>>;
}

export function createReviewsState(): ReviewsState {
  return { seen: [], entries: {} };
}

export function isReviewStage(value: unknown): value is ReviewStage {
  return value === 2 || value === 3;
}

function snapshotOf(state: GameState, stage: ReviewStage): ReviewSnapshot {
  const previous = stage === 3 ? (state.reviews.entries[2]?.at ?? 0) : 0;
  const { owned } = state;
  return {
    at: state.time,
    seconds: Math.max(0, state.time - previous),
    jobs: owned.forager + owned.woodcutter + owned.builder,
    villagers: state.population,
    walkouts: state.walkouts,
    restDays: state.restDays,
    temperament: temperamentOf(state.drift),
  };
}

/** Stages entered whose snapshot has not been taken yet. */
export function pendingSnapshots(state: GameState): ReviewStage[] {
  return REVIEW_STAGES.filter(
    (stage) =>
      state.stage >= stage && !state.reviews.seen.includes(stage) && !state.reviews.entries[stage],
  );
}

/** Take the snapshot for each stage entered since the last call. Changes `state` in place. */
export function recordReviews(state: GameState): void {
  for (const stage of pendingSnapshots(state)) {
    state.reviews.entries[stage] = snapshotOf(state, stage);
  }
}

export interface Review {
  stage: ReviewStage;
  snapshot: ReviewSnapshot;
}

/** The review waiting to be shown: the earliest one entered and not yet dismissed, or null. */
export function pendingReview(state: GameState): Review | null {
  for (const stage of REVIEW_STAGES) {
    const snapshot = state.reviews.entries[stage];
    if (snapshot && !state.reviews.seen.includes(stage)) return { stage, snapshot };
  }
  return null;
}

/** The player dismissed the review for `stage`. Returns the same state if it was not waiting. */
export function dismissReview(state: GameState, stage: ReviewStage): GameState {
  if (state.reviews.seen.includes(stage) || !state.reviews.entries[stage]) return state;
  const next = structuredClone(state);
  next.reviews.seen.push(stage);
  return next;
}
