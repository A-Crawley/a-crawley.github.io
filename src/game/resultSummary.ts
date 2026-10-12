import { endStats } from "./ending.ts";
import { ENDING_COPY, VERDICT } from "./endingCopy.ts";
import { temperamentOf } from "./ending.ts";
import { formatDuration } from "./format.ts";
import type { GameState } from "./state.ts";

function count(n: number, one: string, many: string, none: string): string {
  if (n === 0) return none;
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * A short plain-text summary of a finished run, for the player to paste somewhere. It names the
 * ending (they have already seen it) and carries one dry line, but no drift, odds or thresholds,
 * the same rule as the run report. Null while the run has no ending.
 */
export function resultSummary(state: GameState): string | null {
  if (state.ending === null) return null;
  const stats = endStats(state);
  const people = count(stats.villagers, "villager", "villagers", "no villagers");
  const machines = count(stats.machines, "machine", "machines", "no machines");
  const walkouts = count(stats.walkouts, "walkout", "walkouts", "no walkouts");
  return [
    `Look Up: ${ENDING_COPY[state.ending].title}`,
    `${formatDuration(stats.seconds)}, ${people}, ${machines}, ${walkouts}.`,
    VERDICT[temperamentOf(state.drift)],
  ].join("\n");
}
