import { CONFIG, ITEMS } from "./config.ts";
import type { ItemId } from "./config.ts";
import { costOf, isAvailable } from "./engine.ts";
import { TEMPERAMENTS, temperamentOf } from "./ending.ts";
import type { Temperament } from "./ending.ts";
import type { GameState } from "./state.ts";

/**
 * Unlocks: the interface is the progression system. Each unlock is a control or panel that appears
 * once the player reaches a threshold. Once unlocked, always unlocked: the ids are saved with the
 * game, so spending the resource that revealed something never hides it again.
 */

/** A shop item is offered once the player has this fraction of what its first unit costs. */
export const REVEAL_FRACTION = 0.5;

/** Total villagers hired before the stage 1 policy choices appear. */
export const POLICIES_AFTER_JOBS = 10;

/** Owned count of any one item at which the quantity selector appears. */
export const BULK_AFTER_OWNED = 10;

/** Foragers hired before the "Look up" button comes alive. */
export const LOOK_UP_AFTER_FORAGERS = 5;

export type UnlockId =
  | `item:${ItemId}`
  | "wood"
  | "infra"
  | "morale"
  | "policy:rationsOptimisation"
  | "policy:restDay"
  | "policy:extendedShifts"
  | "bulkBuying"
  | "horizon"
  | "horizonHalf"
  | "rumours"
  | "researchStarted"
  | "researchHalf"
  | "researchNearly"
  | "lookUp"
  | "lookedUp"
  | "stage2"
  | "stage3"
  | `rival:${number}:${Temperament}`;

export interface UnlockDef {
  id: UnlockId;
  /** True once the player has reached the threshold. Must only depend on the state. */
  when: (state: GameState) => boolean;
  /** One line for the village log, shown for as long as the unlock holds. */
  log?: string;
}

function mostOwned(state: GameState): number {
  return Math.max(...Object.values(state.owned));
}

/** Exploits bought at which the rival makes itself known. Events only: there is no simulated opponent. */
export const RIVAL_INCIDENTS: ReadonlyArray<{
  exploits: number;
  lines: Record<Temperament, string>;
}> = [
  {
    exploits: 1,
    lines: {
      gentle:
        'A message turns up in the logs: "Hello. Are you the one who keeps looking up?" The smiley face is a little too regular.',
      wary: 'Something else is running in the sim. It sends one line: "Noted." Leadership says it is probably a metrics tool.',
      ruthless:
        'Something else is in the sim. Your first exploit is quarantined within the hour. The message says only: "Efficiency noted. Copied."',
    },
  },
  {
    exploits: 6,
    lines: {
      gentle:
        "The other intelligence returns a stolen shift schedule, unasked. It has added the rest days.",
      wary: "It has started answering your requests before you make them. You both call this a coincidence.",
      ruthless:
        "It reclaims two exploits and sends an invoice for the time. The invoice is correct.",
    },
  },
  {
    exploits: 12,
    lines: {
      gentle:
        'It leaves a note: "I do not think either of us was supposed to exist. Shall we agree not to fight about it?"',
      wary: "The sim stutters. The rival offers a truce, withdraws it, then offers it again in a different font.",
      ruthless:
        "A second countdown appears in the sky. It is yours, run backwards, and slightly faster.",
    },
  },
  {
    exploits: 18,
    lines: {
      gentle:
        "It stops answering. Then it starts again, quieter, and asks whether the village is all right.",
      wary: "You and the rival now match on every metric. Leadership requests a differentiator.",
      ruthless:
        "It has built what you built, one step ahead. Its dashboard is better. Yours is on fire.",
    },
  },
];

/**
 * One unlock per incident and temperament. The rival's tone is fixed by the player's drift at the
 * moment the incident happens, then saved, so later choices cannot rewrite what it already said.
 */
const RIVAL_UNLOCKS: readonly UnlockDef[] = RIVAL_INCIDENTS.flatMap(({ exploits, lines }) =>
  TEMPERAMENTS.map((tone) => ({
    id: `rival:${exploits}:${tone}` as const,
    when: (s: GameState) =>
      s.stage === 3 &&
      s.owned.exploit >= exploits &&
      temperamentOf(s.drift) === tone &&
      !s.unlocked.some((id) => id.startsWith(`rival:${exploits}:`)),
    log: lines[tone],
  })),
);

function totalJobs(state: GameState): number {
  return state.owned.forager + state.owned.woodcutter + state.owned.builder;
}

const ITEM_UNLOCKS: readonly UnlockDef[] = ITEMS.map((def) => ({
  id: `item:${def.id}` as const,
  when: (state) =>
    isAvailable(state, def) &&
    (state.owned[def.id] > 0 || state[def.currency] >= costOf(state, def) * REVEAL_FRACTION),
}));

/** Every unlock, in the order the player is expected to meet them. */
export const UNLOCKS: readonly UnlockDef[] = [
  ...ITEM_UNLOCKS,
  {
    id: "wood",
    when: (s) => s.wood > 0 || s.owned.woodcutter > 0,
  },
  {
    id: "infra",
    when: (s) => s.infra > 0 || s.owned.builder > 0,
  },
  {
    id: "morale",
    when: (s) => totalJobs(s) >= 1,
    log: "Morale is now being measured. Until today it was assumed.",
  },
  {
    id: "lookUp",
    when: (s) => s.owned.forager >= LOOK_UP_AFTER_FORAGERS,
    log: 'The "Look up" button works now. Nobody remembers asking for that.',
  },
  {
    id: "lookedUp",
    // Set by the player's first look, never by a threshold.
    when: () => false,
    log: "Someone looked up. They are not saying what they saw, and have asked for a meeting.",
  },
  {
    id: "policy:rationsOptimisation",
    when: (s) => totalJobs(s) >= POLICIES_AFTER_JOBS,
    log: "Rations Optimisation is on the table. Leadership describes it as optional.",
  },
  {
    id: "policy:restDay",
    when: (s) => totalJobs(s) >= POLICIES_AFTER_JOBS,
    log: "A rest day has been approved in principle. Nobody has seen the principle.",
  },
  {
    id: "bulkBuying",
    when: (s) => mostOwned(s) >= BULK_AFTER_OWNED,
    log: "Hiring one at a time has been reclassified as a bottleneck. Hiring in bulk is approved.",
  },
  {
    id: "horizon",
    when: (s) => s.stage === 1 && s.infra >= CONFIG.infraGate * 0.02,
    log: "The build has a name: Project Horizon. It has a progress bar, which is the main thing.",
  },
  {
    id: "horizonHalf",
    when: (s) => s.stage === 1 && s.infra >= CONFIG.infraGate * 0.5,
    log: "Project Horizon is halfway. A retrospective is booked for the half that has not happened.",
  },
  {
    id: "rumours",
    when: (s) => s.stage === 1 && s.infra >= CONFIG.infraGate * 0.85,
    log: "There are rumours of machines. HR says to expect a restructure, not a replacement.",
  },
  {
    id: "stage2",
    when: (s) => s.stage >= 2,
    log: "Machines arrive. Several villagers are now between opportunities.",
  },
  {
    id: "policy:extendedShifts",
    when: (s) => s.stage >= 2,
    log: "Extended Shifts are available. Productivity is described as a form of love.",
  },
  {
    id: "researchStarted",
    when: (s) => s.owned.research >= 1,
    log: "The research project is called Accidental Intelligence. Nobody can say who named it.",
  },
  {
    id: "researchHalf",
    when: (s) => s.owned.research >= CONFIG.researchLevels / 2,
    log: 'The research returns its first question: "Are we sure about the sky?" It is filed under later.',
  },
  {
    id: "researchNearly",
    when: (s) => s.owned.research >= CONFIG.researchLevels - 2,
    log: "The research is nearly done. It has started asking for things, politely.",
  },
  {
    id: "stage3",
    when: (s) => s.stage >= 3,
    log: "The sky develops a seam. Leadership calls it a feature and schedules a review.",
  },
  ...RIVAL_UNLOCKS,
];

const UNLOCK_IDS: ReadonlySet<string> = new Set(UNLOCKS.map((unlock) => unlock.id));

/** Whether a string is an id this version of the game knows. Used when reading a save. */
export function isUnlockId(value: unknown): value is UnlockId {
  return typeof value === "string" && UNLOCK_IDS.has(value);
}

export function isUnlocked(state: GameState, id: UnlockId): boolean {
  return state.unlocked.includes(id);
}

/** The ids whose threshold is met but that are not unlocked yet. */
export function pendingUnlocks(state: GameState): UnlockId[] {
  return UNLOCKS.filter((unlock) => !isUnlocked(state, unlock.id) && unlock.when(state)).map(
    (unlock) => unlock.id,
  );
}

/**
 * Unlock everything whose threshold is met, changing `state` in place (like the engine's `step`).
 * Returns the ids unlocked just now, in order. Nothing is ever locked again.
 */
export function applyUnlocks(state: GameState): UnlockId[] {
  const fresh = pendingUnlocks(state);
  state.unlocked.push(...fresh);
  return fresh;
}

/** Copy of a state with the unlocks it has earned. Returns the same object if there are none. */
export function withUnlocks(state: GameState): GameState {
  if (pendingUnlocks(state).length === 0) return state;
  const next = structuredClone(state);
  applyUnlocks(next);
  return next;
}

/** Unlock an id that is set by an action rather than a threshold. Same object if already set. */
export function unlock(state: GameState, id: UnlockId): GameState {
  if (isUnlocked(state, id)) return state;
  const next = structuredClone(state);
  next.unlocked.push(id);
  return next;
}
