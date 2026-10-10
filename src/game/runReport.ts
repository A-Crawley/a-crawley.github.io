import { ACHIEVEMENTS } from "./achievements.ts";
import type { Ending } from "./ending.ts";
import { OTHER_ENDING_HINT } from "./endingCopy.ts";
import { eventChoice, eventDef, EVENTS } from "./events.ts";
import type { GameState } from "./state.ts";

/** One village event as the player answered it. */
export interface ReportedEvent {
  title: string;
  /** The label of the choice that was made. */
  choice: string;
  /** True when nobody answered and the village decided. */
  auto: boolean;
}

/**
 * What the ending screen shows about the decisions made. Derived from the saved state only, and it
 * deliberately has no drift, odds or thresholds in it: the player is told what they did and what
 * they did not see, never the numbers behind the ending.
 */
export interface RunReport {
  events: ReportedEvent[];
  /** Village events this run never met. */
  unseenEvents: number;
  /** Achievements not earned. */
  unseenAchievements: number;
  /** A vague nudge about the other ending, or null while there is no ending. */
  hint: string | null;
}

export function runReport(state: GameState): RunReport {
  const events: ReportedEvent[] = [];
  for (const { id, choice, auto } of state.events.resolved) {
    const def = eventDef(id);
    const picked = eventChoice(def, choice);
    if (picked) events.push({ title: def.title, choice: picked.label, auto });
  }
  const ending: Ending | null = state.ending;
  return {
    events,
    unseenEvents: Math.max(0, EVENTS.length - events.length),
    unseenAchievements: Math.max(0, ACHIEVEMENTS.length - state.achievements.length),
    hint: ending === null ? null : OTHER_ENDING_HINT[ending],
  };
}
