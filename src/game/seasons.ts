import { CONFIG } from "./config.ts";

/**
 * Seasons: a slow cycle that bends the numbers a little, so the player prepares instead of only
 * buying. A season is worked out from the game clock alone, so it needs no saved state and a long
 * absence simply lands in whichever season the (credited) time reaches. Nothing counts for the first
 * `startAt` seconds, so the opening is not cluttered.
 */

export type Season = "spring" | "summer" | "autumn" | "winter";

export const SEASONS: readonly Season[] = ["spring", "summer", "autumn", "winter"];

/** What a season does, as multipliers on the usual figure. */
export interface SeasonEffects {
  food: number;
  wood: number;
  /** What the villagers eat. */
  upkeep: number;
  /** How long a new villager takes to arrive, so above 1 is slower growth. */
  arrival: number;
}

const NEUTRAL: SeasonEffects = { food: 1, wood: 1, upkeep: 1, arrival: 1 };

/** The season at a game time, or null before the cycle begins. */
export function seasonOf(time: number): Season | null {
  const { startAt, seconds } = CONFIG.seasons;
  if (time < startAt) return null;
  return SEASONS[Math.floor((time - startAt) / seconds) % SEASONS.length];
}

/** The multipliers in force at a game time. */
export function seasonEffects(time: number): SeasonEffects {
  const season = seasonOf(time);
  return season === null ? NEUTRAL : CONFIG.seasons.effects[season];
}

/** The slowest a new villager can arrive: the arrival timer has to be able to reach it. */
export const SLOWEST_ARRIVAL = Math.max(...SEASONS.map((s) => CONFIG.seasons.effects[s].arrival));

/** Whole seconds until the next season begins, or until the cycle begins. */
export function secondsToNextSeason(time: number): number {
  const { startAt, seconds } = CONFIG.seasons;
  if (time < startAt) return Math.ceil(startAt - time);
  return Math.ceil(seconds - ((time - startAt) % seconds));
}

/** The season after the one at `time` (spring, before the cycle begins). */
export function nextSeason(time: number): Season {
  const current = seasonOf(time);
  return current === null ? SEASONS[0] : SEASONS[(SEASONS.indexOf(current) + 1) % SEASONS.length];
}

/** What a season does, in a few plain words. Empty for a season with no effect worth saying. */
export const SEASON_NOTES: Record<Season, string> = {
  spring: "New villagers arrive faster.",
  summer: "Food comes in faster.",
  autumn: "Wood comes in faster.",
  winter: "Villagers eat more, and arrive slower. A full granary helps.",
};
