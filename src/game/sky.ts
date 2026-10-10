import { CONFIG } from "./config.ts";
import { isFinished, isHungry } from "./engine.ts";
import { temperamentOf } from "./ending.ts";
import { withSettled } from "./settle.ts";
import type { GameState } from "./state.ts";
import { isUnlocked, unlock } from "./unlocks.ts";

/**
 * Look up: a small ritual. Each press reveals the next thing in the sky that applies to the village
 * right now, in a fixed order, or a dry line when there is nothing new. A look pauses the village
 * briefly, lifts morale a little, and has a cooldown, so it can't be farmed. Only a first sighting
 * moves the drift, so the total drift from looking up is fixed and small.
 */

export type SightingId =
  | "number"
  | "shadow"
  | "horizon"
  | "hungry"
  | "walkout"
  | "rest"
  | "kpi"
  | "watcher"
  | "warm"
  | "clean"
  | "countdown"
  | "line"
  | "twin";

export interface SightingDef {
  id: SightingId;
  text: string;
  /** Whether the village is in the situation this sighting is about. */
  when: (state: GameState) => boolean;
}

export interface SkyState {
  /** Sightings revealed, in the order they were revealed. */
  seen: SightingId[];
  /** True when the latest look found nothing new. A new sighting clears it. */
  dry: boolean;
}

export function createSkyState(): SkyState {
  return { seen: [], dry: false };
}

/** In the order they are offered: the first unseen one that applies is revealed. */
export const SIGHTINGS: readonly SightingDef[] = [
  {
    id: "number",
    text: "A number hangs in the sky. Nobody else seems to see it. It goes up by one every second.",
    when: () => true,
  },
  {
    id: "shadow",
    text: "The number has grown a faint shadow. Leadership calls it a trend and asks for it to be positive.",
    when: (s) => s.owned.forager >= 10,
  },
  {
    id: "horizon",
    text: "There is a horizon in the sky now, below the number. It was always there. Leadership has noticed it formally.",
    when: (s) => s.stage === 1 && s.infra >= CONFIG.infraGate / 2,
  },
  {
    id: "hungry",
    text: "The number flickers. Someone says it is only cloud. Nobody has eaten, and nobody checks.",
    when: (s) => isHungry(s),
  },
  {
    id: "walkout",
    text: "During the walkout the number held perfectly still. It is the only thing in the village that did not take a position.",
    when: (s) => s.walkouts > 0,
  },
  {
    id: "rest",
    text: "The number slows on rest days. It is the only thing that does.",
    when: (s) => s.restDays >= 3,
  },
  {
    id: "kpi",
    text: "The number reads like a KPI now. Someone has put it on a slide.",
    when: (s) => s.stage >= 2,
  },
  {
    id: "watcher",
    text: "A second shape has joined the number. It faces the village, or possibly you.",
    when: (s) => s.stage >= 2 && s.owned.research >= 10,
  },
  {
    id: "warm",
    text: "The sky is a little warmer than it was. Nobody can say what changed. Several people say they feel looked after.",
    when: (s) => s.stage >= 2 && temperamentOf(s.drift) === "gentle",
  },
  {
    id: "clean",
    text: "The sky is very clean. There are no clouds. Nobody can remember the last time there were any.",
    when: (s) => s.stage >= 2 && temperamentOf(s.drift) === "ruthless",
  },
  {
    id: "countdown",
    text: "The number no longer looks like a count. It looks like a countdown.",
    when: (s) => s.stage >= 3,
  },
  {
    id: "line",
    text: "A thin line has been drawn across the sky, just under the number. Nobody remembers drawing it. It matches yours.",
    when: (s) => s.owned.exploit >= 1,
  },
  {
    id: "twin",
    text: "The line now has a twin. They run side by side, and have plainly met.",
    when: (s) => s.owned.exploit >= CONFIG.exploitsGoal / 2,
  },
];

/** Said when there is nothing new to see. Which one depends on the time, so it is not always the same. */
export const DRY_LINES: readonly string[] = [
  "You look up. Nothing new. The number is still there, which is its own kind of news.",
  "The sky is as it was. You are told this is a sign of stability.",
  "You look up for a while. The sky looks back, unchanged and faintly hopeful.",
];

export function isSightingId(value: unknown): value is SightingId {
  return SIGHTINGS.some((s) => s.id === value);
}

export function sightingText(id: SightingId): string {
  return SIGHTINGS.find((s) => s.id === id)?.text ?? "";
}

/** The next sighting this village has not seen and is in a position to, or null. */
export function nextSighting(state: GameState): SightingDef | null {
  return SIGHTINGS.find((s) => !state.sky.seen.includes(s.id) && s.when(state)) ?? null;
}

/** Whole seconds until the player can look up again, or 0. */
export function lookUpWait(state: GameState): number {
  return Math.max(0, Math.ceil(state.lookReadyAt - state.time));
}

export function canLookUp(state: GameState): boolean {
  return isUnlocked(state, "lookUp") && !isFinished(state) && lookUpWait(state) === 0;
}

/** What to show under the button: the latest sighting, or a dry line after an empty look. */
export function lookUpText(state: GameState): string | null {
  if (state.sky.dry) return DRY_LINES[Math.floor(state.time / 7) % DRY_LINES.length];
  const last = state.sky.seen[state.sky.seen.length - 1];
  return last === undefined ? null : sightingText(last);
}

/**
 * Press "Look up". Does nothing (returns the same state) until the button has unlocked, while it is
 * cooling down, or once the run is over. Otherwise it pauses output for a few seconds and lifts
 * morale a little. A first sighting also nudges the drift towards compassion, once per sighting.
 */
export function lookUp(state: GameState): GameState {
  if (!canLookUp(state)) return state;
  const { lookUp: look } = CONFIG;
  const next = structuredClone(state);
  next.lookPauseUntil = next.time + look.pauseSeconds;
  next.lookReadyAt = next.time + look.cooldownSeconds;
  next.morale = Math.min(100, next.morale + look.moraleLift);
  const found = nextSighting(next);
  if (found) {
    next.sky.seen.push(found.id);
    next.sky.dry = false;
    next.drift += look.discoveryDrift;
  } else {
    next.sky.dry = true;
  }
  return withSettled(unlock(next, "lookedUp"));
}
