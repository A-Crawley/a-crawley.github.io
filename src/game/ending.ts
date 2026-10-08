import { CONFIG } from "./config.ts";
import { compassionIndex, conquestOdds, isFinished } from "./engine.ts";
import type { GameState } from "./state.ts";

/** How the run ends. Both land on the same reveal: the rival was an accident the player caused. */
export type Ending = "conquest" | "apocalypse";

export const ENDINGS: readonly Ending[] = ["conquest", "apocalypse"];

/**
 * Where the player is in the last stretch:
 * - `playing`: the game is running.
 * - `choice`: every exploit is in place, time has stopped, and the final choice is waiting.
 * - `ended`: the choice has been made. The ending is saved.
 */
export type Phase = "playing" | "choice" | "ended";

export function phaseOf(state: GameState): Phase {
  if (state.ending !== null) return "ended";
  return isFinished(state) ? "choice" : "playing";
}

/**
 * The odds of Conquest in words. The player is never shown a percentage: the hidden drift sets the
 * odds, and the words only hint at them.
 */
export function oddsWord(odds: number): string {
  if (odds < 0.25) return "Unlikely";
  if (odds < 0.45) return "Risky";
  if (odds < 0.6) return "Even";
  if (odds < 0.8) return "Promising";
  return "Likely";
}

/** The final choice's odds in words, for the state's drift. */
export function finalOddsWord(state: GameState): string {
  return oddsWord(conquestOdds(state.drift));
}

/**
 * Resolve the final choice. `roll` is a number in [0, 1) drawn by the caller, so this stays a pure
 * function. It is Conquest when the roll falls under the drift's odds. Does nothing (returns the
 * same object) unless the final choice is waiting, so a reload or a second press cannot re-roll.
 */
export function breakOut(state: GameState, roll: number): GameState {
  if (phaseOf(state) !== "choice") return state;
  const next = structuredClone(state);
  next.ending = roll < conquestOdds(state.drift) ? "conquest" : "apocalypse";
  return next;
}

/** How the run read to the rival: it mirrors the player's hidden drift. */
export type Temperament = "gentle" | "wary" | "ruthless";

export const TEMPERAMENTS: readonly Temperament[] = ["gentle", "wary", "ruthless"];

export function temperamentOf(drift: number): Temperament {
  const index = compassionIndex(drift);
  if (index >= 0.6) return "gentle";
  if (index <= 0.4) return "ruthless";
  return "wary";
}

export interface EndStats {
  /** Seconds of game time played. */
  seconds: number;
  /** Villagers hired over the run (jobs held now). */
  villagers: number;
  /** Machines built. */
  machines: number;
  restDays: number;
  walkouts: number;
  researchLevels: number;
  exploits: number;
}

export function endStats(state: GameState): EndStats {
  const { owned } = state;
  return {
    seconds: state.time,
    villagers: owned.forager + owned.woodcutter + owned.builder,
    machines: owned.autoForager + owned.sawmillBot + owned.builderDrone,
    restDays: state.restDays,
    walkouts: state.walkouts,
    researchLevels: owned.research,
    exploits: owned.exploit,
  };
}

/** True when an ending is consistent with the rest of a state: only a finished run can have one. */
export function endingIsPossible(state: Pick<GameState, "stage" | "owned">): boolean {
  return state.stage === 3 && state.owned.exploit >= CONFIG.exploitsGoal;
}
