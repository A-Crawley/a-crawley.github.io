import { ACHIEVEMENTS } from "./achievements.ts";
import type { Ending } from "./ending.ts";
import { ENDING_COPY, OTHER_ENDING_HINT } from "./endingCopy.ts";
import { PARTING_REPORT } from "./parting.ts";
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
  /** What the player did before the exit, or null if they never picked (older saves). */
  parting: string | null;
  /** The ending the player did not get: its name and opening line. Null while there is no ending. */
  otherEnding: { title: string; opening: string } | null;
  /** A vague nudge about the other ending, or null while there is no ending. */
  hint: string | null;
}

/** The ending that was not reached. It shows the opening line only, with no odds or thresholds. */
export function otherEndingOf(ending: Ending): { title: string; opening: string } {
  const other: Ending = ending === "conquest" ? "apocalypse" : "conquest";
  const copy = ENDING_COPY[other];
  return { title: copy.title, opening: copy.paragraphs[0] ?? "" };
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
    parting: state.parting === null ? null : PARTING_REPORT[state.parting],
    otherEnding: ending === null ? null : otherEndingOf(ending),
    hint: ending === null ? null : OTHER_ENDING_HINT[ending],
  };
}
