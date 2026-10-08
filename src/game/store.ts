import { catchUp, mergeAway } from "./offline.ts";
import type { AwaySummary } from "./offline.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { withSettled } from "./settle.ts";

export type GameAction = (state: GameState) => GameState;

/** A tiny external store for the game state, with no React in it. */
export interface GameStore {
  getState(): GameState;
  /** What happened while the player was away, until they dismiss it. */
  getAway(): AwaySummary | null;
  /** The player has seen the summary. */
  dismissAway(): void;
  /** Returns an unsubscribe function. Listeners run after every state change. */
  subscribe(listener: () => void): () => void;
  /** Advance the game to the current time. A long gap counts as being away (see `catchUp`). */
  tick(): void;
  /** Catch up to the current time, then apply a player action. */
  dispatch(action: GameAction): void;
  /** Replace the whole state, for example with an imported save or a fresh game. */
  replace(state: GameState): void;
}

export interface GameStoreOptions {
  /** Clock in ms since the epoch. Defaults to Date.now; tests pass their own. */
  now?: () => number;
  initialState?: GameState;
}

export function createGameStore(options: GameStoreOptions = {}): GameStore {
  const now = options.now ?? Date.now;
  // A loaded save may predate some unlocks, so settle them before anything is shown.
  let state = withSettled(options.initialState ?? createGameState(now()));
  let away: AwaySummary | null = null;
  const listeners = new Set<() => void>();

  function notify(): void {
    listeners.forEach((listener) => listener());
  }

  function setState(next: GameState): void {
    if (next === state) return;
    state = next;
    notify();
  }

  /** Bring the state up to now, recording a summary if the player was away. */
  function advance(): GameState {
    const result = catchUp(state, now());
    if (result.away) away = away ? mergeAway(away, result.away) : result.away;
    return result.state;
  }

  return {
    getState: () => state,
    getAway: () => away,
    dismissAway() {
      if (away === null) return;
      away = null;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    tick() {
      setState(advance());
    },
    dispatch(action) {
      // Bring the state up to date first, so the action happens at the moment the player did it.
      setState(action(advance()));
    },
    replace(next) {
      away = null;
      setState(withSettled(next));
    },
  };
}
