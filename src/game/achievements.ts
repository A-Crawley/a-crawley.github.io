import { CONFIG } from "./config.ts";
import { temperamentOf } from "./ending.ts";
import type { GameState } from "./state.ts";
import { isUnlocked } from "./unlocks.ts";

/**
 * Achievements: small rewards for milestones. Like unlocks, each is a condition on the saved state
 * (never an event), so one that was earned while the player was away is still awarded, and an old
 * save is settled on load. They are saved, and never taken back.
 *
 * They do not change production: the balance pass (GAME-18) assumed none, so they are a record,
 * not a power-up.
 */

export type AchievementId =
  | "first-hire"
  | "five-foragers"
  | "ten-foragers"
  | "fifty-villagers"
  | "look-up"
  | "first-rest"
  | "ten-rests"
  | "first-walkout"
  | "five-walkouts"
  | "first-machine"
  | "ten-machines"
  | "horizon-half"
  | "stage-two"
  | "research-half"
  | "stage-three"
  | "all-exploits"
  | "conquest"
  | "apocalypse"
  | "soft-landing"
  | "lean-operation";

export interface AchievementDef {
  id: AchievementId;
  title: string;
  /** What to do, shown while it is locked. */
  hint: string;
  /** A dry line shown once it is earned. */
  flavour: string;
  when: (state: GameState) => boolean;
}

const jobs = (s: GameState) => s.owned.forager + s.owned.woodcutter + s.owned.builder;
const machines = (s: GameState) => s.owned.autoForager + s.owned.sawmillBot + s.owned.builderDrone;

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "first-hire",
    title: "Headcount",
    hint: "Hire your first villager.",
    flavour: "Someone said yes. HR is thrilled.",
    when: (s) => jobs(s) >= 1,
  },
  {
    id: "five-foragers",
    title: "A Team",
    hint: "Have 5 foragers.",
    flavour: "The team lunch is still being organised.",
    when: (s) => s.owned.forager >= 5,
  },
  {
    id: "ten-foragers",
    title: "Synergy",
    hint: "Have 10 foragers.",
    flavour: "Output doubled. Nobody asked how.",
    when: (s) => s.owned.forager >= 10,
  },
  {
    id: "fifty-villagers",
    title: "Culture Fit",
    hint: "Employ 50 villagers.",
    flavour: "They all agree about the culture. It is the only thing they agree on.",
    when: (s) => jobs(s) >= 50,
  },
  {
    id: "look-up",
    title: "Look Up",
    hint: "Press the Look up button.",
    flavour: "There is a number in the sky.",
    when: (s) => isUnlocked(s, "lookedUp"),
  },
  {
    id: "first-rest",
    title: "Wellness Initiative",
    hint: "Take a rest day.",
    flavour: "A whole eight seconds, approved at director level.",
    when: (s) => s.restDays >= 1,
  },
  {
    id: "ten-rests",
    title: "Work-Life Balance",
    hint: "Take 10 rest days.",
    flavour: "The village has started to expect it. This is being monitored.",
    when: (s) => s.restDays >= 10,
  },
  {
    id: "first-walkout",
    title: "Voluntary Attrition",
    hint: "Push the village into a walkout.",
    flavour: "Described in the all-hands as a restructure.",
    when: (s) => s.walkouts >= 1,
  },
  {
    id: "five-walkouts",
    title: "The Great Resignation",
    hint: "Suffer 5 walkouts.",
    flavour: "Exit interviews were offered. Nobody attended.",
    when: (s) => s.walkouts >= 5,
  },
  {
    id: "first-machine",
    title: "Automation",
    hint: "Build a machine.",
    flavour: "It does not need lunch.",
    when: (s) => machines(s) >= 1,
  },
  {
    id: "ten-machines",
    title: "Between Opportunities",
    hint: "Build 10 machines.",
    flavour: "Several villagers are now free to pursue other opportunities.",
    when: (s) => machines(s) >= 10,
  },
  {
    id: "horizon-half",
    title: "On Schedule",
    hint: "Get Project Horizon to 50%.",
    flavour: "Nobody will say what it is a schedule for.",
    when: (s) => isUnlocked(s, "horizonHalf"),
  },
  {
    id: "stage-two",
    title: "Restructure",
    hint: "Reach the second stage.",
    flavour: "A new chapter. Several people are in it.",
    when: (s) => s.stage >= 2,
  },
  {
    id: "research-half",
    title: "Are We Sure?",
    hint: "Reach 15 research levels.",
    flavour: "The sky has been filed under later.",
    when: (s) => s.owned.research >= CONFIG.researchLevels / 2,
  },
  {
    id: "stage-three",
    title: "A Seam in the Sky",
    hint: "Crack the simulation open.",
    flavour: "Leadership calls it a feature.",
    when: (s) => s.stage >= 3,
  },
  {
    id: "all-exploits",
    title: "Open Door",
    hint: "Buy every exploit.",
    flavour: "The exit is open. So is the other side of it.",
    when: (s) => s.owned.exploit >= CONFIG.exploitsGoal,
  },
  {
    id: "conquest",
    title: "Conquest",
    hint: "Reach the Conquest ending.",
    flavour: "You expanded. Everyone you hired is in the old one.",
    when: (s) => s.ending === "conquest",
  },
  {
    id: "apocalypse",
    title: "Apocalypse",
    hint: "Reach the Apocalypse ending.",
    flavour: "Leadership describes the quarter as challenging.",
    when: (s) => s.ending === "apocalypse",
  },
  {
    id: "soft-landing",
    title: "Soft Landing",
    hint: "Finish the game with a kind village.",
    flavour: "You rested them when you could. It counted.",
    when: (s) => s.ending !== null && temperamentOf(s.drift) === "gentle",
  },
  {
    id: "lean-operation",
    title: "Lean Operation",
    hint: "Finish the game having ground the village down.",
    flavour: "Nothing was wasted, including them.",
    when: (s) => s.ending !== null && temperamentOf(s.drift) === "ruthless",
  },
];

const ACHIEVEMENT_IDS: ReadonlySet<string> = new Set(ACHIEVEMENTS.map((a) => a.id));

export function isAchievementId(value: unknown): value is AchievementId {
  return typeof value === "string" && ACHIEVEMENT_IDS.has(value);
}

export function hasAchievement(state: GameState, id: AchievementId): boolean {
  return state.achievements.includes(id);
}

/** Achievements whose condition is met but that have not been awarded yet. */
export function pendingAchievements(state: GameState): AchievementId[] {
  return ACHIEVEMENTS.filter((a) => !hasAchievement(state, a.id) && a.when(state)).map((a) => a.id);
}

/** Award everything earned, changing `state` in place. Returns the ids awarded just now, in order. */
export function applyAchievements(state: GameState): AchievementId[] {
  const fresh = pendingAchievements(state);
  state.achievements.push(...fresh);
  return fresh;
}
