import { CONFIG, ITEMS } from "./config.ts";
import { bulkCostOf, clampStocks, isFinished, netFoodRate } from "./engine.ts";
import type { GameState } from "./state.ts";

/**
 * Quarterly targets: now and then in stage 2 the village offers a target in research levels, with
 * a small reward for making it. Three offers a run at most, and the player is never obliged:
 *
 * - **Stretch:** more levels in a tight window. Morale dips when it is accepted; if it is met the
 *   village is paid in food and the drift moves towards efficiency.
 * - **Gentler:** fewer levels in a roomier window. No cost; the drift moves a little towards
 *   compassion, and a smaller food reward if it is met.
 * - **Decline:** costs nothing but a small drift towards compassion.
 *
 * Missing a target costs nothing beyond what accepting it already did. The offer itself never
 * expires and has no clock; only an accepted target has a plain timer, and it stands still while
 * the player is away. Everything here is derived from the state, so it survives a reload.
 */

export type TargetKind = "stretch" | "gentle";

export interface ActiveTarget {
  kind: TargetKind;
  /** The research level to reach. */
  goal: number;
  /** Game time at which the window closes. */
  endsAt: number;
}

export interface TargetResult {
  kind: TargetKind | "declined";
  /** Whether the target was met. Always false for a declined offer. */
  met: boolean;
}

export interface TargetsState {
  /** Offers made so far. The next one comes at `CONFIG.targets.offerAtLevels[offered]`. */
  offered: number;
  /** An offer waiting for an answer. It has no timer and never expires. */
  offer: boolean;
  /** The target the player accepted, while its window is open. */
  active: ActiveTarget | null;
  /** How each offer ended, oldest first. */
  results: TargetResult[];
}

export function createTargetsState(): TargetsState {
  return { offered: 0, offer: false, active: null, results: [] };
}

const RESEARCH = ITEMS.find((def) => def.id === "research")!;

/** Offers per run. */
export const MAX_OFFERS = CONFIG.targets.offerAtLevels.length;

/** Food the village would need to buy the next `levels` research levels. */
function costOfLevels(state: GameState, levels: number): number {
  return bulkCostOf(state, RESEARCH, levels);
}

/** The research level a kind of target asks for, from where the village is now. */
export function goalFor(state: GameState, kind: TargetKind): number {
  const { levels } = CONFIG.targets[kind];
  return Math.min(state.owned.research + levels, CONFIG.researchLevels);
}

/**
 * Seconds allowed for a kind of target, from where the village is now: the time it would take to
 * pay for the levels at the current net food income, scaled and padded, then kept to a sane range
 * and rounded to ten seconds so the wording is steady.
 */
export function windowFor(state: GameState, kind: TargetKind): number {
  const t = CONFIG.targets;
  const { timeFactor, timeBase } = t[kind];
  const levels = goalFor(state, kind) - state.owned.research;
  const missing = Math.max(0, costOfLevels(state, levels) - state.food);
  const income = netFoodRate(state);
  const eta = income > 0 ? missing / income : t.maxSeconds;
  const seconds = Math.min(t.maxSeconds, Math.max(t.minSeconds, eta * timeFactor + timeBase));
  return Math.round(seconds / 10) * 10;
}

/** What each kind is asking for right now, for the offer card. */
export function offerTerms(state: GameState, kind: TargetKind) {
  return { goal: goalFor(state, kind), seconds: windowFor(state, kind) };
}

/** Whether an offer is due now: a research level reached, nothing else going, room to ask. */
function offerDue(state: GameState): boolean {
  const { targets } = state;
  if (isFinished(state) || state.ending !== null || state.stage !== 2) return false;
  if (targets.offer || targets.active || targets.offered >= MAX_OFFERS) return false;
  // One question at a time: a village event waiting for an answer goes first.
  if (state.events.pending) return false;
  const level = CONFIG.targets.offerAtLevels[targets.offered];
  // Near the end of stage 2 there is no room left for a stretch.
  return (
    state.owned.research >= level &&
    state.owned.research <= CONFIG.researchLevels - CONFIG.targets.stretch.levels
  );
}

type Change = "met" | "missed" | "offer" | "lapsed";

function pendingChange(state: GameState): Change | null {
  const { active } = state.targets;
  if (active) {
    if (state.owned.research >= active.goal) return "met";
    if (state.stage !== 2 || state.time >= active.endsAt) return "missed";
    return null;
  }
  // An offer still waiting when stage 2 ends is withdrawn, so no question is left hanging.
  if (state.targets.offer) return state.stage !== 2 ? "lapsed" : null;
  return offerDue(state) ? "offer" : null;
}

/** Whether `applyTargets` would change anything. */
export function pendingTargets(state: GameState): boolean {
  return pendingChange(state) !== null;
}

/** The food a met target pays: that many seconds of the village's net food. */
function reward(state: GameState, kind: TargetKind): void {
  const seconds = CONFIG.targets[kind].rewardSeconds;
  state.food += Math.max(0, netFoodRate(state)) * seconds;
  clampStocks(state);
}

/**
 * Resolve an accepted target that has been met or has run out of time, or make an offer that has
 * come due. Changes `state` in place, like the engine's `step`, and is part of `settle`.
 */
export function applyTargets(state: GameState): void {
  const change = pendingChange(state);
  if (change === null) return;
  const { targets } = state;
  if (change === "offer") {
    targets.offer = true;
    targets.offered += 1;
    return;
  }
  if (change === "lapsed") {
    targets.offer = false;
    targets.results.push({ kind: "declined", met: false });
    return;
  }
  const active = targets.active as ActiveTarget;
  if (change === "met") {
    reward(state, active.kind);
    if (active.kind === "stretch") state.drift += CONFIG.targets.stretch.driftWhenMet;
  }
  targets.results.push({ kind: active.kind, met: change === "met" });
  targets.active = null;
}

/** Accept an offer. Returns the same state when there is no offer waiting. */
export function acceptTarget(state: GameState, kind: TargetKind): GameState {
  if (!state.targets.offer || isFinished(state) || state.ending !== null) return state;
  const next = structuredClone(state);
  const t = CONFIG.targets;
  next.targets.offer = false;
  next.targets.active = {
    kind,
    goal: goalFor(next, kind),
    endsAt: next.time + windowFor(next, kind),
  };
  if (kind === "stretch") {
    next.morale = Math.max(0, Math.min(100, next.morale + t.stretch.moraleOnAccept));
  } else {
    next.drift += t.gentle.driftOnAccept;
  }
  return next;
}

/** Decline an offer: nothing is asked, and the drift moves a little towards compassion. */
export function declineTarget(state: GameState): GameState {
  if (!state.targets.offer || isFinished(state) || state.ending !== null) return state;
  const next = structuredClone(state);
  next.targets.offer = false;
  next.targets.results.push({ kind: "declined", met: false });
  next.drift += CONFIG.targets.declineDrift;
  return next;
}

/**
 * Hold an open window still for `seconds`: used while the player is away, so a target can never
 * run out unseen. Changes `state` in place.
 */
export function holdTarget(state: GameState, seconds: number): void {
  if (state.targets.active) state.targets.active.endsAt += seconds;
}

/** Whole seconds left in an open window, or 0. */
export function targetSecondsLeft(state: GameState): number {
  const { active } = state.targets;
  return active ? Math.max(0, Math.ceil(active.endsAt - state.time)) : 0;
}

const KIND_LOG: Record<TargetResult["kind"], { met: string; missed: string }> = {
  stretch: {
    met: "The stretch target was met. Leadership called it a baseline, and will be raising it.",
    missed:
      "The stretch target was missed. It was recorded as a learning, and then as nothing at all.",
  },
  gentle: {
    met: "The gentler target was met. Nobody was sure whether to celebrate, so there was a short email.",
    missed: "The gentler target was missed by a little. The email about it was kind.",
  },
  declined: {
    met: "",
    missed:
      "The quarterly target was declined. It was noted, in a tone that suggested it would be.",
  },
};

/** Log lines for the targets: one for each finished offer, in order, then the one still open. */
export function targetLog(state: GameState): string[] {
  const lines = state.targets.results.map((result) =>
    result.met ? KIND_LOG[result.kind].met : KIND_LOG[result.kind].missed,
  );
  if (state.targets.active) {
    lines.push(
      state.targets.active.kind === "stretch"
        ? "A stretch target was accepted. The village was told it was a vote of confidence."
        : "A gentler target was accepted. The village was told it was a vote of confidence, quietly.",
    );
  }
  return lines;
}
