import { ratesFor, upkeepPerSecond } from "../game/engine.ts";
import type { SimState } from "../game/engine.ts";

/**
 * What a steady village makes over `seconds` of game time, counted a second at a time so each
 * second feels the season it falls in (seasons are worked out from the game clock). For tests
 * that check long stretches of production: a constant rate times the time is no longer exact.
 */
export function madeOver(
  state: SimState,
  seconds: number,
): { food: number; wood: number; infra: number } {
  const made = { food: 0, wood: 0, infra: 0 };
  for (let t = 0; t < seconds; t++) {
    const at = { ...state, time: state.time + t };
    const rates = ratesFor(at, at.owned, false);
    made.food += rates.food - upkeepPerSecond(at);
    made.wood += rates.wood;
    made.infra += rates.infra;
  }
  return made;
}
