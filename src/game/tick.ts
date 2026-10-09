import { advanceEvents } from "./events.ts";
import { advanceStage, isFinished, step } from "./engine.ts";
import type { GameState } from "./state.ts";
import { settle } from "./settle.ts";

/** Longest single step. Morale, rest days and walkouts are not linear, so long gaps are replayed in steps. */
export const MAX_STEP_SECONDS = 1;

/** The most real time one tick will replay (7 days). Guards against a wrong system clock. */
export const MAX_TICK_SECONDS = 7 * 24 * 60 * 60;

/**
 * Advance the game to wall-clock time `now` (ms since the epoch) and return the new state.
 *
 * Time comes from timestamp deltas, never from counting timer calls, because browsers throttle
 * timers in background tabs. A long gap is replayed in steps of at most MAX_STEP_SECONDS, so it
 * gives the same result as the same time arriving in many small ticks (exactly, when ticks land on
 * whole seconds; within a fraction of a percent otherwise).
 *
 * The input is not changed. If the clock went backwards, no time passes. With `hunger: false`
 * a shortfall of food costs nothing (see `step`); away time uses this.
 */
export function tick(
  state: GameState,
  now: number,
  options: { hunger?: boolean; expireEvents?: boolean } = {},
): GameState {
  const next = structuredClone(state);
  const elapsed = Math.min(Math.max(0, (now - state.lastTickAt) / 1000), MAX_TICK_SECONDS);
  next.lastTickAt = Math.max(now, state.lastTickAt);

  let remaining = elapsed;
  while (remaining > 0 && !isFinished(next)) {
    const dt = Math.min(MAX_STEP_SECONDS, remaining);
    step(next, dt, false, options.hunger ?? true);
    advanceStage(next);
    advanceEvents(next, { expire: options.expireEvents ?? true });
    settle(next);
    remaining -= dt;
  }
  settle(next);
  return next;
}
