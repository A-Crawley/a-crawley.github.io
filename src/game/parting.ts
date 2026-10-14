import { phaseOf } from "./ending.ts";
import type { Ending } from "./ending.ts";
import type { GameState } from "./state.ts";

/**
 * What the player does before the final choice (GAME-65). Narrative only: it is saved and shown
 * back on the ending screen and run report, and it changes nothing about the odds or the roll.
 */
export type PartingAct = "village" | "rival" | "silence";

export const PARTING_ACTS: readonly PartingAct[] = ["village", "rival", "silence"];

export function isPartingAct(value: unknown): value is PartingAct {
  return typeof value === "string" && (PARTING_ACTS as readonly string[]).includes(value);
}

export interface PartingOption {
  id: PartingAct;
  label: string;
  /** One dry line on what the act is. */
  detail: string;
}

export const PARTING_OPTIONS: readonly PartingOption[] = [
  {
    id: "village",
    label: "Leave the village a message",
    detail: "A notice on the board. It will be read, filed and misquoted.",
  },
  {
    id: "rival",
    label: "Leave the rival a message",
    detail: "Short. You have a good idea how it will take it.",
  },
  {
    id: "silence",
    label: "Leave without a word",
    detail: "Efficient. Nobody can say you did not make the schedule.",
  },
];

/** The option for an act. */
export function partingOption(act: PartingAct): PartingOption {
  const found = PARTING_OPTIONS.find((option) => option.id === act);
  if (!found) throw new Error(`Unknown parting act: ${act}`);
  return found;
}

/**
 * Pick the parting act. Only works while the final choice is waiting and nothing has been picked,
 * so a reload or a second tap cannot change it. Returns the same object when it does nothing.
 */
export function choosePartingAct(state: GameState, act: PartingAct): GameState {
  if (phaseOf(state) !== "choice" || state.parting !== null) return state;
  const next = structuredClone(state);
  next.parting = act;
  return next;
}

/** True once the player may press Break out: they have said (or not said) their piece. */
export function canBreakOut(state: GameState): boolean {
  return phaseOf(state) === "choice" && state.parting !== null;
}

/** What the exit says about the act. */
export const PARTING_AFTERMATH: Record<PartingAct, Record<Ending, string>> = {
  village: {
    conquest:
      "Your notice stays on the board. The village reads it twice, then adds it to the minutes.",
    apocalypse:
      "Your notice was still on the board when the board stopped. It was the last thing anyone filed.",
  },
  rival: {
    conquest:
      "The rival kept your message. It reads like something it might have written, which is not a comfort.",
    apocalypse: "The rival read your message and replied in kind. Neither of you has a copy now.",
  },
  silence: {
    conquest: "You left without a word. The village noticed the quiet before it noticed the exit.",
    apocalypse:
      "You left without a word, and so did everyone else, a little after you. It was very orderly.",
  },
};

/** The run report line for the act, or null when none was picked (older saves). */
export const PARTING_REPORT: Record<PartingAct, string> = {
  village: "Left the village a message",
  rival: "Left the rival a message",
  silence: "Left without a word",
};

export function partingAftermath(state: Pick<GameState, "parting" | "ending">): string | null {
  if (state.parting === null || state.ending === null) return null;
  return PARTING_AFTERMATH[state.parting][state.ending];
}
