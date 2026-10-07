import { createState } from "./engine.ts";
import type { SimState } from "./engine.ts";

/** Bumped when the shape changes, so the save system can migrate older saves. */
export const STATE_VERSION = 1;

/**
 * The full game state. It is plain data (numbers, booleans and records only), so it survives
 * `JSON.stringify` and `structuredClone` unchanged. That is what the save system relies on.
 *
 * `time` is seconds of game time played; `lastTickAt` is the wall-clock timestamp (ms since the
 * epoch) the state was last advanced to.
 */
export interface GameState extends SimState {
  version: number;
  lastTickAt: number;
}

export function createGameState(now: number): GameState {
  return { ...createState(), version: STATE_VERSION, lastTickAt: now };
}
