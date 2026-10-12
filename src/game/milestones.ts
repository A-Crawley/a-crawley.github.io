import type { ItemId } from "./config.ts";
import type { GameState } from "./state.ts";

/** Things the village can own enough of to be congratulated for. */
export type MilestoneItem =
  "forager" | "woodcutter" | "builder" | "autoForager" | "sawmillBot" | "builderDrone";

/** `<item>-<count>`, for example `forager-25`. Saved, so never rename one. */
export type MilestoneId = `${MilestoneItem}-${number}`;

export interface MilestoneDef {
  id: MilestoneId;
  item: MilestoneItem;
  count: number;
  /** The village log line. */
  log: string;
}

/** What is saved: every milestone reached, and which of them stay out of the log. */
export interface MilestonesState {
  /** Reached, in the order they were reached. Never removed. */
  fired: MilestoneId[];
  /** Reached but not mentioned in the log: passed before milestones existed, or surplus while away. */
  quiet: MilestoneId[];
}

export function createMilestonesState(): MilestonesState {
  return { fired: [], quiet: [] };
}

function milestone(item: MilestoneItem, count: number, log: string): MilestoneDef {
  return { id: `${item}-${count}`, item, count, log };
}

/**
 * Count milestones. They are cosmetic: a log line and a pulse on the shop row, with no effect on
 * production, cost or anything else. Jobs start at 25 because the achievements already cover
 * 5 and 10 foragers. Per item the counts ascend.
 */
export const MILESTONES: readonly MilestoneDef[] = [
  milestone(
    "forager",
    25,
    "Twenty-five Food Acquisition Associates. Someone has proposed a team lanyard.",
  ),
  milestone(
    "forager",
    50,
    "Fifty Food Acquisition Associates. A layer of Senior Food Acquisition Associates is being introduced, with the same duties.",
  ),
  milestone(
    "forager",
    100,
    "One hundred Food Acquisition Associates. The word “associate” is under review for being insufficiently motivating.",
  ),
  milestone(
    "woodcutter",
    25,
    "Twenty-five Timber Operations Leads. Nobody is sure what they are leading, but all of them are leading it well.",
  ),
  milestone(
    "woodcutter",
    50,
    "Fifty Timber Operations Leads. A Head of Leads has been appointed, for alignment.",
  ),
  milestone(
    "woodcutter",
    100,
    "One hundred Timber Operations Leads. The forest has asked for a single point of contact.",
  ),
  milestone(
    "builder",
    25,
    "Twenty-five Infrastructure Delivery Partners. Delivery is on track. The infrastructure is a separate workstream.",
  ),
  milestone(
    "builder",
    50,
    "Fifty Infrastructure Delivery Partners. A kickoff for the kickoff is in the calendar.",
  ),
  milestone(
    "builder",
    100,
    "One hundred Infrastructure Delivery Partners. They would like it noted that they delivered.",
  ),
  milestone(
    "autoForager",
    5,
    "Five automated foragers. They never ask for time off, which has been flagged as a culture concern.",
  ),
  milestone(
    "autoForager",
    10,
    "Ten automated foragers. Throughput is up. The villagers they replaced have been invited to a feedback session.",
  ),
  milestone(
    "autoForager",
    25,
    "Twenty-five automated foragers. The foraging team is now mostly a dashboard.",
  ),
  milestone(
    "sawmillBot",
    5,
    "Five sawmill bots. Each cuts faster than a person and with none of the small talk.",
  ),
  milestone(
    "sawmillBot",
    10,
    "Ten sawmill bots. One person has been kept on to watch them, as is traditional.",
  ),
  milestone(
    "sawmillBot",
    25,
    "Twenty-five sawmill bots. The sawmill is now quiet, which is being reported as a win.",
  ),
  milestone("builderDrone", 5, "Five builder drones. They are hovering where a ladder used to be."),
  milestone(
    "builderDrone",
    10,
    "Ten builder drones. The drones were asked to document their process. They have documented it.",
  ),
  milestone(
    "builderDrone",
    25,
    "Twenty-five builder drones. Construction is now “largely autonomous”, and so is the blame.",
  ),
];

/** The most milestone lines a player returning from time away gets; the rest are recorded quietly. */
export const MAX_AWAY_MILESTONE_LINES = 3;

export function isMilestoneId(value: unknown): value is MilestoneId {
  return MILESTONES.some((m) => m.id === value);
}

export function milestoneDef(id: MilestoneId): MilestoneDef {
  const def = MILESTONES.find((m) => m.id === id);
  if (!def) throw new Error(`Unknown milestone ${id}`);
  return def;
}

/** Milestones whose count is owned right now, whether or not they are recorded. */
export function reachedMilestones(owned: Record<ItemId, number>): MilestoneId[] {
  return MILESTONES.filter((m) => owned[m.item] >= m.count).map((m) => m.id);
}

/** Reached but not recorded yet. */
export function pendingMilestones(state: GameState): MilestoneId[] {
  return reachedMilestones(state.owned).filter((id) => !state.milestones.fired.includes(id));
}

/**
 * Record every milestone reached, changing `state` in place (like the engine's `step`). A bulk
 * purchase that passes several records each of them, once. Returns the ids recorded just now.
 */
export function applyMilestones(state: GameState): MilestoneId[] {
  const fresh = pendingMilestones(state);
  state.milestones.fired.push(...fresh);
  return fresh;
}

/**
 * After time away, keep only the biggest few new milestones in the log. The others stay recorded
 * (so they never fire again) but are marked quiet. Changes `after` in place.
 */
export function capAwayMilestones(
  before: GameState,
  after: GameState,
  max: number = MAX_AWAY_MILESTONE_LINES,
): void {
  const fresh = after.milestones.fired.filter((id) => !before.milestones.fired.includes(id));
  const loud = fresh
    .map((id) => milestoneDef(id))
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((m) => m.id);
  for (const id of fresh) {
    if (!loud.includes(id) && !after.milestones.quiet.includes(id)) after.milestones.quiet.push(id);
  }
}
