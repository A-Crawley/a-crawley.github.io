import { capOf, idleHands, isFinished, isHungry } from "./engine.ts";
import type { GameState } from "./state.ts";

/** How many overheard lines the village log keeps. Older ones drop off the top. */
export const MAX_CHATTER_LINES = 12;

/** Game seconds before the first line, then between lines (2 to 4 minutes of play). */
export const FIRST_CHATTER_AT = 150;
export const MIN_CHATTER_GAP = 120;
export const MAX_CHATTER_GAP = 240;

/** A stores-full line is offered when a store is at least this full. */
export const FULL_STORES_FRACTION = 0.95;

/** What is saved: the lines overheard, how many there have been, and when the next one is due. */
export interface ChatterState {
  /** The lines overheard, oldest first, at most `MAX_CHATTER_LINES`. */
  seen: ChatterId[];
  /** How many lines there have been in all. It also drives which line comes next. */
  count: number;
  /** Game time (seconds played) the next line is due. */
  nextAt: number;
}

export function createChatterState(): ChatterState {
  return { seen: [], count: 0, nextAt: FIRST_CHATTER_AT };
}

export interface ChatterDef {
  /** Saved, so never rename one. */
  id: string;
  text: string;
  /** Stages the line can be heard in. Leave out for any stage. */
  stages?: readonly (1 | 2 | 3)[];
  /** A condition on the state. Leave out for a line that fits any time. */
  when?: (state: GameState) => boolean;
}

const storesAreFull = (state: GameState) =>
  state.food >= capOf(state, "food") * FULL_STORES_FRACTION ||
  state.wood >= capOf(state, "wood") * FULL_STORES_FRACTION;

/**
 * The overheard lines. Cosmetic only: hearing one changes nothing but the log. Some wait for a
 * condition (hunger, idle hands, full stores, machines) so they only come up when they fit.
 */
export const CHATTER: readonly ChatterDef[] = [
  {
    id: "stretch",
    text: 'Overheard by the well: "That sounds like a stretch goal. Do we have a stretch?"',
  },
  { id: "circle-back", text: "Someone suggests circling back. Nobody remembers where from." },
  {
    id: "bandwidth",
    text: "A villager says they do not have the bandwidth. The village has no bandwidth. It has a river.",
  },
  {
    id: "proactive",
    text: '"We should be more proactive," says someone who has just sat down.',
  },
  {
    id: "sky-number",
    text: "A child asks why the sky has a number in it. The answer is that it is a good number.",
  },
  {
    id: "quiet-moment",
    text: "A quiet moment. Someone notices it and files a ticket.",
  },
  {
    id: "touch-base",
    text: 'The village agrees to "touch base" at dawn. It is already dawn.',
    stages: [1],
  },
  {
    id: "pick-faster",
    text: '"If we all just picked faster," someone says, picking at exactly the same speed as before.',
    stages: [1],
  },
  {
    id: "research-late",
    text: 'The research runs late. It describes this as "learning".',
    stages: [2],
  },
  {
    id: "research-why",
    text: "A villager asks what the research is for. They are thanked for their curiosity and asked to log it.",
    stages: [2],
  },
  {
    id: "numbers",
    text: "Leadership is pleased with the numbers. The numbers have not been asked.",
    stages: [2, 3],
  },
  {
    id: "seam",
    text: "The seam in the sky hums when it thinks nobody is watching.",
    stages: [3],
  },
  {
    id: "still-here",
    text: 'Someone has chalked "STILL HERE" by the exit. It is not clear whether this is a joke.',
    stages: [3],
  },
  {
    id: "hunger",
    text: '"It is not hunger, it is an appetite for resources," says leadership, hungrily.',
    when: (state) => isHungry(state),
  },
  {
    id: "idle",
    text: "Someone with nothing to do is told to look busy. They are already doing that.",
    when: (state) => idleHands(state) > 0,
  },
  {
    id: "full",
    text: "The stores are full. A villager asks whether that means they can stop. It does not.",
    when: storesAreFull,
  },
  {
    id: "machines",
    text: "The machines work through lunch. Nobody has mentioned it to them, or to HR.",
    when: (state) => state.owned.autoForager + state.owned.sawmillBot > 0,
  },
];

export type ChatterId = string;

const IDS: ReadonlySet<string> = new Set(CHATTER.map((def) => def.id));

export function isChatterId(value: unknown): value is ChatterId {
  return typeof value === "string" && IDS.has(value);
}

export function chatterText(id: ChatterId): string {
  return CHATTER.find((def) => def.id === id)?.text ?? "";
}

/** A small, fixed integer hash (so the same count always gives the same number, on any device). */
function mix(n: number): number {
  let h = Math.imul(n + 0x9e3779b9, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Seconds between line `count` and the next, between the minimum and maximum gap. */
export function chatterGap(count: number): number {
  return MIN_CHATTER_GAP + (mix(count + 7919) % (MAX_CHATTER_GAP - MIN_CHATTER_GAP + 1));
}

/** The lines that fit the state right now. */
export function eligibleChatter(state: GameState): ChatterDef[] {
  return CHATTER.filter(
    (def) =>
      (def.stages === undefined || def.stages.includes(state.stage)) &&
      (def.when === undefined || def.when(state)),
  );
}

/**
 * The line that comes next: a fixed function of the count and the state, so the same moment always
 * gives the same line. It skips the line just heard when there is a choice.
 */
export function pickChatter(state: GameState): ChatterId | null {
  const pool = eligibleChatter(state);
  const last = state.chatter.seen[state.chatter.seen.length - 1];
  const fresh = pool.filter((def) => def.id !== last);
  const from = fresh.length > 0 ? fresh : pool;
  if (from.length === 0) return null;
  return from[mix(state.chatter.count) % from.length]!.id;
}

/** True when a line is due: the run is still going and the next time has come. */
export function chatterDue(state: GameState): boolean {
  return state.ending === null && !isFinished(state) && state.time >= state.chatter.nextAt;
}

export function pendingChatter(state: GameState): boolean {
  return chatterDue(state) && pickChatter(state) !== null;
}

/**
 * Overhear one line if one is due. Changes `state` in place. It is called once per settle, so a long
 * absence gives at most one line, and the next is due a full gap after the state's current time.
 */
export function applyChatter(state: GameState): boolean {
  if (!chatterDue(state)) return false;
  const id = pickChatter(state);
  if (id === null) return false;
  const { chatter } = state;
  chatter.seen.push(id);
  if (chatter.seen.length > MAX_CHATTER_LINES) {
    chatter.seen.splice(0, chatter.seen.length - MAX_CHATTER_LINES);
  }
  chatter.count += 1;
  chatter.nextAt = state.time + chatterGap(chatter.count);
  return true;
}

/**
 * After time away the state has been settled once per second, so it may have overheard dozens of
 * lines. Keep only the latest one of those, so coming back to a wall of chatter never happens.
 * Changes `after` in place; the count keeps every line, so the next pick is unaffected.
 */
export function capAwayChatter(before: GameState, after: GameState, max = 1): void {
  const fresh = after.chatter.count - before.chatter.count;
  if (fresh <= max) return;
  const kept = after.chatter.seen.slice(-max);
  after.chatter.seen = [...before.chatter.seen, ...kept].slice(-MAX_CHATTER_LINES);
}
