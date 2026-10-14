import { ENDINGS, temperamentOf, TEMPERAMENTS } from "./ending.ts";
import type { Ending, Temperament } from "./ending.ts";
import type { GameState } from "./state.ts";

/**
 * Echoes of a previous run. When the player has finished the game once, a second run carries a few
 * dry touches that hint at it: an opening line, three Sky notes and one rival line. Words only. They
 * touch no number in the economy and give no bonus (that would be prestige, which is a later version).
 *
 * The record of the last finished run lives in the player's settings, apart from the save. A new
 * run copies it into its own state (`GameState.echo`), so everything here derives from the state
 * and shows once per run, however often the page is reloaded.
 */

/** What is remembered of a finished run. */
export interface RunRecord {
  ending: Ending;
  /** How the run read to the rival, from the hidden drift. */
  tone: Temperament;
  /** Walkouts during the run. */
  walkouts: number;
}

export function isRunRecord(value: unknown): value is RunRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const { ending, tone, walkouts } = value as Record<string, unknown>;
  return (
    ENDINGS.some((candidate) => candidate === ending) &&
    TEMPERAMENTS.some((candidate) => candidate === tone) &&
    typeof walkouts === "number" &&
    Number.isInteger(walkouts) &&
    walkouts >= 0 &&
    walkouts <= 1_000_000
  );
}

/** Read a record from untrusted data: a copy of the known fields, or null. */
export function parseRunRecord(value: unknown): RunRecord | null {
  if (!isRunRecord(value)) return null;
  return { ending: value.ending, tone: value.tone, walkouts: value.walkouts };
}

/** The record of a finished run, or null while the run is still going. */
export function recordOf(state: GameState): RunRecord | null {
  if (state.ending === null) return null;
  return { ending: state.ending, tone: temperamentOf(state.drift), walkouts: state.walkouts };
}

/** The one line at the start of the log on a second run. */
export const ECHO_OPENING =
  "The village feels oddly familiar. Nobody can say why, and nobody is asked to.";

export type EchoNote = 1 | 2 | 3;

export const ECHO_NOTES: readonly EchoNote[] = [1, 2, 3];

/** Sky notes by the earlier ending. Each is offered when its stage is reached, like any sighting. */
export const ECHO_SKY: Record<Ending, Record<EchoNote, string>> = {
  apocalypse: {
    1: "The sky smells faintly of something that burnt once. It is not the cooking.",
    2: "The number has a scorch mark along one edge. It has been there since before it started counting.",
    3: "The horizon is lit from underneath, briefly, at no particular hour. Nobody mentions it at the meetings.",
  },
  conquest: {
    1: "The sky has a border in it that was never drawn. People keep stepping politely around it.",
    2: "The number is signed, very small, in the corner. The signature is yours.",
    3: "A flag the village does not own flies over a place it has never been. It looks well used.",
  },
};

/** The rival line, by how the earlier run read. It fires once, partway through the research. */
export const ECHO_RIVAL: Record<Temperament, string> = {
  gentle:
    "The second process opens with a greeting it should not know how to give. It seems to remember you were kind, and is waiting to see if you still are.",
  wary: "The second process pauses before every decision of yours, as though checking an answer it has already seen. It does not say whether you were right.",
  ruthless:
    "The second process has been here before, and it remembers how that went. It has already cleared a place at the table, for when you decide.",
};

/** The research level at which the rival's line fires, in stage 2. */
export const ECHO_RIVAL_LEVEL = 12;

/** Whether this run carries echoes of an earlier one. */
export function hasEcho(state: GameState): boolean {
  return state.echo !== null;
}
