import { CONFIG } from "./config.ts";
import type { BriefId } from "./config.ts";
import type { SimState } from "./engine.ts";
import type { GameState } from "./state.ts";

/**
 * Stage 2 research briefs (GAME-58). When stage 2 starts the player picks one of two briefs for
 * the research project, once, and it is locked. The numbers are in `CONFIG.briefs`; this file is
 * the choice, the wording, and the log and review lines. The drift appears only as words.
 */
export const BRIEF_IDS: readonly BriefId[] = ["fast", "steady"];

export function isBriefId(value: unknown): value is BriefId {
  return typeof value === "string" && (BRIEF_IDS as readonly string[]).includes(value);
}

export interface BriefOption {
  id: BriefId;
  label: string;
  /** What the brief does, in words and without numbers. */
  detail: string;
}

export const BRIEF_OPTIONS: readonly BriefOption[] = [
  {
    id: "fast",
    label: "Ship it",
    detail:
      "Each research level makes the village produce more. The village will notice, and will say so by being tired.",
  },
  {
    id: "steady",
    label: "Do it properly",
    detail:
      "Each research level makes the village produce a bit less than it could. The village will notice that too, and be pleased.",
  },
];

export const BRIEF_TITLE = "Research brief";
export const BRIEF_BODY =
  "Leadership would like the research to begin. It has asked for a brief, and has not said which kind. You only get to write it once.";

/** One log line per brief, for the choice that was made. */
export const BRIEF_LOG: Record<BriefId, string> = {
  fast: "The research brief is two lines long and the second line is “quickly”. Everyone agrees it is clear.",
  steady:
    "The research brief runs to four pages and a risk register. Nobody is sure who will read it, but it exists.",
};

/** A line for the stage 2 performance review. */
export const BRIEF_REVIEW: Record<BriefId, string> = {
  fast: "Research brief: “Ship it”. Leadership liked the speed and has not asked what it cost.",
  steady:
    "Research brief: “Do it properly”. Leadership appreciated the care and would like it to go faster.",
};

export function briefOption(id: BriefId): BriefOption {
  const found = BRIEF_OPTIONS.find((option) => option.id === id);
  if (!found) throw new Error(`Unknown brief: ${id}`);
  return found;
}

/** True while the player is being asked: stage 2 has begun and nothing is chosen yet. */
export function briefOffered(state: Pick<SimState, "stage" | "brief">): boolean {
  return state.stage === 2 && state.brief === null;
}

/**
 * Choose the brief. Only in stage 2 and only once, so a second tap or a reload cannot change it.
 * It nudges the drift once, by the brief's own amount. Returns the same object when it does nothing.
 */
export function chooseBrief(state: GameState, id: BriefId): GameState {
  if (state.ending !== null || !briefOffered(state)) return state;
  const next = structuredClone(state);
  takeBrief(next, id);
  return next;
}

/** Write the brief into a state in place, with its drift nudge. For the simulation's players too. */
export function takeBrief(state: SimState, id: BriefId): boolean {
  if (!briefOffered(state)) return false;
  state.brief = id;
  state.drift += CONFIG.briefs[id].drift;
  return true;
}

/** The log line for the chosen brief, or null if none was chosen. */
export function briefLog(state: Pick<SimState, "brief">): string | null {
  return state.brief === null ? null : BRIEF_LOG[state.brief];
}

/** The performance review line for the chosen brief, or null. */
export function briefReviewNote(state: Pick<SimState, "brief">): string | null {
  return state.brief === null ? null : BRIEF_REVIEW[state.brief];
}
