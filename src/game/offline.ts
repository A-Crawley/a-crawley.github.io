import type { Stage } from "./config.ts";
import type { Policies } from "./engine.ts";
import { isFinished } from "./engine.ts";
import type { GameState } from "./state.ts";
import { tick } from "./tick.ts";

/** A gap this long counts as the player being away. Shorter gaps are just a tab switch or a lag. */
export const AWAY_AFTER_SECONDS = 60;

/** The most away time that counts: 8 hours. Anything beyond that is not replayed. */
export const MAX_AWAY_SECONDS = 8 * 60 * 60;

/** What happened while the player was gone. Shown once, on return. */
export interface AwaySummary {
  /** How long the player was actually gone. */
  awaySeconds: number;
  /** How much of that counted: the same, unless it went over the cap. */
  countedSeconds: number;
  /** True when the away time went over the cap, so some of it did not count. */
  capped: boolean;
  /** What the village produced. Never negative. */
  gained: { food: number; wood: number; infra: number };
  /** Policies that were on when the player left and were switched off. */
  policiesEnded: Array<keyof Policies>;
  stageFrom: Stage;
  stageTo: Stage;
}

export interface CatchUp {
  state: GameState;
  /** Set when the gap was long enough to count as being away. */
  away: AwaySummary | null;
}

const POLICY_KEYS: ReadonlyArray<keyof Policies> = ["extendedShifts", "rationsOptimisation"];

/**
 * Bring the game up to time `now`. A short gap is an ordinary `tick`. A long one is "away":
 *
 * - The efficiency policies are switched off as the player leaves, so being away never costs
 *   morale or pushes the hidden drift. Nobody is there to run them.
 * - Without policies, morale can't fall low enough for a walkout (even with every villager laid
 *   off it settles around 50), so nothing like that happens while away.
 * - At most MAX_AWAY_SECONDS is replayed, using the same step-by-step `tick`, so morale, walkouts
 *   and stage changes all work as they do when playing. Time beyond the cap is dropped, not saved
 *   up for later.
 * - A summary of the difference is returned for the "while you were away" screen.
 *
 * The same code serves a closed tab, a hidden tab, and an imported old save, because all three
 * look the same: a state whose `lastTickAt` is long ago. The input is not changed.
 */
export function catchUp(state: GameState, now: number): CatchUp {
  const awaySeconds = (now - state.lastTickAt) / 1000;
  // Once every exploit is in, time has stopped: there is nothing to report on return.
  if (isFinished(state)) return { state: tick(state, now), away: null };
  if (awaySeconds < AWAY_AFTER_SECONDS) return { state: tick(state, now), away: null };

  const countedSeconds = Math.min(awaySeconds, MAX_AWAY_SECONDS);
  const departed = structuredClone(state);
  const policiesEnded = POLICY_KEYS.filter((key) => departed.policies[key]);
  for (const key of policiesEnded) departed.policies[key] = false;

  const returned = tick(departed, state.lastTickAt + countedSeconds * 1000);
  // Time past the cap is let go, and play resumes from now.
  returned.lastTickAt = Math.max(now, returned.lastTickAt);

  return {
    state: returned,
    away: {
      awaySeconds,
      countedSeconds,
      capped: awaySeconds > MAX_AWAY_SECONDS,
      gained: {
        food: Math.max(0, returned.food - state.food),
        wood: Math.max(0, returned.wood - state.wood),
        infra: Math.max(0, returned.infra - state.infra),
      },
      policiesEnded,
      stageFrom: state.stage,
      stageTo: returned.stage,
    },
  };
}

/** Combine two summaries the player has not seen yet into one, so nothing is lost. */
export function mergeAway(earlier: AwaySummary, later: AwaySummary): AwaySummary {
  return {
    awaySeconds: earlier.awaySeconds + later.awaySeconds,
    countedSeconds: earlier.countedSeconds + later.countedSeconds,
    capped: earlier.capped || later.capped,
    gained: {
      food: earlier.gained.food + later.gained.food,
      wood: earlier.gained.wood + later.gained.wood,
      infra: earlier.gained.infra + later.gained.infra,
    },
    policiesEnded: [...new Set([...earlier.policiesEnded, ...later.policiesEnded])],
    stageFrom: earlier.stageFrom,
    stageTo: later.stageTo,
  };
}
